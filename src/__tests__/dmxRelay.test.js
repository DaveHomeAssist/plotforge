import { randomBytes } from "node:crypto";
import dgram from "node:dgram";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { artDmxPacketSummary } from "../domain/artnet.js";
import { sacnMulticastAddress, sacnPacketSummary } from "../domain/sacn.js";
import {
  createDmxRelayServer,
  validateFrameCommand,
} from "../domain/dmxRelay.js";

const ALLOWED_ORIGIN = "http://127.0.0.1:5173";
const TOKEN = "test-token";
const SACN_CID = "12345678-1234-5678-9abc-def012345678";

const relays = [];

afterEach(async () => {
  while (relays.length) {
    const relay = relays.pop();
    await relay.close();
  }
});

function clientTextFrame(text) {
  const payload = Buffer.from(String(text));
  const mask = randomBytes(4);
  let header;
  if (payload.length > 125) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.from([0x81, 0x80 | payload.length]);
  }
  const masked = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    masked[index] = payload[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, mask, masked]);
}

function decodeServerFrames(buffer) {
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
    }
    if (masked || offset + length > buffer.length) return { messages, remaining: buffer.subarray(frameStart) };
    const payload = buffer.subarray(offset, offset + length);
    offset += length;
    if (opcode === 1) messages.push(JSON.parse(payload.toString("utf8")));
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function createWsHarness(socket, initial = Buffer.alloc(0)) {
  let buffer = initial;
  const queue = [];
  const waiters = [];

  function drain() {
    const decoded = decodeServerFrames(buffer);
    buffer = decoded.remaining;
    queue.push(...decoded.messages);
    while (queue.length && waiters.length) {
      waiters.shift()(queue.shift());
    }
  }

  socket.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    drain();
  });
  drain();

  return {
    send(payload) {
      socket.write(clientTextFrame(JSON.stringify(payload)));
    },
    next(timeoutMs = 750) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for WebSocket message.")), timeoutMs);
        waiters.push(message => {
          clearTimeout(timer);
          resolve(message);
        });
      });
    },
    close() {
      socket.destroy();
    },
  };
}

async function openWebSocket(port, origin = ALLOWED_ORIGIN) {
  const socket = net.createConnection({ host: "127.0.0.1", port });
  await new Promise(resolve => socket.once("connect", resolve));
  const key = randomBytes(16).toString("base64");
  socket.write([
    "GET / HTTP/1.1",
    `Host: 127.0.0.1:${port}`,
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${key}`,
    "Sec-WebSocket-Version: 13",
    `Origin: ${origin}`,
    "",
    "",
  ].join("\r\n"));

  const { header, rest } = await new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timer = setTimeout(() => reject(new Error("Timed out waiting for upgrade response.")), 750);
    socket.on("data", function onData(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      const marker = buffer.indexOf("\r\n\r\n");
      if (marker === -1) return;
      socket.off("data", onData);
      clearTimeout(timer);
      resolve({
        header: buffer.subarray(0, marker + 4).toString("utf8"),
        rest: buffer.subarray(marker + 4),
      });
    });
  });

  return { socket, header, client: createWsHarness(socket, rest) };
}

async function startRelay(options = {}) {
  const relay = createDmxRelayServer({
    bindHost: "127.0.0.1",
    wsPort: 0,
    token: TOKEN,
    requireToken: true,
    allowedOrigins: [ALLOWED_ORIGIN],
    heartbeatTimeoutMs: 1000,
    blackoutBurst: 1,
    ...options,
  });
  await new Promise((resolve, reject) => {
    relay.server.once("error", reject);
    relay.server.listen(0, "127.0.0.1", () => {
      relay.server.off("error", reject);
      resolve();
    });
  });
  relays.push(relay);
  return {
    ...relay,
    port: relay.server.address().port,
  };
}

async function bindUdpListener() {
  const udp = dgram.createSocket("udp4");
  await new Promise(resolve => udp.bind(0, "127.0.0.1", resolve));
  return {
    udp,
    port: udp.address().port,
    next(timeoutMs = 750) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for UDP packet.")), timeoutMs);
        udp.once("message", message => {
          clearTimeout(timer);
          resolve(message);
        });
      });
    },
    close() {
      udp.close();
    },
  };
}

async function authenticate(client) {
  client.send({ type: "auth", protocolVersion: 1, token: TOKEN });
  const auth = await client.next();
  expect(auth).toEqual(expect.objectContaining({ type: "auth.ok" }));
}

function frameCommand(overrides = {}) {
  const data = overrides.dataBuffer || Buffer.from([1, 2, 3, 4]);
  return {
    type: "frame",
    token: TOKEN,
    protocol: "artnet",
    target: { host: "127.0.0.1", port: 6454 },
    portAddress: { net: 0, subNet: 0, universe: 0 },
    length: data.length,
    data: data.toString("base64"),
    sequence: 7,
    ...overrides,
  };
}

function waitForCondition(check, timeoutMs = 750) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    function tick() {
      if (check()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("Timed out waiting for condition."));
        return;
      }
      setTimeout(tick, 10);
    }
    tick();
  });
}

describe("DMX relay", () => {
  it("serves relay health", async () => {
    const relay = await startRelay();
    const response = await fetch(`http://127.0.0.1:${relay.port}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      ok: true,
      service: "plotforge-dmx-relay",
      relayVersion: "0.1.0",
      requireToken: true,
    }));
  });

  it("sends a selected fixture Art-Net frame to a UDP listener", async () => {
    const udp = await bindUdpListener();
    try {
      const relay = await startRelay();
      const { client, header } = await openWebSocket(relay.port);
      expect(header).toContain("101 Switching Protocols");
      await authenticate(client);

      client.send(frameCommand({ target: { host: "127.0.0.1", port: udp.port } }));
      const [reply, packet] = await Promise.all([client.next(), udp.next()]);
      const summary = artDmxPacketSummary(packet);

      expect(reply).toEqual(expect.objectContaining({
        type: "frame.ok",
        portAddress: { net: 0, subNet: 0, universe: 0 },
        bytesSent: 22,
      }));
      expect(summary).toEqual(expect.objectContaining({
        id: "Art-Net\0",
        opcode: 0x5000,
        sequence: 7,
        subUni: 0,
        net: 0,
        length: 4,
      }));
      expect(Array.from(summary.payload)).toEqual([1, 2, 3, 4]);
      client.close();
    } finally {
      udp.close();
    }
  });

  it("refuses malformed frame commands without sending UDP", async () => {
    let sendCount = 0;
    const relay = await startRelay({
      sendUdp: async () => {
        sendCount += 1;
        return 0;
      },
    });
    const { client } = await openWebSocket(relay.port);
    await authenticate(client);

    const cases = [
      { command: frameCommand({ length: 3, data: Buffer.from([1, 2, 3]).toString("base64") }), reason: "odd-length" },
      { command: frameCommand({ length: 514, data: Buffer.alloc(514).toString("base64") }), reason: "oversized-payload" },
      { command: frameCommand({ portAddress: { net: 0, subNet: 0, universe: 16 } }), reason: "invalid-universe" },
      { command: frameCommand({ protocol: "sacn", universe: 0, cid: SACN_CID, dataBuffer: Buffer.from([1, 2]) }), reason: "invalid-universe" },
      { command: frameCommand({ protocol: "sacn", target: { host: "203.0.113.10", port: 5568 }, universe: 1, cid: SACN_CID, dataBuffer: Buffer.from([1, 2]) }), reason: "public-target" },
      { command: frameCommand({ protocol: "sacn", targetMode: "multicast", target: { host: "239.255.0.2", port: 5568 }, universe: 1, cid: SACN_CID, dataBuffer: Buffer.from([1, 2]) }), reason: "invalid-target" },
      { command: frameCommand({ target: {} }), reason: "invalid-target" },
    ];

    for (const item of cases) {
      client.send(item.command);
      await expect(client.next()).resolves.toEqual(expect.objectContaining({
        type: "frame.error",
        reason: item.reason,
      }));
    }

    expect(sendCount).toBe(0);
    client.close();
  });

  it("sends a selected fixture sACN frame to a UDP listener and blackouts that output", async () => {
    const udp = await bindUdpListener();
    try {
      const relay = await startRelay({ sacnCid: SACN_CID, sacnSourceName: "PlotForge Relay Test" });
      const { client } = await openWebSocket(relay.port);
      await authenticate(client);

      const packetPromise = udp.next();
      client.send(frameCommand({
        protocol: "sacn",
        target: { host: "127.0.0.1", port: udp.port },
        universe: 4,
        sourceName: "PlotForge sACN Test",
        priority: 110,
        sequence: 12,
      }));
      const [reply, packet] = await Promise.all([client.next(), packetPromise]);
      const summary = sacnPacketSummary(packet);

      expect(reply).toEqual(expect.objectContaining({
        type: "frame.ok",
        protocol: "sacn",
        universe: 4,
        bytesSent: 130,
      }));
      expect(summary).toEqual(expect.objectContaining({
        sourceName: "PlotForge sACN Test",
        priority: 110,
        sequence: 12,
        universe: 4,
        propertyValueCount: 5,
      }));
      expect(Array.from(summary.payload)).toEqual([1, 2, 3, 4]);

      const blackoutPacket = udp.next();
      client.send({ type: "blackout", token: TOKEN });
      await expect(client.next()).resolves.toEqual(expect.objectContaining({ type: "blackout.ok", framesSent: 1 }));
      const blackoutSummary = sacnPacketSummary(await blackoutPacket);
      expect(blackoutSummary.universe).toBe(4);
      expect(Array.from(blackoutSummary.payload)).toEqual([0, 0, 0, 0]);
      client.close();
    } finally {
      udp.close();
    }
  });

  it("derives sACN multicast targets from the universe and tracks blackout", async () => {
    const sends = [];
    const relay = await startRelay({
      sacnCid: SACN_CID,
      blackoutBurst: 1,
      sendUdp: async (packet, port, host) => {
        sends.push({ packet: Buffer.from(packet), port, host });
        return packet.length;
      },
    });
    const { client } = await openWebSocket(relay.port);
    await authenticate(client);

    client.send(frameCommand({
      protocol: "sacn",
      targetMode: "multicast",
      target: { port: 5568 },
      universe: 4,
      sourceName: "PlotForge Multicast Test",
      priority: 120,
      sequence: 13,
    }));
    await expect(client.next()).resolves.toEqual(expect.objectContaining({
      type: "frame.ok",
      protocol: "sacn",
      targetMode: "multicast",
      target: { host: sacnMulticastAddress(4), port: 5568 },
      universe: 4,
    }));

    client.send({ type: "blackout", token: TOKEN });
    await expect(client.next()).resolves.toEqual(expect.objectContaining({ type: "blackout.ok", framesSent: 1 }));

    expect(sends).toHaveLength(2);
    expect(sends[0]).toEqual(expect.objectContaining({ host: "239.255.0.4", port: 5568 }));
    expect(sacnPacketSummary(sends[0].packet)).toEqual(expect.objectContaining({
      sourceName: "PlotForge Multicast Test",
      priority: 120,
      sequence: 13,
      universe: 4,
    }));
    expect(sends[1]).toEqual(expect.objectContaining({ host: "239.255.0.4", port: 5568 }));
    expect(Array.from(sacnPacketSummary(sends[1].packet).payload)).toEqual([0, 0, 0, 0]);
    client.close();
  });

  it("rejects bad origins, bad tokens, and pre-auth frames without UDP", async () => {
    let sendCount = 0;
    const relay = await startRelay({
      sendUdp: async () => {
        sendCount += 1;
        return 0;
      },
    });

    const badOrigin = await openWebSocket(relay.port, "https://example.com");
    expect(badOrigin.header).toContain("403 Forbidden");
    badOrigin.socket.destroy();

    const badToken = await openWebSocket(relay.port);
    badToken.client.send({ type: "auth", protocolVersion: 1, token: "wrong" });
    await expect(badToken.client.next()).resolves.toEqual({ type: "auth.error", reason: "bad-token" });
    badToken.client.close();

    const preAuth = await openWebSocket(relay.port);
    preAuth.client.send(frameCommand());
    await expect(preAuth.client.next()).resolves.toEqual({ type: "auth.error", reason: "auth-required" });
    preAuth.client.close();

    expect(sendCount).toBe(0);
  });

  it("emits blackout frames and a fault when the heartbeat watchdog expires", async () => {
    const packets = [];
    const relay = await startRelay({
      heartbeatTimeoutMs: 30,
      blackoutBurst: 2,
      sendUdp: async packet => {
        packets.push(Buffer.from(packet));
        return packet.length;
      },
    });
    const { client } = await openWebSocket(relay.port);
    await authenticate(client);

    client.send(frameCommand({ dataBuffer: Buffer.from([9, 8]) }));
    await expect(client.next()).resolves.toEqual(expect.objectContaining({ type: "frame.ok" }));
    await expect(client.next(1000)).resolves.toEqual({ type: "fault", reason: "heartbeat-timeout" });

    expect(packets).toHaveLength(3);
    expect(Array.from(artDmxPacketSummary(packets[0]).payload)).toEqual([9, 8]);
    expect(Array.from(artDmxPacketSummary(packets[1]).payload)).toEqual([0, 0]);
    expect(Array.from(artDmxPacketSummary(packets[2]).payload)).toEqual([0, 0]);
    client.close();
  });

  it("emits blackout frames when an authenticated active client disconnects", async () => {
    const packets = [];
    const relay = await startRelay({
      heartbeatTimeoutMs: 1000,
      blackoutBurst: 1,
      sendUdp: async packet => {
        packets.push(Buffer.from(packet));
        return packet.length;
      },
    });
    const { client, socket } = await openWebSocket(relay.port);
    await authenticate(client);

    client.send(frameCommand({ dataBuffer: Buffer.from([12, 24]) }));
    await expect(client.next()).resolves.toEqual(expect.objectContaining({ type: "frame.ok" }));

    socket.end();
    await waitForCondition(() => packets.length === 2, 1500);

    expect(Array.from(artDmxPacketSummary(packets[0]).payload)).toEqual([12, 24]);
    expect(Array.from(artDmxPacketSummary(packets[1]).payload)).toEqual([0, 0]);
  });

  it("validates command tokens independently of the WebSocket handshake", () => {
    expect(() => validateFrameCommand(frameCommand({ token: "wrong" }), {
      token: TOKEN,
      requireToken: true,
      defaultTargetHost: "127.0.0.1",
      defaultTargetPort: 6454,
      allowPublicTargets: false,
    })).toThrow(/Bad relay token/);
  });
});
