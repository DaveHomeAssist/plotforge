export const FIXTURE_OUTPUT_SCHEMA_VERSION = 1;

export const OUTPUT_CHANNEL_TYPES = Object.freeze([
  "intensity",
  "red",
  "green",
  "blue",
  "white",
  "amber",
  "uv",
  "panCoarse",
  "panFine",
  "tiltCoarse",
  "tiltFine",
  "colorWheel",
  "goboWheel",
  "shutter",
  "strobe",
  "reset",
  "raw",
]);

export const DEFAULT_DMX_TEST_VALUES = Object.freeze({
  intensity: 255,
  red: 255,
  green: 255,
  blue: 255,
  white: 0,
  amber: 0,
  uv: 0,
});

const KNOWN_TYPES = new Set(OUTPUT_CHANNEL_TYPES);

function channel({ slot, label, type, defaultValue = 0, safeMin = 0, safeMax = 255, unsafe = false, source = "generic" }) {
  return {
    slot,
    label,
    type: KNOWN_TYPES.has(type) ? type : "raw",
    default: unsafe ? 0 : defaultValue,
    safeMin,
    safeMax: unsafe ? 0 : safeMax,
    unsafe,
    source,
  };
}

function outputProfile({
  id,
  profileIds,
  label,
  fixtureClass,
  footprint,
  channels,
  sourceType = "generic",
  approved = true,
  confidence = "high",
  notes = [],
}) {
  return {
    id,
    schemaVersion: FIXTURE_OUTPUT_SCHEMA_VERSION,
    profileIds,
    label,
    fixtureClass,
    footprint,
    channels,
    source: { type: sourceType, approved, confidence },
    notes,
  };
}

function dimmerMap(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "dimmer",
    footprint: 1,
    channels: [
      channel({ slot: 1, label: "Dimmer", type: "intensity" }),
    ],
  });
}

function rgbMap(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "rgb",
    footprint: 3,
    channels: [
      channel({ slot: 1, label: "Red", type: "red" }),
      channel({ slot: 2, label: "Green", type: "green" }),
      channel({ slot: 3, label: "Blue", type: "blue" }),
    ],
  });
}

function rgbwMap(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "rgbw",
    footprint: 4,
    channels: [
      channel({ slot: 1, label: "Red", type: "red" }),
      channel({ slot: 2, label: "Green", type: "green" }),
      channel({ slot: 3, label: "Blue", type: "blue" }),
      channel({ slot: 4, label: "White", type: "white" }),
    ],
  });
}

function ledRgbw8Map(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "rgbw-dimmer",
    footprint: 8,
    channels: [
      channel({ slot: 1, label: "Dimmer", type: "intensity" }),
      channel({ slot: 2, label: "Red", type: "red" }),
      channel({ slot: 3, label: "Green", type: "green" }),
      channel({ slot: 4, label: "Blue", type: "blue" }),
      channel({ slot: 5, label: "White", type: "white" }),
      channel({ slot: 6, label: "Strobe", type: "strobe", unsafe: true }),
      channel({ slot: 7, label: "Macro", type: "raw", unsafe: true }),
      channel({ slot: 8, label: "Control", type: "raw", unsafe: true }),
    ],
  });
}

function ledBarRgbw16Map(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "rgbw-bar",
    footprint: 16,
    channels: Array.from({ length: 4 }, (_item, pixel) => {
      const base = pixel * 4;
      const source = `pixel ${pixel + 1}`;
      return [
        channel({ slot: base + 1, label: `${source} Red`, type: "red", source }),
        channel({ slot: base + 2, label: `${source} Green`, type: "green", source }),
        channel({ slot: base + 3, label: `${source} Blue`, type: "blue", source }),
        channel({ slot: base + 4, label: `${source} White`, type: "white", source }),
      ];
    }).flat(),
  });
}

function simpleMovingSpotMap(id, profileIds, label) {
  return outputProfile({
    id,
    profileIds,
    label,
    fixtureClass: "simple-moving-spot",
    footprint: 24,
    channels: [
      channel({ slot: 1, label: "Dimmer", type: "intensity" }),
      channel({ slot: 2, label: "Pan coarse", type: "panCoarse", unsafe: true }),
      channel({ slot: 3, label: "Pan fine", type: "panFine", unsafe: true }),
      channel({ slot: 4, label: "Tilt coarse", type: "tiltCoarse", unsafe: true }),
      channel({ slot: 5, label: "Tilt fine", type: "tiltFine", unsafe: true }),
      channel({ slot: 6, label: "Color wheel", type: "colorWheel", unsafe: true }),
      channel({ slot: 7, label: "Gobo wheel", type: "goboWheel", unsafe: true }),
      channel({ slot: 8, label: "Shutter", type: "shutter", unsafe: true }),
      channel({ slot: 9, label: "Strobe", type: "strobe", unsafe: true }),
      channel({ slot: 10, label: "Reset", type: "reset", unsafe: true }),
    ],
    notes: ["Movement, wheel, shutter, strobe, and reset channels default to zero until a per-session unsafe-channel gate exists."],
  });
}

const GENERIC_OUTPUT_PROFILE_LIST = [
  dimmerMap("generic-dimmer-1ch", ["s4_26", "s4_19", "s4_36", "s4_50", "fresnel", "par64"], "Generic 1ch dimmer"),
  rgbMap("generic-rgb-3ch", [], "Generic RGB 3ch"),
  rgbwMap("generic-rgbw-4ch", ["cyc_strip"], "Generic RGBW 4ch"),
  ledRgbw8Map("generic-rgbw-dimmer-8ch", ["led_par_rgbw"], "Generic RGBW 8ch with dimmer"),
  ledBarRgbw16Map("generic-rgbw-bar-16ch", ["led_bar_rgbw"], "Generic RGBW 16ch bar"),
  simpleMovingSpotMap("generic-moving-spot-24ch", ["spot_mh"], "Generic simple moving spot 24ch"),
];

export const GENERIC_OUTPUT_PROFILES = Object.freeze(Object.fromEntries(
  GENERIC_OUTPUT_PROFILE_LIST.map(profile => [profile.id, Object.freeze(profile)]),
));

const OUTPUT_PROFILE_BY_PROFILE_ID = new Map();
for (const profile of GENERIC_OUTPUT_PROFILE_LIST) {
  for (const profileId of profile.profileIds) OUTPUT_PROFILE_BY_PROFILE_ID.set(profileId, profile);
}

function normalizeChannelDescriptor(raw, index, source = "custom") {
  const slot = Number(raw.slot ?? index + 1);
  if (!Number.isInteger(slot) || slot < 1) return null;
  return channel({
    slot,
    label: raw.label || raw.name || `Slot ${slot}`,
    type: raw.type || raw.attribute || "raw",
    defaultValue: Number(raw.default ?? raw.defaultValue ?? 0) || 0,
    safeMin: Number.isFinite(Number(raw.safeMin)) ? Number(raw.safeMin) : 0,
    safeMax: Number.isFinite(Number(raw.safeMax)) ? Number(raw.safeMax) : 255,
    unsafe: Boolean(raw.unsafe),
    source,
  });
}

export function normalizeOutputProfileCandidate(candidate, profileId) {
  if (!candidate || typeof candidate !== "object") return null;
  const rawChannels = Array.isArray(candidate.channels) ? candidate.channels : [];
  const channels = rawChannels
    .map((raw, index) => normalizeChannelDescriptor(raw, index, candidate.source?.type || "custom"))
    .filter(Boolean)
    .sort((a, b) => a.slot - b.slot);
  if (channels.length === 0) return null;
  return {
    id: candidate.id || `${profileId}-output-map`,
    schemaVersion: Number(candidate.schemaVersion) || FIXTURE_OUTPUT_SCHEMA_VERSION,
    profileIds: candidate.profileIds || [profileId],
    label: candidate.label || `${profileId} output map`,
    fixtureClass: candidate.fixtureClass || "custom",
    footprint: Math.max(...channels.map(item => item.slot), Number(candidate.footprint || 1)),
    channels,
    source: {
      type: candidate.source?.type || "custom-candidate",
      approved: Boolean(candidate.source?.approved),
      confidence: candidate.source?.confidence || "candidate",
    },
    notes: Array.isArray(candidate.notes) ? candidate.notes : [],
  };
}

export function getFixtureOutputProfile(profileId, customProfiles = null) {
  const customCandidate = normalizeOutputProfileCandidate(customProfiles?.[profileId]?.outputMap, profileId);
  if (customCandidate?.source.approved) return customCandidate;
  return OUTPUT_PROFILE_BY_PROFILE_ID.get(profileId) || null;
}

export function getFixtureOutputCandidate(profileId, customProfiles = null) {
  const customCandidate = normalizeOutputProfileCandidate(customProfiles?.[profileId]?.outputMap, profileId);
  if (customCandidate && !customCandidate.source.approved) return customCandidate;
  return null;
}

function channelTypeFromName(name) {
  const text = String(name || "").toLowerCase();
  if (text.includes("dimmer") || text.includes("intensity") || text === "master") return "intensity";
  if (/\bred\b|\br\b/.test(text)) return "red";
  if (/\bgreen\b|\bg\b/.test(text)) return "green";
  if (/\bblue\b|\bb\b/.test(text)) return "blue";
  if (/\bwhite\b|\bw\b/.test(text)) return "white";
  if (text.includes("amber") || /\ba\b/.test(text)) return "amber";
  if (text.includes("uv") || text.includes("ultraviolet")) return "uv";
  if (text.includes("pan fine")) return "panFine";
  if (text.includes("pan")) return "panCoarse";
  if (text.includes("tilt fine")) return "tiltFine";
  if (text.includes("tilt")) return "tiltCoarse";
  if (text.includes("gobo")) return "goboWheel";
  if (text.includes("color")) return "colorWheel";
  if (text.includes("shutter")) return "shutter";
  if (text.includes("strobe")) return "strobe";
  if (text.includes("reset")) return "reset";
  return "raw";
}

function slugify(value) {
  return String(value ?? "fixture")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "fixture";
}

function isUnsafeType(type) {
  return ["panCoarse", "panFine", "tiltCoarse", "tiltFine", "colorWheel", "goboWheel", "shutter", "strobe", "reset", "raw"].includes(type);
}

function channelLabel(rawChannel, index) {
  if (typeof rawChannel === "string") return rawChannel;
  if (rawChannel?.name) return rawChannel.name;
  if (rawChannel?.capability?.type) return rawChannel.capability.type;
  if (rawChannel?.fineChannelAliases?.length) return rawChannel.fineChannelAliases[0];
  return `Slot ${index + 1}`;
}

export function inferOutputProfileFromOpenFixtureLibrary(oflFixture, options = {}) {
  const mode = Array.isArray(oflFixture?.modes) ? oflFixture.modes[0] : null;
  const rawChannels = Array.isArray(mode?.channels) ? mode.channels : [];
  if (!mode || rawChannels.length === 0) return null;
  const channels = rawChannels.map((rawChannel, index) => {
    const label = channelLabel(rawChannel, index);
    const type = channelTypeFromName(label);
    return channel({
      slot: index + 1,
      label,
      type,
      unsafe: isUnsafeType(type),
      source: "ofl-channel-name",
    });
  });
  const useful = channels.filter(item => item.type !== "raw").length;
  if (useful === 0) return null;
  const manufacturerKey = options.manufacturerKey || oflFixture.manufacturerKey || "ofl";
  const fixtureKey = options.fixtureKey || oflFixture.fixtureKey || oflFixture.name || "fixture";
  const profileId = options.profileId || `ofl_${slugify(manufacturerKey)}_${slugify(fixtureKey)}`;
  return outputProfile({
    id: `${profileId}-candidate-output-map`,
    profileIds: [profileId],
    label: `${oflFixture.manufacturer || options.manufacturerName || "OFL"} ${oflFixture.name || options.fixtureKey || "Fixture"} candidate map`,
    fixtureClass: "ofl-candidate",
    footprint: channels.length,
    channels,
    sourceType: "open-fixture-library-candidate",
    approved: false,
    confidence: useful === channels.length ? "medium" : "low",
    notes: ["Candidate map inferred from Open Fixture Library channel names. Review against the manufacturer mode chart before approval."],
  });
}

export function outputProfileStatus(profileId, customProfiles = null) {
  const profile = getFixtureOutputProfile(profileId, customProfiles);
  if (profile) return { status: "output-ready", profile };
  const candidate = getFixtureOutputCandidate(profileId, customProfiles);
  if (candidate) return { status: "candidate", profile: candidate };
  return { status: "paperwork-only", profile: null };
}

export function explainOutputChannel(outputProfile, channelDescriptor) {
  return `${outputProfile.label} slot ${channelDescriptor.slot} writes ${channelDescriptor.type} (${channelDescriptor.label})`;
}
