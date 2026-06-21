const GDTF_SHARE_BASE = "https://gdtf-share.com";

const SOURCE_TYPES = {
  gdtf: "gdtf-share",
  legacy: "legacy-seed",
  ofl: "open-fixture-library",
};

const SYMBOL_COLORS = {
  ellipsoidal: "#ffb547",
  fresnel: "#ffb547",
  par: "#58e896",
  spot: "#4cc9ff",
};

function mode(name, dmxFootprint) {
  return { name, dmxFootprint };
}

function gdtfSource({ manufacturerKey, fixtureId, revisionId, revision, revisionDate, gdtfVersion }) {
  const params = new URLSearchParams({ name: manufacturerKey, fixture: String(fixtureId) });
  return {
    type: SOURCE_TYPES.gdtf,
    fixtureId,
    revisionId,
    revision,
    revisionDate,
    gdtfVersion,
    fixtureListUrl: `${GDTF_SHARE_BASE}/userPage.php?name=${encodeURIComponent(manufacturerKey)}&page=fixtures`,
    apiUrl: `${GDTF_SHARE_BASE}/apis/getFixtureFileListByUser.php?${params.toString()}`,
  };
}

function gdtfProfile({
  id,
  manufacturer,
  manufacturerKey,
  model,
  symbol,
  category,
  radiusMm,
  modes,
  defaultMode,
  source,
}) {
  const selectedMode = modes.find(item => item.name === defaultMode) ?? modes[0];
  return {
    id,
    manufacturer,
    model,
    symbol,
    category,
    radiusMm,
    dmxFootprint: selectedMode.dmxFootprint,
    color: SYMBOL_COLORS[symbol],
    defaultMode: selectedMode.name,
    modes,
    libraryTier: "curated-gdtf",
    source: gdtfSource({ manufacturerKey, ...source }),
  };
}

function legacyProfile(profile) {
  return {
    ...profile,
    category: profile.category ?? "legacy",
    defaultMode: profile.defaultMode ?? "Default",
    modes: profile.modes ?? [mode("Default", profile.dmxFootprint)],
    libraryTier: "legacy",
    source: { type: SOURCE_TYPES.legacy },
  };
}

const CURATED_GDTF_PROFILES = {
  robe_spiider: gdtfProfile({
    id: "robe_spiider",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin Spiider",
    symbol: "par",
    category: "moving-wash",
    radiusMm: 250,
    defaultMode: "Mode 5 - Wash",
    modes: [
      mode("Mode 5 - Wash", 27),
      mode("Mode 7 - Pixel RGB", 34),
      mode("Mode 8 - Pixel RGBW", 66),
      mode("Mode 10 - Pattern full RGBW", 79),
    ],
    source: {
      fixtureId: 1635,
      revisionId: 119729,
      revision: "2025-12-03 Reupload to share",
      revisionDate: "2025-12-03 07:20:40",
      gdtfVersion: "1.2",
    },
  }),
  robe_ispiider: gdtfProfile({
    id: "robe_ispiider",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin iSpiider",
    symbol: "par",
    category: "moving-wash",
    radiusMm: 250,
    defaultMode: "Mode 5 - Wash",
    modes: [
      mode("Mode 5 - Wash", 27),
      mode("Mode 7 - Pixel RGB", 34),
      mode("Mode 8 - Pixel RGBW", 66),
      mode("Mode 10 - Pattern full RGBW", 79),
    ],
    source: {
      fixtureId: 5846,
      revisionId: 119733,
      revision: "2025-12-03 Reupload to share",
      revisionDate: "2025-12-03 07:50:30",
      gdtfVersion: "1.2",
    },
  }),
  robe_megapointe: gdtfProfile({
    id: "robe_megapointe",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin MegaPointe",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 260,
    defaultMode: "Mode 1 - Standard 16 - bit",
    modes: [
      mode("Mode 1 - Standard 16 - bit", 39),
      mode("Mode 2 - Reduced 8 - bit", 34),
    ],
    source: {
      fixtureId: 661,
      revisionId: 138392,
      revision: "2026-04-13 Shutter channel sets revision",
      revisionDate: "2026-04-13 10:14:23",
      gdtfVersion: "1.2",
    },
  }),
  robe_esprite: gdtfProfile({
    id: "robe_esprite",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin Esprite",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 260,
    defaultMode: "Mode 1 - Standard 16 bit",
    modes: [
      mode("Mode 1 - Standard 16 bit", 49),
      mode("Mode 2 - Reduced 8 bit", 42),
      mode("Mode 5 - Enhanced gobo control", 51),
    ],
    source: {
      fixtureId: 472,
      revisionId: 116608,
      revision: "2025-11-07 Personality RDM number revision",
      revisionDate: "2025-11-07 13:35:03",
      gdtfVersion: "1.2",
    },
  }),
  robe_forte: gdtfProfile({
    id: "robe_forte",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin Forte",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 260,
    defaultMode: "Mode 1 - Standard 16 bit",
    modes: [
      mode("Mode 1 - Standard 16 bit", 54),
      mode("Mode 2 - Enhanced gobo control", 56),
    ],
    source: {
      fixtureId: 9815,
      revisionId: 116612,
      revision: "2025-11-07 Personality RDM number revision",
      revisionDate: "2025-11-07 13:41:14",
      gdtfVersion: "1.2",
    },
  }),
  robe_ledbeam150: gdtfProfile({
    id: "robe_ledbeam150",
    manufacturer: "Robe Lighting",
    manufacturerKey: "Robe Lighting s.r.o.",
    model: "Robin LEDBeam 150 RGBW",
    symbol: "par",
    category: "moving-wash",
    radiusMm: 240,
    defaultMode: "Mode 1 - Standard 16 - bit",
    modes: [
      mode("Mode 1 - Standard 16 - bit", 22),
      mode("Mode 2 - Reduced 8 - bit", 16),
    ],
    source: {
      fixtureId: 1456,
      revisionId: 143814,
      revision: "2026-05-22 Control channel update",
      revisionDate: "2026-05-22 10:10:59",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_aura: gdtfProfile({
    id: "martin_mac_aura",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC Aura",
    symbol: "par",
    category: "moving-wash",
    radiusMm: 245,
    defaultMode: "Standard",
    modes: [mode("Standard", 14), mode("Extended", 25)],
    source: {
      fixtureId: 11389,
      revisionId: 40783,
      revision: "20230201NoMeas",
      revisionDate: "2023-06-02 03:49:03",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_aura_pxl: gdtfProfile({
    id: "martin_mac_aura_pxl",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC Aura PXL",
    symbol: "par",
    category: "moving-wash",
    radiusMm: 250,
    defaultMode: "Compact",
    modes: [
      mode("Compact", 17),
      mode("Basic", 32),
      mode("Extended", 32),
      mode("Ludicrous", 32),
    ],
    source: {
      fixtureId: 5335,
      revisionId: 118130,
      revision: "20251119",
      revisionDate: "2025-11-19 15:49:54",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_one: gdtfProfile({
    id: "martin_mac_one",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC One",
    symbol: "spot",
    category: "moving-beam",
    radiusMm: 245,
    defaultMode: "Compact",
    modes: [
      mode("Compact", 20),
      mode("Basic", 36),
      mode("Ludicrous", 39),
    ],
    source: {
      fixtureId: 15457,
      revisionId: 131142,
      revision: "20260228",
      revisionDate: "2026-02-28 14:59:37",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_viper_profile: gdtfProfile({
    id: "martin_mac_viper_profile",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC Viper Profile",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 260,
    defaultMode: "Basic",
    modes: [mode("Basic", 26), mode("Extended", 34)],
    source: {
      fixtureId: 11398,
      revisionId: 146138,
      revision: "20230516NoMeas",
      revisionDate: "2026-06-09 17:56:49",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_ultra_performance: gdtfProfile({
    id: "martin_mac_ultra_performance",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC Ultra Performance",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 270,
    defaultMode: "Basic",
    modes: [
      mode("Basic", 48),
      mode("Compact", 42),
      mode("Extended", 58),
    ],
    source: {
      fixtureId: 5507,
      revisionId: 131139,
      revision: "20260228",
      revisionDate: "2026-02-28 14:38:13",
      gdtfVersion: "1.2",
    },
  }),
  martin_mac_quantum_profile: gdtfProfile({
    id: "martin_mac_quantum_profile",
    manufacturer: "Martin Professional",
    manufacturerKey: "Martin Professional",
    model: "MAC Quantum Profile",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 255,
    defaultMode: "Basic",
    modes: [mode("Basic", 19), mode("Extended", 27)],
    source: {
      fixtureId: 4558,
      revisionId: 36847,
      revision: "20230316NoMeas",
      revisionDate: "2023-03-16 20:44:59",
      gdtfVersion: "1.2",
    },
  }),
  chauvet_color_strike_m: gdtfProfile({
    id: "chauvet_color_strike_m",
    manufacturer: "Chauvet Professional",
    manufacturerKey: "CHAUVET Professional",
    model: "Color Strike M",
    symbol: "par",
    category: "strobe-wash",
    radiusMm: 245,
    defaultMode: "24Ch Mode",
    modes: [
      mode("24Ch Mode", 24),
      mode("30Ch Mode", 30),
      mode("47Ch Mode", 47),
      mode("97Ch Mode", 97),
    ],
    source: {
      fixtureId: 8002,
      revisionId: 136508,
      revision: "Rev 1.1.3",
      revisionDate: "2026-04-01 17:18:40",
      gdtfVersion: "1.2",
    },
  }),
  chauvet_colorado_pxl_bar_16: gdtfProfile({
    id: "chauvet_colorado_pxl_bar_16",
    manufacturer: "Chauvet Professional",
    manufacturerKey: "CHAUVET Professional",
    model: "COLORado PXL Bar 16",
    symbol: "par",
    category: "led-bar",
    radiusMm: 260,
    defaultMode: "Single Control: Basic Mode 20ch",
    modes: [
      mode("Single Control: Basic2 Mode 19ch", 19),
      mode("Single Control: Basic Mode 20ch", 20),
      mode("Single Control: Standard Mode 84ch", 84),
      mode("Single Control: Advanced Mode 154ch", 154),
    ],
    source: {
      fixtureId: 9514,
      revisionId: 89308,
      revision: "Rev 1.0.9",
      revisionDate: "2025-03-12 17:44:17",
      gdtfVersion: "1.2",
    },
  }),
  chauvet_colorado_solo_batten: gdtfProfile({
    id: "chauvet_colorado_solo_batten",
    manufacturer: "Chauvet Professional",
    manufacturerKey: "CHAUVET Professional",
    model: "Colorado Solo Batten",
    symbol: "par",
    category: "led-bar",
    radiusMm: 260,
    defaultMode: "3-Cell RGBAW 15 CH",
    modes: [
      mode("3-Cell RGB 9 CH", 9),
      mode("3-Cell RGB EXT 21 CH", 21),
      mode("3-Cell RGBAW 15 CH", 15),
      mode("3-Cell RGBAW EXT 27 CH", 27),
    ],
    source: {
      fixtureId: 9940,
      revisionId: 97419,
      revision: "Beta 1.0.1",
      revisionDate: "2025-05-20 17:06:12",
      gdtfVersion: "1.2",
    },
  }),
  chauvet_colorado_2_solo: gdtfProfile({
    id: "chauvet_colorado_2_solo",
    manufacturer: "Chauvet Professional",
    manufacturerKey: "CHAUVET Professional",
    model: "Colorado 2 Solo",
    symbol: "par",
    category: "led-wash",
    radiusMm: 235,
    defaultMode: "TOUR",
    modes: [
      mode("TOUR", 12),
      mode("STD Y", 17),
      mode("HSIC", 9),
      mode("SSP", 9),
    ],
    source: {
      fixtureId: 6399,
      revisionId: 97411,
      revision: "Beta 1.0.1",
      revisionDate: "2025-05-20 16:49:31",
      gdtfVersion: "1.2",
    },
  }),
  chauvet_colorado_1_quad: gdtfProfile({
    id: "chauvet_colorado_1_quad",
    manufacturer: "Chauvet Professional",
    manufacturerKey: "CHAUVET Professional",
    model: "COLORado 1 Quad",
    symbol: "par",
    category: "led-wash",
    radiusMm: 230,
    defaultMode: "8Bit",
    modes: [
      mode("8Bit", 10),
      mode("16BI", 15),
      mode("SSP", 7),
      mode("ARC 2", 4),
    ],
    source: {
      fixtureId: 11016,
      revisionId: 97404,
      revision: "Beta 1.0.1",
      revisionDate: "2025-05-20 16:31:32",
      gdtfVersion: "1.2",
    },
  }),
};

const LEGACY_PROFILES = {
  s4_26: legacyProfile({
    id: "s4_26",
    manufacturer: "ETC",
    model: "Source Four 26°",
    symbol: "ellipsoidal",
    category: "ellipsoidal",
    radiusMm: 200,
    dmxFootprint: 1,
    color: "#ffb547",
  }),
  fresnel: legacyProfile({
    id: "fresnel",
    manufacturer: "Generic",
    model: "Fresnel 6\"",
    symbol: "fresnel",
    category: "fresnel",
    radiusMm: 220,
    dmxFootprint: 1,
    color: "#ffb547",
  }),
  par64: legacyProfile({
    id: "par64",
    manufacturer: "Generic",
    model: "PAR 64",
    symbol: "par",
    category: "par",
    radiusMm: 240,
    dmxFootprint: 1,
    color: "#ffb547",
  }),
  spot_mh: legacyProfile({
    id: "spot_mh",
    manufacturer: "Generic",
    model: "Moving Spot",
    symbol: "spot",
    category: "moving-spot",
    radiusMm: 260,
    dmxFootprint: 24,
    color: "#4cc9ff",
  }),
};

export const CURATED_GDTF_PROFILE_IDS = Object.keys(CURATED_GDTF_PROFILES);
export const LEGACY_PROFILE_IDS = Object.keys(LEGACY_PROFILES);
export const FIXTURE_PROFILE_ORDER = [...CURATED_GDTF_PROFILE_IDS, ...LEGACY_PROFILE_IDS];

export const FIXTURE_PROFILES = {
  ...CURATED_GDTF_PROFILES,
  ...LEGACY_PROFILES,
};

export function getProfile(id, customProfiles = null) {
  return customProfiles?.[id] || FIXTURE_PROFILES[id] || null;
}

export function getFixtureProfileLibrary(customProfiles = null) {
  const custom = Object.values(customProfiles || {}).sort((a, b) => {
    const aName = `${a.manufacturer} ${a.model}`;
    const bName = `${b.manufacturer} ${b.model}`;
    return aName.localeCompare(bName);
  });
  return [
    ...CURATED_GDTF_PROFILE_IDS.map(id => FIXTURE_PROFILES[id]),
    ...custom,
    ...LEGACY_PROFILE_IDS.map(id => FIXTURE_PROFILES[id]),
  ];
}

export function getProfileSearchText(profile) {
  return [
    profile.manufacturer,
    profile.model,
    profile.category,
    profile.defaultMode,
    profile.source?.type,
  ].filter(Boolean).join(" ").toLowerCase();
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

function inferOflCategory(categories = []) {
  const joined = categories.join(" ").toLowerCase();
  if (joined.includes("moving")) return "moving-spot";
  if (joined.includes("bar") || joined.includes("batten")) return "led-bar";
  if (joined.includes("strobe")) return "strobe-wash";
  if (joined.includes("color") || joined.includes("wash")) return "led-wash";
  if (joined.includes("fresnel")) return "fresnel";
  if (joined.includes("profile") || joined.includes("spot")) return "moving-spot";
  if (joined.includes("par")) return "par";
  return "ofl";
}

function inferOflSymbol(category) {
  if (category === "fresnel") return "fresnel";
  if (category === "moving-spot") return "spot";
  if (category === "ellipsoidal") return "ellipsoidal";
  return "par";
}

function normalizeOflModes(rawModes) {
  if (!Array.isArray(rawModes) || rawModes.length === 0) {
    return [mode("Default", 1)];
  }

  return rawModes.map((rawMode, index) => {
    const dmxFootprint = Array.isArray(rawMode.channels)
      ? rawMode.channels.length
      : Number(rawMode.dmxFootprint || rawMode.footprint || 1);
    return mode(rawMode.name || `Mode ${index + 1}`, Math.max(1, dmxFootprint));
  });
}

export function normalizeOpenFixtureLibraryProfile(oflFixture, options = {}) {
  if (!oflFixture || typeof oflFixture !== "object") {
    throw new Error("Open Fixture Library import requires a fixture JSON object.");
  }

  const manufacturerKey = options.manufacturerKey || oflFixture.manufacturerKey || "ofl";
  const fixtureKey = options.fixtureKey || oflFixture.fixtureKey || oflFixture.name || "fixture";
  const manufacturer = options.manufacturerName || oflFixture.manufacturer || manufacturerKey;
  const model = oflFixture.name || oflFixture.model || fixtureKey;
  const categories = Array.isArray(oflFixture.categories) ? oflFixture.categories : [];
  const category = inferOflCategory(categories);
  const symbol = inferOflSymbol(category);
  const modes = normalizeOflModes(oflFixture.modes);
  const selectedMode = modes[0];

  return {
    id: `ofl_${slugify(manufacturerKey)}_${slugify(fixtureKey)}`,
    manufacturer,
    model,
    symbol,
    category,
    radiusMm: symbol === "spot" ? 255 : 235,
    dmxFootprint: selectedMode.dmxFootprint,
    color: SYMBOL_COLORS[symbol],
    defaultMode: selectedMode.name,
    modes,
    libraryTier: "ofl-import",
    source: {
      type: SOURCE_TYPES.ofl,
      manufacturerKey,
      fixtureKey,
      fileName: options.fileName || null,
      importedAt: options.importedAt || Date.now(),
    },
  };
}
