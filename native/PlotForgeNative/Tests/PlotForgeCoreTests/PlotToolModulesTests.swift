import PlotForgeCore
import XCTest

final class PlotToolModulesTests: XCTestCase {
    func testFixtureProfileLibrarySearchesSeededAndImportedProfiles() throws {
        let imported = FixtureProfile(
            id: "ofl_tiny_wash",
            manufacturer: "Demo Maker",
            model: "Tiny Wash",
            symbol: "par",
            category: "led-wash",
            radiusMm: 235,
            dmxFootprint: 4,
            defaultMode: "RGBA",
            modes: [FixtureMode(name: "RGBA", dmxFootprint: 4)],
            libraryTier: "ofl-import",
            source: ["type": .string("open-fixture-library")]
        )

        let all = PlotToolModules.fixtureProfileLibrary(documentProfiles: [imported.id: imported])
        let search = PlotToolModules.fixtureProfileLibrary(documentProfiles: [imported.id: imported], query: "tiny")
        let pixelSearch = PlotToolModules.fixtureProfileLibrary(documentProfiles: [:], query: "pixel")
        let ledSearch = PlotToolModules.fixtureProfileLibrary(documentProfiles: [:], query: "rgbal")

        XCTAssertTrue(all.contains { $0.profile.id == "robe_megapointe" && $0.sourceLabel == "curated-gdtf" })
        XCTAssertTrue(all.contains { $0.profile.id == "s4_26" && $0.sourceLabel == "legacy" })
        XCTAssertTrue(all.contains { $0.profile.id == "led_profile_rgbal" && $0.sourceLabel == "starter-generic" })
        XCTAssertGreaterThanOrEqual(all.count, 12)
        XCTAssertEqual(search.map(\.profile.id), ["ofl_tiny_wash"])
        XCTAssertEqual(pixelSearch.map(\.profile.id), ["pixel_bar_1m"])
        XCTAssertEqual(ledSearch.map(\.profile.id), ["led_profile_rgbal"])
    }

    func testAddFixtureFromLibraryUsesSeedProfileAndRenumbersPosition() throws {
        let document = makeDocument()

        let updated = PlotToolModules.addFixtureFromLibrary(
            profileId: "robe_megapointe",
            to: document,
            positionId: "pos_front",
            xMm: 9_999,
            channel: 101,
            dmx: DmxAddress(universe: 2, address: 1),
            updatedAt: 42
        )
        let addedFixtureId = try XCTUnwrap(updated.fixtureOrder.last)
        let addedFixture = try XCTUnwrap(updated.fixtures[addedFixtureId])

        XCTAssertEqual(updated.updatedAt, 42)
        XCTAssertEqual(updated.fixtureOrder.count, document.fixtureOrder.count + 1)
        XCTAssertEqual(addedFixture.profileId, "robe_megapointe")
        XCTAssertEqual(addedFixture.xMm, 1_500)
        XCTAssertEqual(addedFixture.channel, 101)
        XCTAssertEqual(addedFixture.dmx, DmxAddress(universe: 2, address: 1))
        XCTAssertEqual(addedFixture.unitNumber, 4)
        XCTAssertEqual(updated.fixtures["fx_front"]?.unitNumber, 1)

        let ledProfileAdded = PlotToolModules.addFixtureFromLibrary(
            profileId: "led_profile_rgbal",
            to: document,
            positionId: "pos_front",
            updatedAt: 43
        )
        let ledFixtureId = try XCTUnwrap(ledProfileAdded.fixtureOrder.last)
        XCTAssertEqual(ledProfileAdded.fixtures[ledFixtureId]?.profileId, "led_profile_rgbal")
        XCTAssertEqual(ledProfileAdded.fixtures[ledFixtureId]?.dmx?.address, nil)
        XCTAssertEqual(ledProfileAdded.updatedAt, 43)

        let missing = PlotToolModules.addFixtureFromLibrary(
            profileId: "missing",
            to: document,
            positionId: "pos_front"
        )
        XCTAssertEqual(missing, document)
    }

    func testPatchRowsAndChecksReportConflictsAndIncompleteData() throws {
        let document = makeDocument()

        let dmxConflicts = PlotToolModules.patchConflicts(in: document)
        let channelConflicts = PlotToolModules.channelConflicts(in: document)
        let rows = PlotToolModules.patchTableRows(in: document)
        let checks = PlotToolModules.checkRows(in: document)

        XCTAssertEqual(dmxConflicts.count, 1)
        XCTAssertEqual(dmxConflicts.first?.universe, 1)
        XCTAssertEqual(dmxConflicts.first?.a.fixtureId, "fx_front")
        XCTAssertEqual(dmxConflicts.first?.b.fixtureId, "fx_front_dup")

        XCTAssertEqual(channelConflicts.count, 1)
        XCTAssertEqual(channelConflicts.first?.channel, 11)
        XCTAssertEqual(channelConflicts.first?.aFixtureId, "fx_front")
        XCTAssertEqual(channelConflicts.first?.bFixtureId, "fx_front_dup")

        let frontRow = try XCTUnwrap(rows.first { $0.id == "fx_front" })
        XCTAssertEqual(frontRow.positionName, "1ST ELEC")
        XCTAssertEqual(frontRow.profileName, "ETC Source Four 26 deg")
        XCTAssertEqual(frontRow.dmxRangeLabel, "U1 41-41")
        XCTAssertEqual(frontRow.conflictLabel, "DMX U1; channel 11")
        XCTAssertTrue(frontRow.hasDmxConflict)
        XCTAssertTrue(frontRow.hasChannelConflict)
        XCTAssertEqual(frontRow.notesLabel, "Color: R02 | Focus: Lectern | Crew: Warm front")
        XCTAssertEqual(frontRow.circuitLabel, "Circuit A1 / Dimmer D1")

        XCTAssertTrue(checks.contains { $0.kind == .dmx && $0.title == "DMX U1 overlap" })
        XCTAssertTrue(checks.contains { $0.kind == .channel && $0.title == "Channel 11 duplicate" })
        XCTAssertTrue(checks.contains { $0.kind == .circuit && $0.fixtureIds == ["fx_front_dup"] })
        XCTAssertTrue(checks.contains { $0.kind == .profile && $0.fixtureIds == ["fx_missing_profile"] })
    }

    func testLabelSummaryReportsVisibilityAndVariableSizes() {
        let summary = PlotToolModules.labelControlSummary(
            LabelSettings(
                fixtureUnitSize: 130,
                fixtureChannelSize: 95,
                positionLabelSize: 140,
                commentLabelSize: 80,
                focusLabelSize: 110,
                showFixtureUnit: true,
                showFixtureChannel: false,
                showPositionLabels: true,
                showCommentText: false,
                showFocusLabels: true
            )
        )

        XCTAssertEqual(summary.fixtureUnit, "On / 130%")
        XCTAssertEqual(summary.fixtureChannel, "Off / 95%")
        XCTAssertEqual(summary.position, "On / 140%")
        XCTAssertEqual(summary.comment, "Off / 80%")
        XCTAssertEqual(summary.focus, "On / 110%")
    }

    func testWizardPlanAppliesWithoutClearingExistingWork() throws {
        let document = makeDocument()
        let plan = PlotToolModules.buildWizardPlan(
            for: document,
            brief: "Concert in a 48x30 proscenium stage"
        )
        let result = PlotToolModules.applyWizardPlan(plan, to: document, updatedAt: 99)

        XCTAssertEqual(plan.productionType, "concert")
        XCTAssertEqual(plan.stageWidthMm, 14_630)
        XCTAssertEqual(result.document.updatedAt, 99)
        XCTAssertTrue(result.addedPositionIds.count >= 4)
        XCTAssertTrue(result.addedFixtureIds.count > 10)
        XCTAssertTrue(result.document.fixtureOrder.starts(with: document.fixtureOrder))
        XCTAssertNotNil(result.document.fixtures["fx_front"])

        let firstAdded = try XCTUnwrap(result.document.fixtures[result.addedFixtureIds[0]])
        XCTAssertGreaterThanOrEqual(firstAdded.channel ?? 0, 301)
        XCTAssertEqual(firstAdded.status, "planned")
        XCTAssertFalse(firstAdded.notes.focus.isEmpty)
        XCTAssertTrue(result.document.positions.keys.contains("ai_foh"))
    }

    private func makeDocument() -> PlotShowDocument {
        let position = Position(
            id: "pos_front",
            name: "1ST ELEC",
            yMm: 0,
            lengthMm: 3_000
        )
        let fixtures = [
            Fixture(
                id: "fx_front",
                positionId: position.id,
                profileId: "s4_26",
                xMm: -500,
                unitNumber: 1,
                channel: 11,
                dmx: DmxAddress(universe: 1, address: 41),
                color: "R02",
                note: "Warm front",
                notes: FixtureNotes(color: "R02", focus: "Lectern", crew: "Warm front"),
                status: "patched",
                circuit: "A1",
                dimmer: "D1"
            ),
            Fixture(
                id: "fx_front_dup",
                positionId: position.id,
                profileId: "s4_26",
                xMm: 0,
                unitNumber: 2,
                channel: 11,
                dmx: DmxAddress(universe: 1, address: 41),
                color: "R02",
                status: "planned",
                circuit: "A2",
                dimmer: ""
            ),
            Fixture(
                id: "fx_missing_profile",
                positionId: position.id,
                profileId: "missing_profile",
                xMm: 500,
                unitNumber: 3,
                channel: 22,
                dmx: nil,
                status: "planned",
                circuit: "",
                dimmer: ""
            ),
        ]

        return PlotShowDocument(
            version: plotDocumentVersion,
            id: "show_tools",
            name: "Tool Modules",
            createdAt: 1,
            updatedAt: 1,
            venue: Venue(stageWidthMm: 10_973, stageDepthMm: 6_706, proscWidthMm: 9_144),
            positions: [position.id: position],
            positionOrder: [position.id],
            fixtures: Dictionary(uniqueKeysWithValues: fixtures.map { ($0.id, $0) }),
            fixtureOrder: fixtures.map(\.id)
        )
    }
}
