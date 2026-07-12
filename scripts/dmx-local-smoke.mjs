#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import dgram from "node:dgram";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { artDmxPacketSummary } from "../src/domain/artnet.js";
import { createDmxRelayServer } from "../src/domain/dmxRelay.js";
import { sacnPacketSummary } from "../src/domain/sacn.js";

const ALLOWED_ORIGIN = "http://127.0.0.1:5173";
const TOKEN = "plotforge-local-smoke-token";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = path.join(ROOT, "docs/dmx-smoke-evidence/local/local-smoke-latest.json");

function packetStartsWith(message, signature) {
  if (message.length < signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (message[index] !== signature.charCodeAt(index)) return false;
  }
  return true;
}

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

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
    } else if (length === 127) {
      throw new Error("Large WebSocket frames are not supported by local smoke.");
    }
    if (masked || offset + length > buffer.length) return { messages, remaining: buffer.subarray(frameStart) };
    const payload = buffer.subarray(offset, offset + length);
    offset += length;
    if (opcode === 1) messages.push(JSON.parse(payload.toString("utf8")));
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function wsClient(socket, initial = Buffer.alloc(0)) {
  let buffer = initial;
  const queue = [];
  const waiters = [];

  function drain() {
    const decoded = decodeServerFrames(buffer);
    buffer = decoded.remaining;
    queue.push(...decoded.messages);
    while (queue.length && waiters.length) {
      waiters.shift().resolve(queue.shift());
    }
  }

  socket.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    drain();
  });
  socket.on("error", error => {
    while (waiters.length) waiters.shift().reject(error);
  });
  drain();

  return {
    send(payload) {
      socket.write(clientTextFrame(JSON.stringify(payload)));
    },
    next(timeoutMs = 1000) {
      if (queue.length) return Promise.resolve(queue.shift());
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timed out waiting for WebSocket message.")), timeoutMs);
        waiters.push({
          resolve(message) {
            clearTimeout(timer);
            resolve(message);
          },
          reject(error) {
            clearTimeout(timer);
            reject(error);
          },
        });
      });
    },
    end() {
      socket.end();
    },
  };
}

async function openWebSocket(port, origin = ALLOWED_ORIGIN) {
  const socket = net.createConnection({ host: "127.0.0.1", port });
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", reject);
  });
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
    const timer = setTimeout(() => reject(new Error("Timed out waiting for upgrade response.")), 1000);
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
    socket.once("error", error => {
      clearTimeout(timer);
      reject(error);
    });
  });

  return { socket, header, client: wsClient(socket, rest) };
}

async function bindUdpCollector() {
  const udp = dgram.createSocket("udp4");
  const packets = [];
  udp.on("message", message => {
    const receivedAt = new Date().toISOString();
    if (packetStartsWith(message, "Art-Net\0")) {
      const summary = artDmxPacketSummary(message);
      packets.push({
        receivedAt,
        byteLength: message.length,
        protocol: "artnet",
        artnet: {
          id: summary.id,
          opcode: summary.opcode,
          sequence: summary.sequence,
          net: summary.net,
          subUni: summary.subUni,
          length: summary.length,
          nonZeroSlots: Array.from(summary.payload)
            .map((value, index) => value > 0 ? { address: index + 1, value } : null)
            .filter(Boolean),
        },
      });
      return;
    }
    const summary = sacnPacketSummary(message);
    packets.push({
      receivedAt,
      byteLength: message.length,
      protocol: "sacn",
      sacn: {
        id: summary.id,
        sourceName: summary.sourceName,
        priority: summary.priority,
        sequence: summary.sequence,
        universe: summary.universe,
        length: summary.payload.length,
        nonZeroSlots: Array.from(summary.payload)
          .map((value, index) => value > 0 ? { address: index + 1, value } : null)
          .filter(Boolean),
      },
    });
  });
  await new Promise(resolve => udp.bind(0, "127.0.0.1", resolve));
  return {
    port: udp.address().port,
    packets,
    close() {
      udp.close();
    },
  };
}

function packetNonZeroSlots(packet) {
  return packet.artnet?.nonZeroSlots || packet.sacn?.nonZeroSlots || [];
}

async function waitForPacketCount(packets, count, timeoutMs = 1200) {
  const startedAt = Date.now();
  while (packets.length < count) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${count} UDP packets; saw ${packets.length}.`);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

function frameCommand(targetPort, data, overrides = {}) {
  return {
    type: "frame",
    token: TOKEN,
    protocol: "artnet",
    target: { host: "127.0.0.1", port: targetPort },
    portAddress: { net: 0, subNet: 0, universe: 0 },
    length: data.length,
    data: Buffer.from(data).toString("base64"),
    sequence: overrides.sequence ?? 1,
    ...overrides,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authenticate(client) {
  client.send({ type: "auth", protocolVersion: 1, token: TOKEN });
  const reply = await client.next();
  assert(reply.type === "auth.ok", `Expected auth.ok, received ${JSON.stringify(reply)}.`);
  return reply;
}

async function run() {
  const outputPath = path.resolve(ROOT, optionValue("--output", DEFAULT_OUTPUT));
  const collector = await bindUdpCollector();
  let relay;
  try {
    relay = createDmxRelayServer({
      bindHost: "127.0.0.1",
      wsPort: 0,
      token: TOKEN,
      requireToken: true,
      allowedOrigins: [ALLOWED_ORIGIN],
      heartbeatTimeoutMs: 150,
      blackoutBurst: 2,
    });
    await new Promise((resolve, reject) => {
      relay.server.once("error", reject);
      relay.server.listen(0, "127.0.0.1", () => {
        relay.server.off("error", reject);
        resolve();
      });
    });
    const relayPort = relay.server.address().port;
    const evidence = {
      kind: "plotforge-dmx-local-smoke",
      generatedAt: new Date().toISOString(),
      relay: {
        url: `ws://127.0.0.1:${relayPort}`,
        healthUrl: `http://127.0.0.1:${relayPort}/health`,
        origin: ALLOWED_ORIGIN,
        target: `127.0.0.1:${collector.port}`,
        blackoutBurst: relay.config.blackoutBurst,
        heartbeatTimeoutMs: relay.config.heartbeatTimeoutMs,
      },
      checks: [],
      packets: collector.packets,
    };

    const health = await fetch(evidence.relay.healthUrl);
    const healthBody = await health.json();
    assert(health.status === 200 && healthBody.ok === true, "Relay /health did not return ok.");
    evidence.checks.push({ name: "health", status: "pass", body: healthBody });

    const badOrigin = await openWebSocket(relayPort, "https://example.com");
    assert(badOrigin.header.includes("403 Forbidden"), "Bad origin was not rejected.");
    badOrigin.socket.destroy();
    evidence.checks.push({ name: "bad-origin-no-output", status: "pass", packetCount: collector.packets.length });

    const { client } = await openWebSocket(relayPort);
    await authenticate(client);
    assert(collector.packets.length === 0, "Relay emitted UDP before a frame command.");
    evidence.checks.push({ name: "auth-no-output-before-frame", status: "pass", packetCount: collector.packets.length });

    const data = Buffer.alloc(512);
    data[0] = 255;
    data[1] = 64;

    client.send(frameCommand(collector.port, data, {
      target: { host: "203.0.113.10", port: 6454 },
    }));
    const invalidTarget = await client.next();
    assert(invalidTarget.type === "frame.error" && invalidTarget.reason === "public-target", "Public target was not rejected.");
    assert(collector.packets.length === 0, "Invalid target emitted UDP.");
    evidence.checks.push({ name: "bad-target-no-output", status: "pass", reply: invalidTarget });

    client.send(frameCommand(collector.port, data, { sequence: 7 }));
    const frameReply = await client.next();
    await waitForPacketCount(collector.packets, 1);
    assert(frameReply.type === "frame.ok", "Selected frame did not return frame.ok.");
    assert(collector.packets[0].protocol === "artnet", "Selected Art-Net frame was not decoded as Art-Net.");
    assert(collector.packets[0].artnet.length === 512, "Selected frame did not send a 512-slot ArtDmx payload.");
    assert(packetNonZeroSlots(collector.packets[0]).some(slot => slot.address === 1 && slot.value === 255), "Selected frame did not set slot 1.");
    evidence.checks.push({ name: "selected-fixture-frame", status: "pass", reply: frameReply });

    client.send({ type: "blackout", token: TOKEN });
    const blackoutReply = await client.next();
    await waitForPacketCount(collector.packets, 3);
    assert(blackoutReply.type === "blackout.ok" && blackoutReply.framesSent === 2, "Blackout did not report the expected burst.");
    assert(collector.packets.slice(1, 3).every(packet => packet.protocol === "artnet" && packetNonZeroSlots(packet).length === 0), "Blackout packets were not all-zero Art-Net.");
    evidence.checks.push({ name: "blackout-burst", status: "pass", reply: blackoutReply });

    client.send(frameCommand(collector.port, data, {
      protocol: "sacn",
      universe: 1,
      sourceName: "PlotForge Local Smoke",
      priority: 100,
      sequence: 11,
    }));
    const sacnReply = await client.next();
    await waitForPacketCount(collector.packets, 4);
    assert(sacnReply.type === "frame.ok" && sacnReply.protocol === "sacn", "sACN frame did not return frame.ok.");
    assert(collector.packets[3].protocol === "sacn", "Selected sACN frame was not decoded as sACN.");
    assert(collector.packets[3].sacn.universe === 1, "Selected sACN frame used the wrong universe.");
    assert(collector.packets[3].sacn.length === 512, "Selected sACN frame did not send a 512-slot payload.");
    assert(packetNonZeroSlots(collector.packets[3]).some(slot => slot.address === 1 && slot.value === 255), "Selected sACN frame did not set slot 1.");
    evidence.checks.push({ name: "selected-sacn-frame", status: "pass", reply: sacnReply });

    client.send({ type: "blackout", token: TOKEN });
    const sacnBlackoutReply = await client.next();
    await waitForPacketCount(collector.packets, 6);
    assert(sacnBlackoutReply.type === "blackout.ok" && sacnBlackoutReply.framesSent === 2, "sACN blackout did not report the expected burst.");
    assert(collector.packets.slice(4, 6).every(packet => packet.protocol === "sacn" && packetNonZeroSlots(packet).length === 0), "sACN blackout packets were not all zero.");
    evidence.checks.push({ name: "sacn-blackout-burst", status: "pass", reply: sacnBlackoutReply });

    client.send(frameCommand(collector.port, data, { sequence: 8 }));
    await client.next();
    await waitForPacketCount(collector.packets, 7);
    const watchdogReply = await client.next(1500);
    await waitForPacketCount(collector.packets, 9);
    assert(watchdogReply.type === "fault" && watchdogReply.reason === "heartbeat-timeout", "Watchdog did not fault on heartbeat timeout.");
    assert(collector.packets.slice(7, 9).every(packet => packet.protocol === "artnet" && packetNonZeroSlots(packet).length === 0), "Watchdog blackout packets were not all-zero Art-Net.");
    evidence.checks.push({ name: "heartbeat-timeout-blackout", status: "pass", reply: watchdogReply });

    client.send(frameCommand(collector.port, data, { sequence: 9 }));
    await client.next();
    await waitForPacketCount(collector.packets, 10);
    client.end();
    await waitForPacketCount(collector.packets, 12);
    assert(collector.packets.slice(10, 12).every(packet => packet.protocol === "artnet" && packetNonZeroSlots(packet).length === 0), "Disconnect blackout packets were not all-zero Art-Net.");
    evidence.checks.push({ name: "active-client-disconnect-blackout", status: "pass" });

    const shutdownClient = (await openWebSocket(relayPort)).client;
    await authenticate(shutdownClient);
    shutdownClient.send(frameCommand(collector.port, data, { sequence: 10 }));
    await shutdownClient.next();
    await waitForPacketCount(collector.packets, 13);
    await relay.close();
    relay = null;
    await waitForPacketCount(collector.packets, 15);
    assert(collector.packets.slice(13, 15).every(packet => packet.protocol === "artnet" && packetNonZeroSlots(packet).length === 0), "Relay shutdown blackout packets were not all-zero Art-Net.");
    evidence.checks.push({ name: "relay-shutdown-blackout", status: "pass" });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`PlotForge local DMX smoke passed: ${outputPath}\n`);
  } finally {
    if (relay) await relay.close();
    collector.close();
  }
}

run().catch(error => {
  process.stderr.write(`PlotForge local DMX smoke failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
