#!/usr/bin/env node

import { createHash } from "node:crypto";
import dgram from "node:dgram";
import http from "node:http";
import { encodeOscMessage } from "../src/domain/oscBridge.js";

const wsPort = Number.parseInt(process.env.PLOTFORGE_OSC_WS_PORT || "8765", 10);
const fallbackHost = process.env.PLOTFORGE_OSC_HOST || "127.0.0.1";
const fallbackPort = Number.parseInt(process.env.PLOTFORGE_OSC_PORT || "8000", 10);
const udp = dgram.createSocket("udp4");

function textFrame(text) {
  const payload = Buffer.from(text);
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

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const opcode = buffer[offset] & 0x0f;
    let length = buffer[offset + 1] & 0x7f;
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    offset += 2;
    if (length === 126) {
      if (offset + 2 > buffer.length) break;
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      throw new Error("Large WebSocket frames are not supported.");
    }
    if (!masked) throw new Error("Client WebSocket frames must be masked.");
    if (offset + 4 + length > buffer.length) break;
    const mask = buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) {
      payload[index] = buffer[offset + index] ^ mask[index % 4];
    }
    offset += length;
    if (opcode === 1) messages.push(payload.toString("utf8"));
  }
  return messages;
}

async function sendRoute(route) {
  const host = String(route.targetHost || fallbackHost);
  const port = Number.parseInt(route.targetPort || fallbackPort, 10);
  const packet = Buffer.from(encodeOscMessage(route.address, route.args || []));
  await new Promise((resolve, reject) => {
    udp.send(packet, port, host, error => error ? reject(error) : resolve());
  });
  return { ok: true, address: route.address, bytes: packet.length, target: `${host}:${port}` };
}

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "plotforge-osc-relay" }));
    return;
  }
  response.writeHead(404);
  response.end();
});

server.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
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

  socket.on("data", async buffer => {
    try {
      const payloads = decodeFrames(buffer);
      for (const payload of payloads) {
        const route = JSON.parse(payload);
        const result = await sendRoute(route);
        socket.write(textFrame(JSON.stringify(result)));
      }
    } catch (error) {
      socket.write(textFrame(JSON.stringify({ ok: false, error: error.message })));
    }
  });
});

server.listen(wsPort, "127.0.0.1", () => {
  process.stdout.write(`PlotForge OSC relay listening on ws://127.0.0.1:${wsPort} to ${fallbackHost}:${fallbackPort}\n`);
});

process.on("SIGINT", () => {
  server.close();
  udp.close();
});
