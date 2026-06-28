import PlotForgeCore
import XCTest

final class PlotDocumentEditingTests: XCTestCase {
    func testMoveFixtureSnapsClampsAndRenumbersPosition() {
        var document = makeDocument()
        document = PlotDocumentEditing.moveFixture(
            in: document,
            fixtureId: "fx_left",
            rawXMm: 520,
            updatedAt: 2
        )

        XCTAssertEqual(document.updatedAt, 2)
        XCTAssertEqual(document.fixtures["fx_left"]?.xMm, 500)
        XCTAssertEqual(document.fixtures["fx_mid"]?.unitNumber, 1)
        XCTAssertEqual(document.fixtures["fx_right"]?.unitNumber, 2)
        XCTAssertEqual(document.fixtures["fx_left"]?.unitNumber, 3)
    }

    func testMoveFixtureIgnoresMissingFixtureAndPosition() {
        let document = makeDocument()

        XCTAssertEqual(
            PlotDocumentEditing.moveFixture(in: document, fixtureId: "missing", rawXMm: 100),
            document
        )
    }

    func testNudgeFixtureMovesByOneSnapStepAndRenumbers() {
        var document = makeDocument()

        document = PlotDocumentEditing.nudgeFixture(
            in: document,
            fixtureId: "fx_mid",
            steps: 1,
            updatedAt: 4
        )

        XCTAssertEqual(document.updatedAt, 4)
        XCTAssertEqual(document.fixtures["fx_mid"]?.xMm, 25)
        XCTAssertEqual(document.fixtures["fx_left"]?.unitNumber, 1)
        XCTAssertEqual(document.fixtures["fx_mid"]?.unitNumber, 2)
        XCTAssertEqual(document.fixtures["fx_right"]?.unitNumber, 3)

        document = PlotDocumentEditing.nudgeFixture(
            in: document,
            fixtureId: "fx_mid",
            steps: -10,
            updatedAt: 5
        )

        XCTAssertEqual(document.updatedAt, 5)
        XCTAssertEqual(document.fixtures["fx_mid"]?.xMm, -229)
        XCTAssertEqual(document.fixtures["fx_mid"]?.unitNumber, 1)
        XCTAssertEqual(document.fixtures["fx_left"]?.unitNumber, 2)
        XCTAssertEqual(document.fixtures["fx_right"]?.unitNumber, 3)
    }

    func testRemoveFixtureRenumbersRemainingFixtures() {
        var document = makeDocument()
        document = PlotDocumentEditing.removeFixture(
            from: document,
            fixtureId: "fx_mid",
            updatedAt: 3
        )

        XCTAssertEqual(document.updatedAt, 3)
        XCTAssertNil(document.fixtures["fx_mid"])
        XCTAssertEqual(document.fixtureOrder, ["fx_left", "fx_right"])
        XCTAssertEqual(document.fixtures["fx_left"]?.unitNumber, 1)
        XCTAssertEqual(document.fixtures["fx_right"]?.unitNumber, 2)
    }

    func testSelectionSelectsTogglesClearsAndPrunes() {
        var selection = PlotCanvasSelection()

        selection.selectFixture("fx_left")
        XCTAssertEqual(selection.primaryFixtureId, "fx_left")
        XCTAssertEqual(selection.fixtureIds, ["fx_left"])

        selection.selectFixture("fx_right", additive: true)
        XCTAssertEqual(selection.fixtureIds, ["fx_left", "fx_right"])

        selection.selectFixture("fx_left", additive: true)
        XCTAssertEqual(selection.fixtureIds, ["fx_right"])

        selection.prune(toAvailable: ["fx_left"])
        XCTAssertTrue(selection.isEmpty)

        selection.selectFixture("fx_mid")
        selection.clear()
        XCTAssertTrue(selection.isEmpty)
    }

    func testSelectionNavigatesFixtureOrderAndSelectsAllFixtures() {
        var selection = PlotCanvasSelection()
        let order = ["fx_left", "fx_mid", "fx_right"]

        selection.selectAdjacentFixture(in: order, direction: 1)
        XCTAssertEqual(selection.fixtureIds, ["fx_left"])

        selection.selectAdjacentFixture(in: order, direction: 1)
        XCTAssertEqual(selection.fixtureIds, ["fx_mid"])

        selection.selectAdjacentFixture(in: order, direction: -1, extending: true)
        XCTAssertEqual(selection.fixtureIds, ["fx_mid", "fx_left"])

        selection.selectAllFixtures(in: order)
        XCTAssertEqual(selection.fixtureIds, order)

        selection.selectAdjacentFixture(in: order, direction: -1)
        XCTAssertEqual(selection.fixtureIds, ["fx_right"])
    }

    func testHistoryRecordsUndoAndRedo() {
        let original = makeDocument()
        let moved = PlotDocumentEditing.moveFixture(
            in: original,
            fixtureId: "fx_left",
            rawXMm: 520,
            updatedAt: 2
        )
        var history = PlotDocumentHistory(limit: 2)

        history.record(previous: original, next: moved)

        XCTAssertTrue(history.canUndo)
        XCTAssertFalse(history.canRedo)

        let undone = history.undo(current: moved)
        XCTAssertEqual(undone, original)
        XCTAssertFalse(history.canUndo)
        XCTAssertTrue(history.canRedo)

        let redone = history.redo(current: original)
        XCTAssertEqual(redone, moved)
        XCTAssertTrue(history.canUndo)
        XCTAssertFalse(history.canRedo)
    }

    private func makeDocument() -> PlotShowDocument {
        let position = Position(
            id: "pos_main",
            name: "1ST ELEC",
            yMm: 0,
            lengthMm: 1_000
        )
        let fixtures = [
            Fixture(
                id: "fx_left",
                positionId: position.id,
                profileId: "s4_26",
                xMm: -200,
                unitNumber: 1
            ),
            Fixture(
                id: "fx_mid",
                positionId: position.id,
                profileId: "s4_26",
                xMm: 0,
                unitNumber: 2
            ),
            Fixture(
                id: "fx_right",
                positionId: position.id,
                profileId: "s4_26",
                xMm: 200,
                unitNumber: 3
            ),
        ]

        return PlotShowDocument(
            version: plotDocumentVersion,
            id: "show_editing",
            name: "Editing",
            createdAt: 1,
            updatedAt: 1,
            positions: [position.id: position],
            positionOrder: [position.id],
            fixtures: Dictionary(uniqueKeysWithValues: fixtures.map { ($0.id, $0) }),
            fixtureOrder: fixtures.map(\.id)
        )
    }
}
