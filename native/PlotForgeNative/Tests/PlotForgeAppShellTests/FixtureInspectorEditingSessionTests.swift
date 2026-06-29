@testable import PlotForgeAppShell
import PlotForgeCore
import XCTest

final class FixtureInspectorEditingSessionTests: XCTestCase {
    func testCommitPendingCommitsValidSiblingAndRevertsInvalidField() throws {
        var session = FixtureInspectorEditingSession(fixture: makeFixture())
        var committed: [FixtureInspectorPatch] = []

        session.setValue("abc", for: .channel)
        session.setValue("R26", for: .color)

        let didCommit = session.commitPending(
            revertingInvalidField: .channel,
            onCommit: { committed.append($0) }
        )

        XCTAssertTrue(didCommit)
        XCTAssertEqual(committed.count, 1)
        let patch = try XCTUnwrap(committed.first)
        XCTAssertEqual(patch.fields, [.color])
        XCTAssertEqual(patch.color, "R26")
        XCTAssertEqual(session.value(for: .channel), "11")
        XCTAssertNil(session.errors[.channel])
    }

    func testCommitPendingSkipsDuplicatePatchUntilDraftChangesAgain() {
        var session = FixtureInspectorEditingSession(fixture: makeFixture())
        var commitCount = 0

        session.setValue("R26", for: .color)

        XCTAssertTrue(session.commitPending { _ in commitCount += 1 })
        XCTAssertFalse(session.commitPending { _ in commitCount += 1 })

        session.setValue("R80", for: .color)

        XCTAssertTrue(session.commitPending { _ in commitCount += 1 })
        XCTAssertEqual(commitCount, 2)
    }

    func testRevertFieldRestoresCommittedValueAndClearsError() {
        var session = FixtureInspectorEditingSession(fixture: makeFixture())
        session.setValue("bad", for: .channel)

        XCTAssertEqual(session.errors[.channel], "Channel must be a whole number.")

        session.revertField(.channel)

        XCTAssertEqual(session.value(for: .channel), "11")
        XCTAssertNil(session.errors[.channel])
    }

    func testNextFieldFollowsInspectorFieldOrder() {
        let session = FixtureInspectorEditingSession(fixture: makeFixture())

        XCTAssertEqual(session.nextField(after: .x), .channel)
        XCTAssertEqual(session.nextField(after: .address), .circuit)
        XCTAssertNil(session.nextField(after: .note))
    }

    func testNumericStepCommitsAndClamps() throws {
        var session = FixtureInspectorEditingSession(fixture: makeFixture())
        var committed: [FixtureInspectorPatch] = []

        session.setValue("512", for: .address)
        XCTAssertTrue(session.bumpNumericField(.address, direction: 1) { committed.append($0) })

        let addressPatch = try XCTUnwrap(committed.last)
        XCTAssertEqual(session.value(for: .address), "512")
        XCTAssertEqual(addressPatch.dmx, DmxAddress(universe: 1, address: 512))

        XCTAssertFalse(session.bumpNumericField(.color, direction: 1) { committed.append($0) })

        var channelSession = FixtureInspectorEditingSession(fixture: makeFixture())
        var channelPatch: FixtureInspectorPatch?
        channelSession.setValue("bad", for: .channel)

        XCTAssertTrue(channelSession.bumpNumericField(.channel, direction: 1) { channelPatch = $0 })
        XCTAssertEqual(channelSession.value(for: .channel), "12")
        XCTAssertEqual(channelPatch?.channel, 12)
    }

    func testAddressValidationUsesFixtureFootprint() {
        var session = FixtureInspectorEditingSession(fixture: makeFixture(), dmxFootprint: 24)
        var committed: [FixtureInspectorPatch] = []

        session.setValue("512", for: .address)

        XCTAssertEqual(session.errors[.address], "Address must be 1 to 489.")
        XCTAssertFalse(session.commitPending { committed.append($0) })
        XCTAssertTrue(committed.isEmpty)
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
