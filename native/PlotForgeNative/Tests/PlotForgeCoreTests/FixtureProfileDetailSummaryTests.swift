import PlotForgeCore
import XCTest

final class FixtureProfileDetailSummaryTests: XCTestCase {
    func testFixtureProfileDetailSummaryKeepsRichImportedInformation() throws {
        let imported = FixtureProfile(
            id: "ofl_tiny_wash",
            manufacturer: "Demo Maker",
            model: "Tiny Wash",
            symbol: "par",
            category: "led-wash",
            radiusMm: 235,
            dmxFootprint: 4,
            defaultMode: "RGBA",
            modes: [
                FixtureMode(name: "RGBA", dmxFootprint: 4),
                FixtureMode(name: "RGBW 16 bit", dmxFootprint: 8),
            ],
            info: FixtureProfileInfo(
                summary: "Compact wash for tight positions.",
                bestFor: ["low trim color", "side light"],
                capabilities: ["RGBW", "dimmer curve"],
                notes: ["Verify fan mode before quiet scenes."],
                extraFields: ["serviceHours": .number(1_200)]
            ),
            libraryTier: "ofl-import",
            source: [
                "type": .string("open-fixture-library"),
                "slug": .string("demo/tiny-wash"),
            ],
            extraFields: [
                "lens_options": .array([.string("20 deg"), .string("40 deg")]),
                "powerWatts": .number(180),
            ]
        )

        let detail = PlotToolModules.fixtureProfileDetail(imported)

        XCTAssertEqual(detail.displayName, "Demo Maker Tiny Wash")
        XCTAssertEqual(detail.sourceLabel, "ofl-import")
        XCTAssertEqual(detail.summary, "Compact wash for tight positions.")
        XCTAssertEqual(detail.bestFor, ["low trim color", "side light"])
        XCTAssertEqual(detail.capabilities, ["RGBW", "dimmer curve"])
        XCTAssertEqual(detail.notes, ["Verify fan mode before quiet scenes."])
        XCTAssertEqual(detail.modes.map(\.name), ["RGBA", "RGBW 16 bit"])
        XCTAssertEqual(detail.modes.map(\.footprintLabel), ["4 channels", "8 channels"])
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Source Slug", value: "demo/tiny-wash")))
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Profile Lens Options", value: "20 deg, 40 deg")))
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Profile PowerWatts", value: "180")))
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Info ServiceHours", value: "1200")))
    }

    func testStarterGenericProfilesCarryWikiLikeDetailRows() throws {
        let profile = try XCTUnwrap(PlotToolModules.seededFixtureProfiles.first { $0.id == "led_profile_rgbal" })
        let detail = PlotToolModules.fixtureProfileDetail(profile)

        XCTAssertEqual(detail.displayName, "Generic LED Profile RGBAL")
        XCTAssertEqual(detail.sourceLabel, "starter-generic")
        XCTAssertEqual(detail.summary, "Generic LED profile starter for front light, specials, and color-mixing profile positions.")
        XCTAssertEqual(detail.bestFor, ["front light", "specials", "color-mixing profile systems"])
        XCTAssertTrue(detail.capabilities.contains("RGBAL color mixing"))
        XCTAssertTrue(detail.notes.contains("Replace with the venue or rental vendor profile before final patch."))
        XCTAssertEqual(detail.modes.map(\.name), ["Dimmer only", "RGBAL 8 bit", "RGBAL 16 bit"])
        XCTAssertEqual(detail.modes.map(\.footprintLabel), ["1 channels", "7 channels", "12 channels"])
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Profile PowerClass", value: "LED profile")))
        XCTAssertTrue(detail.rows.contains(FixtureProfileDetailRow(label: "Info PaperworkWarning", value: "Generic profile; verify mode and footprint before final address assignment.")))
    }
}
