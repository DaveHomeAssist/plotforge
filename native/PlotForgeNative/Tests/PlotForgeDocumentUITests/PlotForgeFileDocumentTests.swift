import PlotForgeCore
import PlotForgeDocumentUI
import UniformTypeIdentifiers
import XCTest

final class PlotForgeFileDocumentTests: XCTestCase {
    func testContentTypesExposePlotFiles() {
        XCTAssertTrue(PlotForgeFileDocument.readableContentTypes.contains(.plotForgeDocument))
        XCTAssertTrue(PlotForgeFileDocument.readableContentTypes.contains(.json))
        XCTAssertTrue(PlotForgeFileDocument.writableContentTypes.contains(.plotForgeDocument))
    }

    func testDefaultDocumentCanBeCreatedForDocumentGroup() {
        let fileDocument = PlotForgeFileDocument()

        XCTAssertEqual(fileDocument.show.version, plotDocumentVersion)
        XCTAssertEqual(fileDocument.show.name, "Untitled Show")
        XCTAssertEqual(fileDocument.show.metadata.drawingTitle, "Lighting Plot")
        XCTAssertEqual(fileDocument.show.positionOrder, ["pos_1", "pos_2"])
        XCTAssertEqual(fileDocument.show.fixtureOrder, ["fx_1", "fx_2"])
        XCTAssertEqual(fileDocument.show.fixtureProfiles["s4_26"]?.manufacturer, "ETC")
    }

    func testDocumentWrapperKeepsShowModel() {
        let show = PlotShowDocument(id: "show_test", name: "Wrapped")
        let fileDocument = PlotForgeFileDocument(show: show)

        XCTAssertEqual(fileDocument.show.id, "show_test")
        XCTAssertEqual(fileDocument.show.name, "Wrapped")
    }

    func testFileDocumentReadsPlotData() throws {
        let data = try sampleData()
        let fileDocument = try PlotForgeFileDocument(data: data)

        XCTAssertEqual(fileDocument.show.version, plotDocumentVersion)
        XCTAssertEqual(fileDocument.show.name, "Native Port Sample")
        XCTAssertEqual(fileDocument.show.fixtureOrder, ["fx_1", "fx_2"])
    }

    func testFileDocumentWritesPlotData() throws {
        let show = PlotShowDocument(id: "show_write", name: "Writable")
        let fileDocument = PlotForgeFileDocument(show: show)

        let data = try fileDocument.fileData()
        let decoded = try PlotDocumentCodec.decode(data)

        XCTAssertEqual(decoded.version, plotDocumentVersion)
        XCTAssertEqual(decoded.id, "show_write")
        XCTAssertEqual(decoded.name, "Writable")
    }

    private func sampleData() throws -> Data {
        let source = #filePath
        let testDirectory = URL(fileURLWithPath: source).deletingLastPathComponent()
        let fixtureURL = testDirectory
            .deletingLastPathComponent()
            .appendingPathComponent("PlotForgeCoreTests/Fixtures/sample-v9.plot")
        return try Data(contentsOf: fixtureURL)
    }
}
