export const SACN_PORT = 5568;
export const SACN_DMX_HEADER_LENGTH = 126;
export const SACN_MAX_DMX_SLOTS = 512;
export const SACN_MIN_UNIVERSE = 1;
export const SACN_MAX_UNIVERSE = 63999;
export const SACN_DEFAULT_PRIORITY = 100;
export const SACN_DEFAULT_SOURCE_NAME = "PlotForge";

const ACN_PACKET_IDENTIFIER = "ASC-E1.17\0\0\0";
const SACN_ROOT_VECTOR_DATA = 0x00000004;
const SACN_FRAMING_VECTOR_DATA = 0x00000002;
const SACN_DMP_VECTOR_SET_PROPERTY = 0x02;
const SACN_DMP_ADDRESS_TYPE_DATA_TYPE = 0xa1;

export class SacnError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "SacnError";
    this.code = code;
  }
}

function assertIntegerRange(value, min, max, label, code) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new SacnError(`${label} must be an integer from ${min} to ${max}.`, code);
  }
}

function normalizeDmxData(data) {
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Uint8Array.from(data);
  throw new SacnError("sACN DMX data must be a Uint8Array or byte array.", "invalid-data");
}

function validateByte(value, label, code) {
  const number = Number(value);
  assertIntegerRange(number, 0, 255, label, code);
  return number;
}

export function validateSacnUniverse(universe) {
  const value = Number(universe);
  assertIntegerRange(value, SACN_MIN_UNIVERSE, SACN_MAX_UNIVERSE, "sACN universe", "invalid-universe");
  return value;
}

function validatePriority(priority) {
  const value = Number(priority);
  assertIntegerRange(value, 0, 200, "sACN priority", "invalid-priority");
  return value;
}

export function parseSacnCid(cid) {
  if (ArrayBuffer.isView(cid)) {
    const bytes = new Uint8Array(cid.buffer, cid.byteOffset, cid.byteLength);
    if (bytes.length !== 16) throw new SacnError("sACN CID must be 16 bytes.", "invalid-cid");
    return bytes;
  }
  const hex = String(cid || "").replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new SacnError("sACN CID must be a UUID string or 16-byte array.", "invalid-cid");
  }
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function sourceNameBytes(sourceName) {
  const encoded = new TextEncoder().encode(String(sourceName || SACN_DEFAULT_SOURCE_NAME));
  const bytes = new Uint8Array(64);
  bytes.set(encoded.slice(0, 63));
  return bytes;
}

function setFlagsAndLength(view, offset, length) {
  if (length > 0x0fff) {
    throw new SacnError("sACN PDU length exceeds 12-bit flags-and-length field.", "invalid-length");
  }
  view.setUint16(offset, 0x7000 | length, false);
}

function optionsByte({ preview = false, streamTerminated = false, forceSynchronization = false } = {}) {
  return (preview ? 0x80 : 0)
    | (streamTerminated ? 0x40 : 0)
    | (forceSynchronization ? 0x20 : 0);
}

export function sacnMulticastAddress(universe) {
  const value = validateSacnUniverse(universe);
  return `239.255.${(value >> 8) & 0xff}.${value & 0xff}`;
}

export function encodeSacnDmx({
  cid,
  sourceName = SACN_DEFAULT_SOURCE_NAME,
  universe,
  data,
  priority = SACN_DEFAULT_PRIORITY,
  sequence = 0,
  synchronizationAddress = 0,
  preview = false,
  streamTerminated = false,
  forceSynchronization = false,
  startCode = 0,
} = {}) {
  const cidBytes = parseSacnCid(cid);
  const universeValue = validateSacnUniverse(universe);
  const dmxData = normalizeDmxData(data);
  assertIntegerRange(dmxData.length, 1, SACN_MAX_DMX_SLOTS, "sACN DMX slot count", "invalid-data-length");
  const packetLength = SACN_DMX_HEADER_LENGTH + dmxData.length;
  const packet = new Uint8Array(packetLength);
  const view = new DataView(packet.buffer);

  view.setUint16(0, 0x0010, false);
  view.setUint16(2, 0x0000, false);
  for (let index = 0; index < ACN_PACKET_IDENTIFIER.length; index += 1) {
    packet[4 + index] = ACN_PACKET_IDENTIFIER.charCodeAt(index);
  }

  setFlagsAndLength(view, 16, packetLength - 16);
  view.setUint32(18, SACN_ROOT_VECTOR_DATA, false);
  packet.set(cidBytes, 22);

  setFlagsAndLength(view, 38, packetLength - 38);
  view.setUint32(40, SACN_FRAMING_VECTOR_DATA, false);
  packet.set(sourceNameBytes(sourceName), 44);
  packet[108] = validatePriority(priority);
  view.setUint16(109, validateSacnUniverseOrZero(synchronizationAddress), false);
  packet[111] = validateByte(sequence, "sACN sequence", "invalid-sequence");
  packet[112] = optionsByte({ preview, streamTerminated, forceSynchronization });
  view.setUint16(113, universeValue, false);

  setFlagsAndLength(view, 115, packetLength - 115);
  packet[117] = SACN_DMP_VECTOR_SET_PROPERTY;
  packet[118] = SACN_DMP_ADDRESS_TYPE_DATA_TYPE;
  view.setUint16(119, 0x0000, false);
  view.setUint16(121, 0x0001, false);
  view.setUint16(123, dmxData.length + 1, false);
  packet[125] = validateByte(startCode, "sACN start code", "invalid-start-code");
  packet.set(dmxData, SACN_DMX_HEADER_LENGTH);

  return packet;
}

function validateSacnUniverseOrZero(value) {
  const parsed = Number(value);
  assertIntegerRange(parsed, 0, SACN_MAX_UNIVERSE, "sACN synchronization address", "invalid-sync-address");
  return parsed;
}

export function sacnPacketSummary(packet) {
  const data = normalizeDmxData(packet);
  if (data.length < SACN_DMX_HEADER_LENGTH) {
    throw new SacnError("sACN packet is shorter than the DMX data header.", "short-packet");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const sourceName = new TextDecoder().decode(data.slice(44, 108)).replace(/\0.*$/u, "");
  return {
    preambleSize: view.getUint16(0, false),
    postambleSize: view.getUint16(2, false),
    acnPacketIdentifier: Array.from(data.slice(4, 16)).map(byte => String.fromCharCode(byte)).join(""),
    rootFlagsLength: view.getUint16(16, false),
    rootVector: view.getUint32(18, false),
    cid: Array.from(data.slice(22, 38)),
    framingFlagsLength: view.getUint16(38, false),
    framingVector: view.getUint32(40, false),
    sourceName,
    priority: data[108],
    synchronizationAddress: view.getUint16(109, false),
    sequence: data[111],
    options: data[112],
    universe: view.getUint16(113, false),
    dmpFlagsLength: view.getUint16(115, false),
    dmpVector: data[117],
    addressTypeDataType: data[118],
    firstPropertyAddress: view.getUint16(119, false),
    addressIncrement: view.getUint16(121, false),
    propertyValueCount: view.getUint16(123, false),
    startCode: data[125],
    payload: data.slice(SACN_DMX_HEADER_LENGTH),
  };
}
