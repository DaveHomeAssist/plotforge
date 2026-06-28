import PlotForgeCore
import XCTest

final class PlotStarterDocumentTests: XCTestCase {
    func testStarterDocumentCreatesUsableNativeWorkspace() throws {
        let document = PlotShowDocument.starterDocument(timestamp: 1_782_345_600_000)

        XCTAssertEqual(document.version, plotDocumentVersion)
        XCTAssertEqual(document.name, "Untitled Show")
        XCTAssertEqual(document.positionOrder, ["pos_1", "pos_2"])
        XCTAssertEqual(document.fixtureOrder, ["fx_1", "fx_2"])
        XCTAssertEqual(document.positions["pos_1"]?.name, "1ST ELEC")
        XCTAssertEqual(document.fixtures["fx_1"]?.profileId, "s4_26")
        XCTAssertEqual(document.fixtures["fx_2"]?.status, "patched")
        XCTAssertEqual(document.fixtureProfiles["robe_megapointe"]?.dmxFootprint, 34)
        XCTAssertEqual(document.commentPinOrder, ["pin_1"])
        XCTAssertEqual(document.createdAt, 1_782_345_600_000)
        XCTAssertEqual(document.updatedAt, 1_782_345_600_000)

        let encoded = try PlotDocumentCodec.encode(document)
        let decoded = try PlotDocumentCodec.decode(encoded)

        XCTAssertEqual(decoded.positions, document.positions)
        XCTAssertEqual(decoded.fixtures, document.fixtures)
        XCTAssertEqual(decoded.fixtureProfiles, document.fixtureProfiles)
        XCTAssertEqual(decoded.commentPins, document.commentPins)
    }
}
