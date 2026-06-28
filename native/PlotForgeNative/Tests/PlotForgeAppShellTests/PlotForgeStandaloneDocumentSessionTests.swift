@testable import PlotForgeAppShell
import PlotForgeCore
import PlotForgeDocumentUI
import XCTest

final class PlotForgeStandaloneDocumentSessionTests: XCTestCase {
    func testSessionTracksNewOpenEditAndSaveStates() throws {
        var session = PlotForgeStandaloneDocumentSession()

        XCTAssertEqual(session.fileState, .new)
        XCTAssertEqual(session.fileStatus, "New plot")
        XCTAssertEqual(session.exportFilename, "untitled-show.plot")

        let data = try PlotDocumentCodec.encode(
            PlotShowDocument(id: "show_road", name: "Road Show")
        )
        try session.openDocument(data: data, filename: "road-show.plot")

        XCTAssertEqual(session.document.show.name, "Road Show")
        XCTAssertEqual(session.fileState, .opened(filename: "road-show.plot"))
        XCTAssertEqual(session.fileStatus, "Opened road-show.plot")
        XCTAssertEqual(session.exportFilename, "road-show.plot")

        var edited = session.document
        edited.show.metadata.drawingTitle = "Updated Plot"
        session.updateDocument(edited)

        XCTAssertEqual(session.fileState, .edited(filename: "road-show.plot"))
        XCTAssertEqual(session.fileStatus, "Unsaved changes to road-show.plot")
        XCTAssertEqual(try PlotDocumentCodec.decode(session.exportData()).metadata.drawingTitle, "Updated Plot")

        session.noteSaved(filename: "road-show-rev-a.plot")

        XCTAssertEqual(session.fileState, .saved(filename: "road-show-rev-a.plot"))
        XCTAssertEqual(session.fileStatus, "Saved road-show-rev-a.plot")

        edited = session.document
        edited.show.metadata.revision = "A"
        session.updateDocument(edited)

        XCTAssertEqual(session.fileState, .edited(filename: "road-show-rev-a.plot"))
        XCTAssertEqual(session.fileStatus, "Unsaved changes to road-show-rev-a.plot")
    }

    func testNewDocumentResetsDirtySessionToStarterPlot() throws {
        var session = PlotForgeStandaloneDocumentSession()
        var edited = session.document
        edited.show.name = "Dirty Draft"
        session.updateDocument(edited)

        XCTAssertEqual(session.fileStatus, "Unsaved new plot")

        session.newDocument()

        XCTAssertEqual(session.fileState, .new)
        XCTAssertEqual(session.fileStatus, "New plot")
        XCTAssertEqual(session.document.show.name, "Untitled Show")
        XCTAssertEqual(session.document.show.positionOrder, ["pos_1", "pos_2"])
        XCTAssertEqual(session.document.show.fixtureOrder, ["fx_1", "fx_2"])
    }

    func testFailedOpenKeepsCurrentDocumentAndState() throws {
        var session = PlotForgeStandaloneDocumentSession()
        var edited = session.document
        edited.show.name = "Protected Draft"
        session.updateDocument(edited)

        XCTAssertThrowsError(try session.openDocument(data: Data("not a plot".utf8), filename: "bad.plot"))
        XCTAssertEqual(session.document.show.name, "Protected Draft")
        XCTAssertEqual(session.fileState, .edited(filename: nil))
        XCTAssertEqual(session.fileStatus, "Unsaved new plot")
    }
}
