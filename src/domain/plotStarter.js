import { addFixture, addPosition, newFixture, newPosition } from "./show.js";
import { getProfile } from "./profiles.js";
import { feetToMm, mmToFeet } from "./units.js";

export const PLOT_STARTER_VERSION = 1;

const DEFAULT_BRIEF = "Small musical in a 36x22 proscenium theatre. Warm front wash, clean specials, saturated backlight for dance breaks.";

const TYPE_RULES = [
  ["musical", ["musical", "opera", "play", "theatre", "theater", "drama"]],
  ["concert", ["concert", "band", "music", "gig", "tour"]],
  ["dance", ["dance", "ballet", "movement", "choreo"]],
  ["corporate", ["corporate", "keynote", "panel", "podium", "conference"]],
  ["comedy", ["comedy", "standup", "stand up"]],
];

const TYPE_SETTINGS = {
  musical: {
    label: "Musical theatre",
    color: "R02",
    focus: "warm face wash with clear acting area coverage",
    crew: "Start with even front wash, back color, and two downstage specials.",
    frontProfile: "s4_26",
    midProfile: "fresnel",
    backProfile: "par64",
    specialsProfile: "s4_26",
    movingProfile: "spot_mh",
  },
  dance: {
    label: "Dance",
    color: "R80",
    focus: "high side look and saturated backlight lanes",
    crew: "Prioritize sculpted bodies, side color, and open center specials.",
    frontProfile: "s4_26",
    midProfile: "par64",
    backProfile: "par64",
    specialsProfile: "fresnel",
    movingProfile: "spot_mh",
  },
  concert: {
    label: "Concert",
    color: "R119",
    focus: "bold backlight, aerial texture, and center vocal special",
    crew: "Build energy looks first, then clean a center vocal special.",
    frontProfile: "s4_26",
    midProfile: "par64",
    backProfile: "spot_mh",
    specialsProfile: "s4_26",
    movingProfile: "spot_mh",
  },
  corporate: {
    label: "Corporate",
    color: "R3202",
    focus: "flat camera safe face wash and podium specials",
    crew: "Keep color neutral, avoid harsh backlight on presenters.",
    frontProfile: "s4_26",
    midProfile: "fresnel",
    backProfile: "par64",
    specialsProfile: "s4_26",
    movingProfile: "spot_mh",
  },
  comedy: {
    label: "Comedy",
    color: "R33",
    focus: "tight warm center special with low spill",
    crew: "Keep the plot simple and leave room for handheld mic movement.",
    frontProfile: "s4_26",
    midProfile: "fresnel",
    backProfile: "par64",
    specialsProfile: "s4_26",
    movingProfile: "spot_mh",
  },
};

function cleanBrief(brief) {
  return String(brief ?? "").replace(/\s+/g, " ").trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function evenCount(value) {
  return value % 2 === 0 ? value : value + 1;
}

function scaledCount(widthFt, { divisor, min, max }) {
  return evenCount(clamp(Math.round(widthFt / divisor), min, max));
}

function inferProductionType(brief) {
  const lower = brief.toLowerCase();
  const match = TYPE_RULES.find(([, keywords]) => keywords.some(keyword => lower.includes(keyword)));
  return match?.[0] || "musical";
}

function inferStageType(brief) {
  const lower = brief.toLowerCase();
  if (lower.includes("thrust")) return "thrust";
  if (lower.includes("black box") || lower.includes("blackbox")) return "black box";
  if (lower.includes("arena")) return "arena";
  return "proscenium";
}

function inferStageSize(doc, brief) {
  const match = brief.match(/\b(\d{2,3})(?:\s*(?:'|ft|feet))?\s*(?:x|×|by)\s*(\d{2,3})(?:\s*(?:'|ft|feet))?\b/i);
  if (match) {
    return {
      widthFt: clamp(Number.parseInt(match[1], 10), 12, 120),
      depthFt: clamp(Number.parseInt(match[2], 10), 8, 90),
    };
  }
  return {
    widthFt: Math.round(mmToFeet(doc.venue?.stageWidthMm ?? feetToMm(36))),
    depthFt: Math.round(mmToFeet(doc.venue?.stageDepthMm ?? feetToMm(22))),
  };
}

function positionRecipe({ key, name, kind, yFt, trimFt, lengthFt }) {
  return { key, name, kind, yFt, trimFt, lengthFt };
}

function fixtureRecipe({ positionKey, role, profileId, count, color, focus, crew, channelStart, dmxUniverse }) {
  return { positionKey, role, profileId, count, color, focus, crew, channelStart, dmxUniverse };
}

function maxExistingChannel(doc) {
  return Object.values(doc.fixtures || {}).reduce((max, fixture) => {
    const channel = Number(fixture.channel);
    return Number.isFinite(channel) ? Math.max(max, channel) : max;
  }, 0);
}

function maxDmxEnd(doc, universe) {
  return Object.values(doc.fixtures || {}).reduce((max, fixture) => {
    if (fixture.dmx?.universe !== universe) return max;
    const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
    const footprint = profile?.dmxFootprint || 1;
    return Math.max(max, Number(fixture.dmx.address || 1) + footprint - 1);
  }, 0);
}

function fixturePoints(count, lengthFt) {
  if (count <= 1) return [0];
  const spanMm = feetToMm(Math.max(4, lengthFt - 4));
  const start = -spanMm / 2;
  const step = spanMm / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(start + step * index));
}

export function buildPlotStarterPlan(doc, brief = DEFAULT_BRIEF) {
  const normalizedBrief = cleanBrief(brief) || DEFAULT_BRIEF;
  const productionType = inferProductionType(normalizedBrief);
  const stageType = inferStageType(normalizedBrief);
  const stage = inferStageSize(doc, normalizedBrief);
  const settings = TYPE_SETTINGS[productionType];
  const frontCount = scaledCount(stage.widthFt, { divisor: 7, min: 4, max: 10 });
  const backCount = scaledCount(stage.widthFt, { divisor: 8, min: 4, max: 10 });
  const midCount = productionType === "corporate" ? 2 : scaledCount(stage.widthFt, { divisor: 10, min: 2, max: 6 });
  const movingCount = productionType === "concert" ? scaledCount(stage.widthFt, { divisor: 12, min: 2, max: 6 }) : 0;
  const channelStart = Math.max(301, maxExistingChannel(doc) + 1);

  const positions = [
    positionRecipe({ key: "foh", name: "AI FOH WASH", kind: "foh", yFt: 6, trimFt: 28, lengthFt: stage.widthFt }),
    positionRecipe({ key: "mid", name: "AI MIDSTAGE WASH", kind: "pipe", yFt: -Math.max(6, Math.round(stage.depthFt * 0.35)), trimFt: 22, lengthFt: Math.max(12, stage.widthFt - 6) }),
    positionRecipe({ key: "back", name: "AI BACKLIGHT", kind: "pipe", yFt: -Math.max(10, Math.round(stage.depthFt * 0.72)), trimFt: 24, lengthFt: Math.max(12, stage.widthFt - 6) }),
    positionRecipe({ key: "specials", name: "AI SPECIALS", kind: "pipe", yFt: -Math.max(3, Math.round(stage.depthFt * 0.18)), trimFt: 22, lengthFt: Math.max(10, stage.widthFt * 0.45) }),
  ];

  if (movingCount > 0) {
    positions.push(positionRecipe({ key: "movers", name: "AI MOVERS", kind: "truss", yFt: -Math.max(4, Math.round(stage.depthFt * 0.5)), trimFt: 26, lengthFt: Math.max(12, stage.widthFt - 4) }));
  }

  const fixtureGroups = [
    fixtureRecipe({
      positionKey: "foh",
      role: "Front wash",
      profileId: settings.frontProfile,
      count: frontCount,
      color: settings.color,
      focus: settings.focus,
      crew: settings.crew,
      channelStart,
      dmxUniverse: 3,
    }),
    fixtureRecipe({
      positionKey: "mid",
      role: "Mid wash",
      profileId: settings.midProfile,
      count: midCount,
      color: productionType === "corporate" ? "R3202" : "R60",
      focus: productionType === "dance" ? "side sculpting and soft diagonal texture" : "soft fill across the center acting area",
      crew: "Balance with front wash before focus specials.",
      channelStart: channelStart + frontCount,
      dmxUniverse: 3,
    }),
    fixtureRecipe({
      positionKey: "back",
      role: "Backlight",
      profileId: settings.backProfile,
      count: backCount,
      color: productionType === "concert" ? "R80" : "R119",
      focus: "separate performers from the cyc and rear masking",
      crew: "Patch as independent color lanes when dimmers allow.",
      channelStart: channelStart + frontCount + midCount,
      dmxUniverse: 3,
    }),
    fixtureRecipe({
      positionKey: "specials",
      role: "Specials",
      profileId: settings.specialsProfile,
      count: productionType === "comedy" ? 1 : 2,
      color: settings.color,
      focus: productionType === "corporate" ? "podium and panel table" : "center special plus one flexible downstage special",
      crew: "Refine these after blocking is known.",
      channelStart: channelStart + frontCount + midCount + backCount,
      dmxUniverse: 3,
    }),
  ];

  if (movingCount > 0) {
    fixtureGroups.push(fixtureRecipe({
      positionKey: "movers",
      role: "Moving looks",
      profileId: settings.movingProfile,
      count: movingCount,
      color: "",
      focus: "fan looks, aerial texture, and lead vocal pickup",
      crew: "Confirm console mode before addressing.",
      channelStart: channelStart + frontCount + midCount + backCount + 2,
      dmxUniverse: 4,
    }));
  }

  return {
    version: PLOT_STARTER_VERSION,
    source: "plotforge-local-starter",
    generatedAt: new Date().toISOString(),
    brief: normalizedBrief,
    productionType,
    productionLabel: settings.label,
    stageType,
    stage,
    positions,
    fixtureGroups,
    notes: [
      `Assumption: ${settings.label} starter for a ${stage.widthFt} ft by ${stage.depthFt} ft ${stageType} stage.`,
      "Local rules generate this first pass. A model provider can refine it from the copied prompt.",
    ],
  };
}

export function plotStarterPrompt(doc, plan) {
  return [
    "Use this PlotForge starter context to refine a lighting plot.",
    `Show: ${doc.name || "Untitled Show"}`,
    `Brief: ${plan.brief}`,
    `Stage: ${plan.stage.widthFt} ft by ${plan.stage.depthFt} ft ${plan.stageType}`,
    `Starter type: ${plan.productionLabel}`,
    "Return revised position names, fixture counts, color choices, and focus notes as JSON.",
    JSON.stringify({
      positions: plan.positions,
      fixtureGroups: plan.fixtureGroups,
      notes: plan.notes,
    }, null, 2),
  ].join("\n");
}

export function applyPlotStarterPlan(doc, plan) {
  if (!plan?.positions?.length || !plan?.fixtureGroups?.length) {
    throw new Error("Plot starter plan is empty.");
  }

  let next = doc;
  const positionIdsByKey = {};
  const addedPositionIds = [];
  const addedFixtureIds = [];
  let nextAddressByUniverse = new Map();

  for (const positionPlan of plan.positions) {
    const position = newPosition({
      name: positionPlan.name,
      kind: positionPlan.kind,
      yMm: feetToMm(positionPlan.yFt),
      lengthMm: feetToMm(positionPlan.lengthFt),
      trimMm: feetToMm(positionPlan.trimFt),
    });
    next = addPosition(next, position);
    positionIdsByKey[positionPlan.key] = position.id;
    addedPositionIds.push(position.id);
  }

  for (const group of plan.fixtureGroups) {
    const positionId = positionIdsByKey[group.positionKey];
    const position = next.positions[positionId];
    const profile = getProfile(group.profileId, next.fixtureProfiles);
    if (!position || !profile) continue;

    const universe = Number(group.dmxUniverse) || 3;
    if (!nextAddressByUniverse.has(universe)) {
      nextAddressByUniverse.set(universe, Math.max(1, maxDmxEnd(next, universe) + 1));
    }

    const points = fixturePoints(group.count, mmToFeet(position.lengthMm));
    for (let index = 0; index < points.length; index += 1) {
      const address = nextAddressByUniverse.get(universe);
      const fixture = newFixture({
        positionId,
        profileId: group.profileId,
        xMm: points[index],
        channel: group.channelStart + index,
        dmx: address <= 512 ? { universe, address } : null,
        color: group.color,
        notes: {
          color: group.color ? `Starter gel ${group.color}` : "",
          gobo: "",
          focus: group.focus,
          crew: `${group.role}. ${group.crew}`,
        },
        status: "planned",
        circuit: `AI-${group.role.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${index + 1}`,
        dimmer: "",
      });
      next = addFixture(next, fixture);
      addedFixtureIds.push(fixture.id);
      nextAddressByUniverse.set(universe, address + profile.dmxFootprint);
    }
  }

  return { doc: next, addedPositionIds, addedFixtureIds };
}
