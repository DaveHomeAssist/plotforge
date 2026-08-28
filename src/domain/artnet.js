export const ARTNET_PORT = 6454;
export const ARTNET_PROTOCOL_VERSION = 14;
export const ARTNET_DMX_HEADER_LENGTH = 18;
export const ARTNET_DMX_MIN_LENGTH = 2;
export const ARTNET_DMX_MAX_LENGTH = 512;

const ARTNET_ID = "Art-Net\0";

export class ArtNetError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ArtNetError";
    this.code = code;
  }
}

function assertIntegerRange(value, min, max, label, code) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ArtNetError(`${label} must be an integer from ${min} to ${max}.`, code);
  }
}

export function validatePortAddress(portAddress = {}) {
  const net = Number(portAddress.net);
  const subNet = Number(portAddress.subNet);
  const universe = Number(portAddress.universe);
  assertIntegerRange(net, 0, 127, "Art-Net net", "invalid-net");
  assertIntegerRange(subNet, 0, 15, "Art-Net sub-net", "invalid-subnet");
  assertIntegerRange(universe, 0, 15, "Art-Net universe", "invalid-universe");
  return { net, subNet, universe };
}

export function encodePortAddress(portAddress = {}) {
  const normalized = validatePortAddress(portAddress);
  return {
    ...normalized,
    subUni: ((normalized.subNet & 0x0f) << 4) | (normalized.universe & 0x0f),
  };
}

function normalizeDmxData(data) {
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data);
  throw new ArtNetError("Art-Net DMX data must be a Uint8Array or byte array.", "invalid-data");
}

function validateDmxLength(length) {
  assertIntegerRange(length, ARTNET_DMX_MIN_LENGTH, ARTNET_DMX_MAX_LENGTH, "Art-Net DMX length", "invalid-length");
}

function validateByte(value, label, code) {
  const number = Number(value);
  assertIntegerRange(number, 0, 255, label, code);
  return number;
}

export function encodeArtDmx({
  portAddress,
  data,
  sequence = 0,
  physical = 0,
  protocolVersion = ARTNET_PROTOCOL_VERSION,
} = {}) {
  const encodedPortAddress = encodePortAddress(portAddress);
  const dmxData = normalizeDmxData(data);
  validateDmxLength(dmxData.length);
  const outputLength = dmxData.length % 2 === 0 ? dmxData.length : dmxData.length + 1;
  validateDmxLength(outputLength);
  const packet = new Uint8Array(ARTNET_DMX_HEADER_LENGTH + outputLength);
  const view = new DataView(packet.buffer);

  for (let index = 0; index < ARTNET_ID.length; index += 1) {
    packet[index] = ARTNET_ID.charCodeAt(index);
  }
  view.setUint16(8, 0x5000, true);
  view.setUint16(10, protocolVersion, false);
  packet[12] = validateByte(sequence, "Art-Net sequence", "invalid-sequence");
  packet[13] = validateByte(physical, "Art-Net physical port", "invalid-physical");
  packet[14] = encodedPortAddress.subUni;
  packet[15] = encodedPortAddress.net;
  view.setUint16(16, outputLength, false);
  packet.set(dmxData, ARTNET_DMX_HEADER_LENGTH);

  return packet;
}

export function artDmxPacketSummary(packet) {
  const data = normalizeDmxData(packet);
  if (data.length < ARTNET_DMX_HEADER_LENGTH) {
    throw new ArtNetError("Art-Net packet is shorter than the ArtDmx header.", "short-packet");
  }
  const text = Array.from(data.slice(0, 8)).map(byte => String.fromCharCode(byte)).join("");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    id: text,
    opcode: view.getUint16(8, true),
    protocolVersion: view.getUint16(10, false),
    sequence: data[12],
    physical: data[13],
    subUni: data[14],
    net: data[15],
    length: view.getUint16(16, false),
    payload: data.slice(ARTNET_DMX_HEADER_LENGTH),
  };
}
