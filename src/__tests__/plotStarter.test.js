import { describe, expect, it } from "vitest";
import { seedShow } from "../PlotForge.jsx";
import {
  applyPlotStarterPlan,
  buildPlotStarterPlan,
  plotStarterPrompt,
} from "../domain/plotStarter.js";

describe("plot starter", () => {
  it("builds a structured starter plan from a production brief", () => {
    const plan = buildPlotStarterPlan(seedShow(), "dance piece in a 40x30 black box with strong side light");

    expect(plan.productionType).toBe("dance");
    expect(plan.stageType).toBe("black box");
    expect(plan.stage).toEqual({ widthFt: 40, depthFt: 30 });
    expect(plan.positions.map(position => position.key)).toEqual(["foh", "mid", "back", "specials"]);
    expect(plan.fixtureGroups.reduce((sum, group) => sum + group.count, 0)).toBeGreaterThan(10);
    expect(plan.fixtureGroups[0]).toEqual(expect.objectContaining({
      role: "Front wash",
      profileId: "s4_26",
      color: "R80",
    }));
  });

  it("applies the starter plan without removing existing plot data", () => {
    const doc = seedShow();
    const plan = buildPlotStarterPlan(doc, "concert on a 48x28 stage with movers and bold backlight");
    const result = applyPlotStarterPlan(doc, plan);

    expect(result.addedPositionIds).toHaveLength(5);
    expect(result.addedFixtureIds.length).toBeGreaterThan(14);
    expect(result.doc.fixtureOrder.length).toBe(doc.fixtureOrder.length + result.addedFixtureIds.length);
    expect(result.doc.positionOrder.length).toBe(doc.positionOrder.length + result.addedPositionIds.length);

    const firstAddedFixture = result.doc.fixtures[result.addedFixtureIds[0]];
    expect(firstAddedFixture.channel).toBeGreaterThan(300);
    expect(firstAddedFixture.status).toBe("planned");
    expect(firstAddedFixture.notes.focus).toContain("aerial");
  });

  it("exports a prompt with the generated fixture groups", () => {
    const doc = seedShow();
    const plan = buildPlotStarterPlan(doc, "corporate keynote in a 32 by 18 room");
    const prompt = plotStarterPrompt(doc, plan);

    expect(prompt).toContain("Use this PlotForge starter context");
    expect(prompt).toContain("Studio A · Spike");
    expect(prompt).toContain("Corporate");
    expect(prompt).toContain("\"fixtureGroups\"");
  });
});
