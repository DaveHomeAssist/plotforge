// A tiny built-in fixture library for the spike. Real GDTF import is a Phase-2
// concern. Each profile carries the 2D symbol radius (mm), label, dmx footprint,
// and an SVG draw-spec the canvas can interpret.

export const FIXTURE_PROFILES = {
  s4_26: {
    id: "s4_26",
    manufacturer: "ETC",
    model: "Source Four 26°",
    symbol: "ellipsoidal",
    radiusMm: 200,
    dmxFootprint: 1,
    color: "#ffb547",
  },
  fresnel: {
    id: "fresnel",
    manufacturer: "Generic",
    model: "Fresnel 6\"",
    symbol: "fresnel",
    radiusMm: 220,
    dmxFootprint: 1,
    color: "#ffb547",
  },
  par64: {
    id: "par64",
    manufacturer: "Generic",
    model: "PAR 64",
    symbol: "par",
    radiusMm: 240,
    dmxFootprint: 1,
    color: "#ffb547",
  },
  spot_mh: {
    id: "spot_mh",
    manufacturer: "Generic",
    model: "Moving Spot",
    symbol: "spot",
    radiusMm: 260,
    dmxFootprint: 24,
    color: "#4cc9ff",
  },
};

export function getProfile(id) {
  return FIXTURE_PROFILES[id] || null;
}
