export const DMX_OUTPUT_PREFERENCES_VERSION = 1;

const SUPPORTED_PROTOCOLS = new Set(["artnet", "sacn"]);
const SUPPORTED_TARGET_MODES = new Set(["unicast", "multicast"]);

function clampInteger(value, min, max, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeHost(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeProtocol(value) {
  const protocol = String(value || "").trim().toLowerCase();
  return SUPPORTED_PROTOCOLS.has(protocol) ? protocol : "artnet";
}

function normalizeTargetMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return SUPPORTED_TARGET_MODES.has(mode) ? mode : "unicast";
}

function normalizeBoolean(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function normalizeUniverseRoute(route = {}, protocol = "artnet") {
  const source = route && typeof route === "object" ? route : {};
  const isSacn = protocol === "sacn";
  return {
    net: clampInteger(source.net, 0, 127, 0),
    subNet: clampInteger(source.subNet, 0, 15, 0),
    universe: clampInteger(source.universe, isSacn ? 1 : 0, isSacn ? 63999 : 15, isSacn ? 1 : 0),
    targetHost: source.targetHost == null ? "" : normalizeHost(source.targetHost, ""),
  };
}

export function defaultDmxOutputSettings() {
  return {
    version: DMX_OUTPUT_PREFERENCES_VERSION,
    protocol: "artnet",
    targetMode: "unicast",
    relayUrl: "ws://127.0.0.1:8766",
    targetHost: "127.0.0.1",
    targetPort: 6454,
    maxFps: 20,
    blackoutOnDisconnect: true,
    blackoutBurst: 5,
    blackoutKeepAlive: false,
    universes: {
      "1": normalizeUniverseRoute(),
    },
  };
}

export function normalizeDmxOutputSettings(settings = {}) {
  const defaults = defaultDmxOutputSettings();
  const protocol = normalizeProtocol(settings.protocol);
  const universes = {};
  const rawUniverses = settings.universes && typeof settings.universes === "object"
    ? settings.universes
    : {};

  for (const [key, route] of Object.entries(rawUniverses)) {
    const universeKey = String(clampInteger(key, 1, 32768, 1));
    universes[universeKey] = normalizeUniverseRoute(route, protocol);
  }

  if (Object.keys(universes).length === 0) {
    universes["1"] = normalizeUniverseRoute({}, protocol);
  }

  return {
    version: DMX_OUTPUT_PREFERENCES_VERSION,
    protocol,
    targetMode: protocol === "sacn" ? normalizeTargetMode(settings.targetMode) : "unicast",
    relayUrl: normalizeHost(settings.relayUrl, defaults.relayUrl),
    targetHost: normalizeHost(settings.targetHost, defaults.targetHost),
    targetPort: clampInteger(settings.targetPort, 1, 65535, protocol === "sacn" ? 5568 : defaults.targetPort),
    maxFps: clampInteger(settings.maxFps, 1, 44, defaults.maxFps),
    blackoutOnDisconnect: normalizeBoolean(settings.blackoutOnDisconnect, defaults.blackoutOnDisconnect),
    blackoutBurst: clampInteger(settings.blackoutBurst, 1, 20, defaults.blackoutBurst),
    blackoutKeepAlive: normalizeBoolean(settings.blackoutKeepAlive, defaults.blackoutKeepAlive),
    universes,
  };
}
