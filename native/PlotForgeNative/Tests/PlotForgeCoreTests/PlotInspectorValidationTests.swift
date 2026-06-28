import PlotForgeCore
import XCTest

final class PlotInspectorValidationTests: XCTestCase {
    func testDraftFromFixtureMatchesCommittedInspectorDisplay() {
        let fixture = Fixture(
            id: "fx_1",
            positionId: "pos_1",
            profileId: "s4_26",
            xMm: 1_067,
            channel: 11,
            dmx: DmxAddress(universe: 2, address: 101),
            color: "R02",
            note: "Warm front",
            notes: FixtureNotes(color: "R02", focus: "DS special"),
            status: "bad_status",
            circuit: " A1 ",
            dimmer: "D  11"
        )

        let draft = PlotInspectorValidation.draft(from: fixture)

        XCTAssertEqual(draft.x, "3'-6\"")
        XCTAssertEqual(draft.channel, "11")
        XCTAssertEqual(draft.universe, "2")
        XCTAssertEqual(draft.address, "101")
        XCTAssertEqual(draft.circuit, "A1")
        XCTAssertEqual(draft.dimmer, "D 11")
        XCTAssertEqual(draft.status, "planned")
        XCTAssertEqual(draft.colorNote, "R02")
        XCTAssertEqual(draft.focusNote, "DS special")
        XCTAssertEqual(draft.note, "Warm front")
    }

    func testInvalidNumericFieldBlocksOnlyItsOwnPatch() throws {
        let fixture = makeFixture()
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.channel = "abc"
        draft.color = "R26"

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )

        XCTAssertEqual(pending.errors[.channel], "Channel must be a whole number.")
        let patch = try XCTUnwrap(pending.patch)
        XCTAssertFalse(patch.fields.contains(.channel))
        XCTAssertEqual(patch.fields, [.color])
        XCTAssertEqual(patch.color, "R26")
    }

    func testDraftFieldUpdateAndNumericBumpUseCommittedFallbacks() {
        let fixture = makeFixture()
        let committed = PlotInspectorValidation.draft(from: fixture)
        var draft = committed
        draft.channel = "bad"

        draft = PlotInspectorValidation.updating(draft, field: .color, value: "R80")
        XCTAssertEqual(PlotInspectorValidation.value(for: .color, in: draft), "R80")

        let bumped = PlotInspectorValidation.bumpedNumericField(
            .channel,
            direction: 1,
            step: 10,
            draft: draft,
            committed: committed
        )

        XCTAssertEqual(bumped.channel, "21")
    }

    func testNumericBumpClampsToFieldLimits() {
        let fixture = makeFixture()
        let committed = PlotInspectorValidation.draft(from: fixture)
        var draft = committed
        draft.address = "512"
        draft.universe = "1"

        let address = PlotInspectorValidation.bumpedNumericField(
            .address,
            direction: 1,
            draft: draft,
            committed: committed
        )
        let universe = PlotInspectorValidation.bumpedNumericField(
            .universe,
            direction: -1,
            draft: draft,
            committed: committed
        )

        XCTAssertEqual(address.address, "512")
        XCTAssertEqual(universe.universe, "1")
    }

    func testDmxAddressRequiresUniverse() {
        let fixture = Fixture(
            id: "fx_1",
            positionId: "pos_1",
            profileId: "s4_26",
            xMm: 0
        )
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.address = "50"

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )

        XCTAssertEqual(pending.errors[.address], "Set universe before address.")
        XCTAssertNil(pending.patch)
    }

    func testClearingUniverseClearsAddress() throws {
        let fixture = makeFixture()
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.universe = ""

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )

        XCTAssertTrue(pending.errors.isEmpty)
        let patch = try XCTUnwrap(pending.patch)
        XCTAssertTrue(patch.fields.contains(.universe))
        XCTAssertNil(patch.dmx)
    }

    func testValidPatchAppliesAndPreservesFixtureIdentity() throws {
        let document = makeDocument()
        let fixture = try XCTUnwrap(document.fixtures["fx_1"])
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.x = "3 ft 6 in"
        draft.channel = ""
        draft.universe = "3"
        draft.address = "201"
        draft.circuit = " A7 "
        draft.dimmer = " D17 "
        draft.color = "R119"
        draft.status = "focused"
        draft.focusNote = "Chair special"
        draft.note = "Check shutter cut"

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )
        let patch = try XCTUnwrap(pending.patch)
        let updated = PlotInspectorValidation.apply(
            patch: patch,
            to: document,
            fixtureId: "fx_1",
            updatedAt: 77
        )
        let updatedFixture = try XCTUnwrap(updated.fixtures["fx_1"])

        XCTAssertTrue(pending.errors.isEmpty)
        XCTAssertEqual(updated.updatedAt, 77)
        XCTAssertEqual(updatedFixture.xMm, 1_067)
        XCTAssertNil(updatedFixture.channel)
        XCTAssertEqual(updatedFixture.dmx, DmxAddress(universe: 3, address: 201))
        XCTAssertEqual(updatedFixture.circuit, "A7")
        XCTAssertEqual(updatedFixture.dimmer, "D17")
        XCTAssertEqual(updatedFixture.color, "R119")
        XCTAssertEqual(updatedFixture.status, "focused")
        XCTAssertEqual(updatedFixture.notes.focus, "Chair special")
        XCTAssertEqual(updatedFixture.note, "Check shutter cut")
        XCTAssertEqual(updated.fixtureOrder, ["fx_1", "fx_2"])
    }

    func testUnknownStatusDraftNormalizesToPlannedWhenFixtureIsNotPlanned() throws {
        let fixture = Fixture(
            id: "fx_1",
            positionId: "pos_1",
            profileId: "s4_26",
            xMm: 0,
            status: "hung"
        )
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.status = "not_real"

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )

        let patch = try XCTUnwrap(pending.patch)
        XCTAssertEqual(patch.status, "planned")
    }

    func testInspectorStateClassifiesNoSelectionSingleMultiInvalidAndReadOnly() {
        let document = makeDocument()
        var selection = PlotCanvasSelection()

        XCTAssertEqual(
            PlotInspectorValidation.state(document: document, selection: selection),
            .noSelection(readOnly: false)
        )

        selection.selectFixture("fx_1")
        XCTAssertEqual(
            PlotInspectorValidation.state(document: document, selection: selection),
            .singleFixture(fixtureId: "fx_1", readOnly: false)
        )

        selection.selectFixture("fx_2", additive: true)
        XCTAssertEqual(
            PlotInspectorValidation.state(document: document, selection: selection, readOnly: true),
            .multiFixture(primaryFixtureId: "fx_1", selectedCount: 2, readOnly: true)
        )

        selection.selectFixture("missing", additive: true)
        XCTAssertEqual(
            PlotInspectorValidation.state(document: document, selection: selection),
            .invalidSelection(missingFixtureId: "missing", readOnly: false)
        )

        selection.clear()
        selection.selectFixture("missing")
        XCTAssertEqual(
            PlotInspectorValidation.state(document: document, selection: selection),
            .invalidSelection(missingFixtureId: "missing", readOnly: false)
        )
    }

    func testBatchSafePatchAppliesOnlySharedFieldsAcrossSelection() throws {
        let document = makeDocument()
        let fixture = try XCTUnwrap(document.fixtures["fx_1"])
        var draft = PlotInspectorValidation.draft(from: fixture)
        draft.x = "2'-0\""
        draft.channel = "44"
        draft.universe = "3"
        draft.address = "120"
        draft.color = "R80"
        draft.status = "focused"
        draft.focusNote = "Shared focus"
        draft.note = "Shared crew"

        let pending = PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft
        )
        let patch = try XCTUnwrap(pending.patch)
        let primaryUpdated = PlotInspectorValidation.apply(
            patch: patch,
            to: document,
            fixtureId: "fx_1",
            updatedAt: 10
        )
        let batchUpdated = PlotInspectorValidation.applyBatchSafe(
            patch: patch,
            to: primaryUpdated,
            fixtureIds: ["fx_2"],
            updatedAt: 11
        )
        let primary = try XCTUnwrap(batchUpdated.fixtures["fx_1"])
        let secondary = try XCTUnwrap(batchUpdated.fixtures["fx_2"])

        XCTAssertEqual(primary.xMm, 610)
        XCTAssertEqual(primary.channel, 44)
        XCTAssertEqual(primary.dmx, DmxAddress(universe: 3, address: 120))
        XCTAssertEqual(primary.color, "R80")
        XCTAssertEqual(primary.status, "focused")
        XCTAssertEqual(primary.notes.focus, "Shared focus")
        XCTAssertEqual(primary.note, "Shared crew")

        XCTAssertEqual(secondary.xMm, 381)
        XCTAssertEqual(secondary.channel, 22)
        XCTAssertEqual(secondary.dmx, DmxAddress(universe: 1, address: 81))
        XCTAssertEqual(secondary.color, "R80")
        XCTAssertEqual(secondary.status, "focused")
        XCTAssertEqual(secondary.notes.color, "Keep color note")
        XCTAssertEqual(secondary.notes.focus, "Shared focus")
        XCTAssertEqual(secondary.note, "Shared crew")
    }

    private func makeDocument() -> PlotShowDocument {
        let position = Position(
            id: "pos_1",
            name: "1ST ELEC",
            yMm: 0,
            lengthMm: 2_000
        )
        let fixture = makeFixture()
        let secondFixture = Fixture(
            id: "fx_2",
            positionId: "pos_1",
            profileId: "s4_26",
            xMm: 381,
            channel: 22,
            dmx: DmxAddress(universe: 1, address: 81),
            color: "R27",
            note: "Keep crew",
            notes: FixtureNotes(color: "Keep color note", focus: "Keep focus", crew: "Keep crew"),
            status: "hung",
            circuit: "A2",
            dimmer: "D22"
        )

        return PlotShowDocument(
            version: plotDocumentVersion,
            id: "show_inspector",
            name: "Inspector",
            createdAt: 1,
            updatedAt: 1,
            positions: [position.id: position],
            positionOrder: [position.id],
            fixtures: [
                fixture.id: fixture,
                secondFixture.id: secondFixture,
            ],
            fixtureOrder: [fixture.id, secondFixture.id]
        )
    }

    private func makeFixture() -> Fixture {
        Fixture(
            id: "fx_1",
            positionId: "pos_1",
            profileId: "s4_26",
            xMm: 0,
            channel: 11,
            dmx: DmxAddress(universe: 1, address: 41),
            color: "R02",
            note: "Warm front",
            notes: FixtureNotes(crew: "Warm front"),
            status: "planned",
            circuit: "A1",
            dimmer: "D11"
        )
    }
}
