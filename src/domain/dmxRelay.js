import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import dgram from "node:dgram";
import http from "node:http";
import {
  ARTNET_DMX_MAX_LENGTH,
  ARTNET_DMX_MIN_LENGTH,
  ARTNET_PORT,
  encodeArtDmx,
  validatePortAddress,
} from "./artnet.js";
import {
  SACN_DEFAULT_PRIORITY,
  SACN_DEFAULT_SOURCE_NAME,
  SACN_MAX_DMX_SLOTS,
  SACN_PORT,
  SacnError,
  encodeSacnDmx,
  parseSacnCid,
  sacnMulticastAddress,
  validateSacnUniverse,
} from "./sacn.js";

export const DMX_RELAY_VERSION = "0.1.0";
export const DMX_RELAY_DEFAULT_ORIGINS = Object.freeze([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export class DmxRelayError extends Error {
  constructor(message, code, detail = "") {
    super(message);
    this.name = "DmxRelayError";
    this.code = code;
    this.detail = detail;
  }
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanFlag(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).trim().toLowerCase());
}

function parseCsv(value, fallback) {
  if (!value) return fallback;
  const parsed = String(value).split(",").map(item => item.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
}

function normalizeHost(host, fallback) {
  const value = String(host || fallback || "").trim();
  return value || fallback;
}

function randomToken() {
  return randomBytes(18).toString("base64url");
}

export function dmxRelayConfigFromEnv(env = process.env) {
  return {
    bindHost: normalizeHost(env.PLOTFORGE_DMX_BIND_HOST, "127.0.0.1"),
    wsPort: parseInteger(env.PLOTFORGE_DMX_WS_PORT, 8766),
    defaultTargetHost: normalizeHost(env.PLOTFORGE_DMX_TARGET_HOST, "127.0.0.1"),
    defaultTargetPort: parseInteger(env.PLOTFORGE_DMX_TARGET_PORT, ARTNET_PORT),
    sacnCid: normalizeHost(env.PLOTFORGE_DMX_SACN_CID, randomUUID()),
    sacnSourceName: normalizeHost(env.PLOTFORGE_DMX_SACN_SOURCE_NAME, SACN_DEFAULT_SOURCE_NAME),
    maxFps: Math.min(44, Math.max(1, parseInteger(env.PLOTFORGE_DMX_MAX_FPS, 20))),
    blackoutBurst: Math.max(1, parseInteger(env.PLOTFORGE_DMX_BLACKOUT_BURST, 5)),
    heartbeatTimeoutMs: Math.max(100, parseInteger(env.PLOTFORGE_DMX_HEARTBEAT_TIMEOUT_MS, 1000)),
    allowPublicBind: parseBooleanFlag(env.PLOTFORGE_DMX_ALLOW_PUBLIC_BIND, false),
    allowPublicTargets: parseBooleanFlag(env.PLOTFORGE_DMX_ALLOW_PUBLIC_TARGETS, false),
    allowedOrigins: parseCsv(env.PLOTFORGE_DMX_ALLOWED_ORIGINS, DMX_RELAY_DEFAULT_ORIGINS),
    token: env.PLOTFORGE_DMX_TOKEN || randomToken(),
    requireToken: parseBooleanFlag(env.PLOTFORGE_DMX_REQUIRE_TOKEN, true),
  };
}

function protocolError(error, fallbackCode = "send-failed") {
  if (error instanceof DmxRelayError) return error;
  if (error instanceof SacnError) return new DmxRelayError(error.message, error.code);
  return new DmxRelayError(error instanceof Error ? error.message : String(error), fallbackCode);
}

function assertPublicBindAllowed(config) {
  if (config.allowPublicBind) return;
  if (config.bindHost === "127.0.0.1" || config.bindHost === "localhost") return;
  throw new DmxRelayError("DMX relay refuses public binding unless PLOTFORGE_DMX_ALLOW_PUBLIC_BIND=1.", "public-bind");
}

export function isAllowedOrigin(origin, allowedOrigins = DMX_RELAY_DEFAULT_ORIGINS) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

export function isPrivateTargetHost(host) {
  const value = String(host || "").trim().toLowerCase();
  if (value === "localhost") return true;
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [a, b] = octets;
  return a === 10
    || a === 127
    || a === 169 && b === 254
    || a === 172 && b >= 16 && b <= 31
    || a === 192 && b === 168;
}

function safeTokenEquals(actual, expected, requireToken) {
  if (!requireToken) return true;
  const actualString = String(actual ?? "");
  const expectedString = String(expected ?? "");
  if (!expectedString) return false;
  const expectedBuffer = Buffer.from(expectedString);
  const actualBuffer = Buffer.alloc(expectedBuffer.length);
  Buffer.from(actualString).copy(actualBuffer, 0, 0, expectedBuffer.length);
  return timingSafeEqual(actualBuffer, expectedBuffer) && actualString.length === expectedString.length;
}

export function webSocketTextFrame(text) {
  const payload = Buffer.from(String(text));
  if (payload.length > 65535) {
    throw new DmxRelayError("WebSocket payload is too large for this relay.", "large-websocket-payload");
  }
  if (payload.length > 125) {
    const frame = Buffer.alloc(4 + payload.length);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(payload.length, 2);
    payload.copy(frame, 4);
    return frame;
  }
  const frame = Buffer.alloc(2 + payload.length);
  frame[0] = 0x81;
  frame[1] = payload.length;
  payload.copy(frame, 2);
  return frame;
}

export function decodeWebSocketFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const frameStart = offset;
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    offset += 2;
    if (length === 126) {
      if (offset + 2 > buffer.length) return { messages, remaining: buffer.subarray(frameStart) };
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      throw new DmxRelayError("Large WebSocket frames are not supported.", "large-websocket-frame");
    }
    if (!masked) throw new DmxRelayError("Client WebSocket frames must be masked.", "unmasked-websocket-frame");
    if (offset + 4 + length > buffer.length) return { messages, remaining: buffer.subarray(frameStart) };
    const mask = buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) {
      payload[index] = buffer[offset + index] ^ mask[index % 4];
    }
    offset += length;
    if (opcode === 1) messages.push(payload.toString("utf8"));
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function decodeBase64Payload(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new DmxRelayError("DMX frame data must be base64.", "invalid-data");
  }
  const payload = Buffer.from(value, "base64");
  if (payload.length === 0 && value !== "") {
    throw new DmxRelayError("DMX frame data could not be decoded.", "invalid-data");
  }
  return payload;
}

function validateTarget(target, config) {
  const host = normalizeHost(target?.host, "");
  const port = validateTargetPort(target?.port);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new DmxRelayError("DMX target host and port are required.", "invalid-target");
  }
  if (!config.allowPublicTargets && !isPrivateTargetHost(host)) {
    throw new DmxRelayError("DMX target must be a local or private-network host.", "public-target", host);
  }
  return { host, port };
}

function validateTargetPort(port, fallback) {
  const value = Number(port ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new DmxRelayError("DMX target host and port are required.", "invalid-target");
  }
  return value;
}

function sacnTargetMode(command) {
  if (command?.targetMode === "multicast" || command?.multicast === true) return "multicast";
  return "unicast";
}

function validateSacnTarget(command, config, universe) {
  const targetMode = sacnTargetMode(command);
  if (targetMode !== "multicast") {
    return { targetMode, target: validateTarget(command.target, config) };
  }

  const host = sacnMulticastAddress(universe);
  const requestedHost = String(command.target?.host ?? "").trim();
  if (requestedHost && requestedHost !== host) {
    throw new DmxRelayError("sACN multicast target host is derived from the universe.", "invalid-target");
  }
  return {
    targetMode,
    target: {
      host,
      port: validateTargetPort(command.target?.port, SACN_PORT),
    },
  };
}

export function validateFrameCommand(command, config = dmxRelayConfigFromEnv({})) {
  const protocol = String(command?.protocol || "").trim().toLowerCase();
  if (protocol !== "artnet" && protocol !== "sacn") {
    throw new DmxRelayError("Only Art-Net and sACN frames are supported.", "unsupported-protocol");
  }
  if (!safeTokenEquals(command.token, config.token, config.requireToken)) {
    throw new DmxRelayError("Bad relay token.", "bad-token");
  }
  const length = Number(command.length);
  if (!Number.isInteger(length)) {
    throw new DmxRelayError("DMX frame length must be an integer.", "invalid-length");
  }
  const data = decodeBase64Payload(command.data);
  if (data.length !== length) {
    throw new DmxRelayError(`Decoded DMX data length ${data.length} does not match ${length}.`, "data-length");
  }
  const sequence = command.sequence == null ? 0 : Number(command.sequence);
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 255) {
    throw new DmxRelayError("DMX frame sequence must be from 0 to 255.", "invalid-sequence");
  }

  if (protocol === "artnet") {
    const target = validateTarget(command.target, config);
    let portAddress;
    try {
      portAddress = validatePortAddress(command.portAddress);
    } catch (error) {
      throw new DmxRelayError(error.message, error.code || "invalid-port-address");
    }
    if (length % 2 !== 0) {
      throw new DmxRelayError(`DMX frame length ${length} is odd.`, "odd-length");
    }
    if (length < ARTNET_DMX_MIN_LENGTH || length > ARTNET_DMX_MAX_LENGTH) {
      throw new DmxRelayError("DMX frame length must be from 2 to 512.", "oversized-payload");
    }
    const physical = command.physical == null ? 0 : Number(command.physical);
    return { protocol, target, portAddress, length, data, sequence, physical };
  }

  if (length < 1 || length > SACN_MAX_DMX_SLOTS) {
    throw new DmxRelayError("sACN frame length must be from 1 to 512.", "invalid-data-length");
  }

  try {
    const universe = validateSacnUniverse(command.universe);
    const { targetMode, target } = validateSacnTarget(command, config, universe);
    return {
      protocol,
      target,
      targetMode,
      universe,
      cid: parseSacnCid(command.cid || config.sacnCid),
      sourceName: normalizeHost(command.sourceName, config.sacnSourceName),
      priority: command.priority == null ? SACN_DEFAULT_PRIORITY : Number(command.priority),
      synchronizationAddress: command.synchronizationAddress == null ? 0 : Number(command.synchronizationAddress),
      preview: Boolean(command.preview),
      length,
      data,
      sequence,
    };
  } catch (error) {
    throw protocolError(error, "invalid-sacn-frame");
  }
}

function activeOutputKey(output) {
  if (output.protocol === "sacn") {
    return ["sacn", output.targetMode, output.target.host, output.target.port, output.universe].join(":");
  }
  return [
    "artnet",
    output.target.host,
    output.target.port,
    output.portAddress.net,
    output.portAddress.subNet,
    output.portAddress.universe,
  ].join(":");
}

function sendJson(socket, payload) {
  socket.write(webSocketTextFrame(JSON.stringify(payload)));
}

function defaultUdpSend(udp) {
  return (packet, port, host) => new Promise((resolve, reject) => {
    udp.send(packet, port, host, error => error ? reject(error) : resolve(packet.length));
  });
}

async function emitArtNetFrame(session, output, data, sequence = 0) {
  const packet = Buffer.from(encodeArtDmx({
    portAddress: output.portAddress,
    data,
    sequence,
    physical: output.physical || 0,
  }));
  await session.sendUdp(packet, output.target.port, output.target.host);
  return packet.length;
}

async function emitSacnFrame(session, output, data, sequence = 0) {
  const packet = Buffer.from(encodeSacnDmx({
    cid: output.cid,
    sourceName: output.sourceName,
    universe: output.universe,
    data,
    priority: output.priority,
    sequence,
    synchronizationAddress: output.synchronizationAddress,
    preview: output.preview,
  }));
  await session.sendUdp(packet, output.target.port || SACN_PORT, output.target.host);
  return packet.length;
}

async function emitFrame(session, output, data, sequence = 0) {
  if (output.protocol === "sacn") return emitSacnFrame(session, output, data, sequence);
  return emitArtNetFrame(session, output, data, sequence);
}

async function emitBlackoutBurst(session) {
  const outputs = [...session.activeOutputs.values()];
  let framesSent = 0;
  for (let burst = 0; burst < session.config.blackoutBurst; burst += 1) {
    for (const output of outputs) {
      const bytes = await emitFrame(session, output, Buffer.alloc(output.length), 0);
      framesSent += bytes > 0 ? 1 : 0;
    }
  }
  return framesSent;
}

function clearWatchdog(session) {
  if (session.watchdog) clearTimeout(session.watchdog);
  session.watchdog = null;
}

function claimFrameRateSlot(session, outputKey) {
  const now = Date.now();
  const nextAllowedAt = session.nextFrameAt.get(outputKey) || 0;
  if (now < nextAllowedAt) {
    throw new DmxRelayError(
      `Frame rate exceeds the configured ${session.config.maxFps} FPS ceiling.`,
      "rate-limit",
      `Retry in ${Math.ceil(nextAllowedAt - now)}ms.`,
    );
  }
  session.nextFrameAt.set(outputKey, now + (1000 / session.config.maxFps));
}

function armWatchdog(session) {
  clearWatchdog(session);
  if (session.activeOutputs.size === 0) return;
  const watchdog = setTimeout(() => {
    session.commandQueue = session.commandQueue.then(async () => {
      if (session.closed || session.watchdog !== watchdog) return;
      try {
        await emitBlackoutBurst(session);
        session.activeOutputs.clear();
        session.nextFrameAt.clear();
        sendJson(session.socket, { type: "fault", reason: "heartbeat-timeout" });
      } catch (error) {
        sendJson(session.socket, {
          type: "fault",
          reason: "heartbeat-timeout-blackout-failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (session.watchdog === watchdog) clearWatchdog(session);
      }
    });
  }, session.config.heartbeatTimeoutMs);
  session.watchdog = watchdog;
}

function handleAuth(session, command) {
  if (command.protocolVersion !== 1) {
    sendJson(session.socket, { type: "auth.error", reason: "unsupported-version" });
    session.socket.end();
    return;
  }
  if (!safeTokenEquals(command.token, session.config.token, session.config.requireToken)) {
    sendJson(session.socket, { type: "auth.error", reason: "bad-token" });
    session.socket.end();
    return;
  }
  session.authenticated = true;
  sendJson(session.socket, {
    type: "auth.ok",
    relayVersion: DMX_RELAY_VERSION,
    maxFps: session.config.maxFps,
    boundHost: session.config.bindHost,
  });
}

async function handleCommand(session, command) {
  if (!session.authenticated) {
    sendJson(session.socket, { type: "auth.error", reason: "auth-required" });
    session.socket.end();
    return;
  }
  if (!safeTokenEquals(command.token, session.config.token, session.config.requireToken)) {
    sendJson(session.socket, { type: `${command.type || "command"}.error`, reason: "bad-token" });
    return;
  }
  if (command.type === "heartbeat") {
    armWatchdog(session);
    sendJson(session.socket, { type: "heartbeat.ok" });
    return;
  }
  if (command.type === "blackout") {
    const framesSent = await emitBlackoutBurst(session);
    session.activeOutputs.clear();
    session.nextFrameAt.clear();
    clearWatchdog(session);
    sendJson(session.socket, { type: "blackout.ok", framesSent });
    return;
  }
  if (command.type !== "frame") {
    sendJson(session.socket, { type: "command.error", reason: "unsupported-command" });
    return;
  }

  try {
    const frame = validateFrameCommand(command, session.config);
    const outputKey = activeOutputKey(frame);
    claimFrameRateSlot(session, outputKey);
    const bytesSent = await emitFrame(session, frame, frame.data, frame.sequence);
    session.activeOutputs.set(outputKey, frame);
    armWatchdog(session);
    sendJson(session.socket, frame.protocol === "sacn"
      ? { type: "frame.ok", protocol: frame.protocol, targetMode: frame.targetMode, universe: frame.universe, target: frame.target, bytesSent }
      : { type: "frame.ok", protocol: frame.protocol, portAddress: frame.portAddress, bytesSent });
  } catch (error) {
    const relayError = protocolError(error);
    sendJson(session.socket, {
      type: "frame.error",
      reason: relayError.code,
      detail: relayError.detail || relayError.message,
    });
  }
}

function acceptWebSocket(request, socket) {
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return false;
  }
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n"));
  return true;
}

export function createDmxRelayServer(options = {}) {
  const config = {
    ...dmxRelayConfigFromEnv({}),
    ...options,
    allowedOrigins: options.allowedOrigins || DMX_RELAY_DEFAULT_ORIGINS,
  };
  assertPublicBindAllowed(config);
  const udp = options.sendUdp ? null : dgram.createSocket("udp4");
  const sendUdp = options.sendUdp || defaultUdpSend(udp);
  const sessions = new Set();

  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        ok: true,
        service: "plotforge-dmx-relay",
        relayVersion: DMX_RELAY_VERSION,
        boundHost: config.bindHost,
        maxFps: config.maxFps,
        requireToken: config.requireToken,
      }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  server.on("upgrade", (request, socket) => {
    const origin = request.headers.origin || "";
    if (!isAllowedOrigin(origin, config.allowedOrigins)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!acceptWebSocket(request, socket)) return;

    const session = {
      socket,
      config,
      sendUdp,
      authenticated: false,
      pending: Buffer.alloc(0),
      activeOutputs: new Map(),
      nextFrameAt: new Map(),
      commandQueue: Promise.resolve(),
      watchdog: null,
      closed: false,
    };
    sessions.add(session);

    async function closeSession({ blackout = false } = {}) {
      if (session.closed) return;
      session.closed = true;
      clearWatchdog(session);
      await session.commandQueue;
      if (blackout && session.activeOutputs.size > 0) {
        try {
          await emitBlackoutBurst(session);
        } catch {
          // The session is already closing; the UI will fault on disconnect.
        }
      }
      session.activeOutputs.clear();
      session.nextFrameAt.clear();
      sessions.delete(session);
    }

    function enqueueCommand(command) {
      session.commandQueue = session.commandQueue
        .then(() => handleCommand(session, command))
        .catch(error => {
          if (session.closed) return;
          sendJson(session.socket, {
            type: "command.error",
            reason: error instanceof DmxRelayError ? error.code : "command-failed",
            detail: error instanceof Error ? error.message : String(error),
          });
        });
    }

    socket.on("data", buffer => {
      if (session.closed) return;
      try {
        const decoded = decodeWebSocketFrames(Buffer.concat([session.pending, buffer]));
        session.pending = decoded.remaining;
        for (const payload of decoded.messages) {
          const command = JSON.parse(payload);
          if (command.type === "auth" && !session.authenticated) {
            handleAuth(session, command);
          } else {
            enqueueCommand(command);
          }
        }
      } catch (error) {
        sendJson(session.socket, {
          type: "command.error",
          reason: error instanceof DmxRelayError ? error.code : "bad-json",
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    });

    socket.on("close", () => {
      void closeSession({ blackout: session.authenticated });
    });
    socket.on("error", () => {
      void closeSession({ blackout: session.authenticated });
    });
  });

  async function close() {
    for (const session of sessions) {
      session.closed = true;
      clearWatchdog(session);
      await session.commandQueue;
      if (session.activeOutputs.size > 0) {
        try {
          await emitBlackoutBurst(session);
        } catch {
          // Shutdown cleanup cannot report to a closed client; keep closing.
        }
      }
      session.activeOutputs.clear();
      session.nextFrameAt.clear();
      session.socket.destroy();
    }
    await new Promise(resolve => server.close(resolve));
    if (udp) udp.close();
  }

  return { server, close, config, token: config.token };
}

export function startDmxRelay(options = {}) {
  const relay = createDmxRelayServer(options);
  return new Promise((resolve, reject) => {
    relay.server.once("error", reject);
    relay.server.listen(relay.config.wsPort, relay.config.bindHost, () => {
      relay.server.off("error", reject);
      resolve(relay);
    });
  });
}
