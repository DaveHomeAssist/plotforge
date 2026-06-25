import { describe, expect, it } from "vitest";
import {
  CURATED_GDTF_PROFILE_IDS,
  FIXTURE_PROFILES,
  LEGACY_PROFILE_IDS,
  getFixtureProfileLibrary,
  getProfileDetail,
  getProfileSearchText,
  normalizeOpenFixtureLibraryProfile,
} from "../domain/profiles.js";

describe("fixture profiles", () => {
  it("keeps a curated GDTF seed between 12 and 20 profiles", () => {
    expect(CURATED_GDTF_PROFILE_IDS.length).toBeGreaterThanOrEqual(12);
    expect(CURATED_GDTF_PROFILE_IDS.length).toBeLessThanOrEqual(20);
  });

  it("records GDTF Share provenance and mode footprints for curated profiles", () => {
    for (const id of CURATED_GDTF_PROFILE_IDS) {
      const profile = FIXTURE_PROFILES[id];
      expect(profile.source).toEqual(expect.objectContaining({
        type: "gdtf-share",
        fixtureId: expect.any(Number),
        revisionId: expect.any(Number),
        apiUrl: expect.stringContaining("gdtf-share.com/apis/getFixtureFileListByUser.php"),
      }));
      expect(profile.dmxFootprint).toBeGreaterThan(0);
      expect(profile.modes.length).toBeGreaterThan(0);
      expect(profile.modes).toContainEqual(expect.objectContaining({
        name: profile.defaultMode,
        dmxFootprint: profile.dmxFootprint,
      }));
    }
  });

  it("places imported OFL profiles after curated GDTF profiles", () => {
    const custom = {
      ofl_demo_fixture: normalizeOpenFixtureLibraryProfile({
        name: "Demo Fixture",
        categories: ["Color Changer"],
        modes: [{ name: "RGBA", channels: ["red", "green", "blue", "amber"] }],
      }, {
        manufacturerKey: "demo",
        fixtureKey: "fixture",
        importedAt: 123,
      }),
    };

    const library = getFixtureProfileLibrary(custom);
    expect(library[0].libraryTier).toBe("curated-gdtf");
    expect(library.find(profile => profile.id === "ofl_demo_fixture")).toEqual(expect.objectContaining({
      libraryTier: "ofl-import",
      dmxFootprint: 4,
      source: expect.objectContaining({ type: "open-fixture-library" }),
    }));
  });

  it("includes expanded legacy profiles with readable detail notes", () => {
    expect(LEGACY_PROFILE_IDS).toContain("led_par_rgbw");
    expect(LEGACY_PROFILE_IDS).toContain("blinder_2lite");

    const detail = getProfileDetail(FIXTURE_PROFILES.led_bar_rgbw);

    expect(detail.summary).toContain("LED bar");
    expect(detail.bestFor).toContain("cyc wash");
    expect(detail.capabilities).toContain("simple and pixel mode placeholders");
    expect(detail.notes).toContain("Local drafting seed");
  });

  it("searches profile wiki text", () => {
    const library = getFixtureProfileLibrary();
    const matches = library.filter(profile => getProfileSearchText(profile).includes("audience blinder"));

    expect(matches).toEqual([
      expect.objectContaining({ id: "blinder_2lite" }),
    ]);
  });

  it("rejects non-object OFL imports", () => {
    expect(() => normalizeOpenFixtureLibraryProfile(null)).toThrow(/fixture JSON object/);
  });
});
