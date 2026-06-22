import { focusBeamRows } from "./focus.js";
import { getProfile } from "./profiles.js";

export const OSC_BRIDGE_VERSION = 1;
export const DEFAULT_OSC_RELAY_URL = "ws://127.0.0.1:8765";
export const DEFAULT_OSC_TARGET_HOST = "127.0.0.1";
export const DEFAULT_OSC_TARGET_PORT = 8000;

export function defaultOscBridgeSettings() {
  return {
    version: OSC_BRIDGE_VERSION,
    namespace: "/plotforge",
    relayUrl: DEFAULT_OSC_RELAY_URL,
    targetHost: DEFAULT_OSC_TARGET_HOST,
    targetPort: DEFAULT_OSC_TARGET_PORT,
    consoleProfile: "generic",
  };
}

function cleanSegment(value, fallback) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return text || fallback;
}

export function normalizeOscNamespace(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "/plotforge";
  const segments = raw
    .split("/")
    .map(segment => cleanSegment(segment, ""))
    .filter(Boolean);
  return `/${segments.join("/") || "plotforge"}`;
}

export function normalizeOscBridgeSettings(settings = {}) {
  const defaults = defaultOscBridgeSettings();
  const targetPort = Number.parseInt(settings.targetPort, 10);
  return {
    ...defaults,
    ...settings,
    version: OSC_BRIDGE_VERSION,
    namespace: normalizeOscNamespace(settings.namespace ?? defaults.namespace),
    relayUrl: String(settings.relayUrl || defaults.relayUrl).trim(),
    targetHost: String(settings.targetHost || defaults.targetHost).trim(),
    targetPort: Number.isInteger(targetPort) && targetPort > 0 && targetPort <= 65535
      ? targetPort
      : defaults.targetPort,
    consoleProfile: String(settings.consoleProfile || defaults.consoleProfile).trim() || defaults.consoleProfile,
  };
}

function fixtureLabel(doc, fixture) {
  const position = doc.positions[fixture.positionId];
  const unit = fixture.unitNumber == null ? "No unit" : `U${fixture.unitNumber}`;
  return [position?.name || "Unassigned", unit].join(" ");
}

function fixtureBasePath(settings, fixture) {
  return `${settings.namespace}/fixture/${cleanSegment(fixture.id, "fixture")}`;
}

function routeArg(type, value) {
  return { type, value };
}

function patchArgs(fixture, footprint) {
  return [
    routeArg("integer", fixture.dmx?.universe ?? 0),
    routeArg("integer", fixture.dmx?.address ?? 0),
    routeArg("integer", footprint),
  ];
}

export function oscBridgeRoutes(doc, { bridge = doc.oscBridge } = {}) {
  const settings = normalizeOscBridgeSettings(bridge);
  const focusByFixture = new Map(focusBeamRows(doc).map(row => [row.fixtureId, row]));

  return doc.fixtureOrder
    .map(id => doc.fixtures[id])
    .filter(Boolean)
    .flatMap(fixture => {
      const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
      const label = fixtureLabel(doc, fixture);
      const base = fixtureBasePath(settings, fixture);
      const footprint = profile?.dmxFootprint ?? 1;
      const common = {
        fixtureId: fixture.id,
        label,
        channel: fixture.channel ?? null,
        targetHost: settings.targetHost,
        targetPort: settings.targetPort,
      };
      const focus = focusByFixture.get(fixture.id);
      const routes = [
        {
          ...common,
          purpose: "select",
          address: `${base}/select`,
          args: [routeArg("integer", fixture.channel ?? 0), routeArg("string", label)],
        },
        {
          ...common,
          purpose: "patch",
          address: `${base}/patch`,
          args: patchArgs(fixture, footprint),
        },
        {
          ...common,
          purpose: "status",
          address: `${base}/status`,
          args: [routeArg("string", fixture.status ?? "planned")],
        },
      ];

      if (focus) {
        routes.push({
          ...common,
          purpose: "focus",
          address: `${base}/focus`,
          args: [routeArg("integer", Math.round(focus.toX)), routeArg("integer", Math.round(focus.toY))],
        });
      }

      return routes;
    });
}

export function oscBridgeManifest(doc, { generatedAt = new Date().toISOString(), bridge = doc.oscBridge } = {}) {
  const settings = normalizeOscBridgeSettings(bridge);
  const routes = oscBridgeRoutes(doc, { bridge: settings });
  return {
    schemaVersion: OSC_BRIDGE_VERSION,
    kind: "plotforge-osc-bridge",
    generatedAt,
    show: {
      id: doc.id,
      name: doc.name,
      metadata: doc.metadata || {},
    },
    bridge: settings,
    transport: {
      browser: "websocket",
      relayScript: "npm run osc:relay",
      udpTarget: {
        host: settings.targetHost,
        port: settings.targetPort,
      },
    },
    routes,
  };
}

export function oscBridgeManifestJson(doc, options = {}) {
  return JSON.stringify(oscBridgeManifest(doc, options), null, 2) + "\n";
}

function encodePaddedString(value) {
  const raw = new TextEncoder().encode(String(value));
  const length = raw.length + 1;
  const paddedLength = Math.ceil(length / 4) * 4;
  const out = new Uint8Array(paddedLength);
  out.set(raw);
  return out;
}

function encodeInt32(value) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, Number(value) || 0, false);
  return out;
}

function encodeFloat32(value) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setFloat32(0, Number(value) || 0, false);
  return out;
}

export function encodeOscMessage(address, args = []) {
  if (!String(address || "").startsWith("/")) {
    throw new Error("OSC address must start with /");
  }

  const chunks = [encodePaddedString(address)];
  let tags = ",";
  args.forEach(arg => {
    if (arg.type === "integer") tags += "i";
    else if (arg.type === "float") tags += "f";
    else if (arg.type === "string") tags += "s";
    else if (arg.type === "boolean") tags += arg.value ? "T" : "F";
    else throw new Error(`Unsupported OSC argument type: ${arg.type}`);
  });
  chunks.push(encodePaddedString(tags));
  args.forEach(arg => {
    if (arg.type === "integer") chunks.push(encodeInt32(arg.value));
    if (arg.type === "float") chunks.push(encodeFloat32(arg.value));
    if (arg.type === "string") chunks.push(encodePaddedString(arg.value));
  });

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach(chunk => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}
