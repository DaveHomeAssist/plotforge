@testable import PlotForgeAppShell
import PlotForgeCore
import SwiftUI
import UniformTypeIdentifiers
import XCTest

final class NativeExportDocumentTests: XCTestCase {
    func testNativeExportDocumentWritesAllReportExportPayloads() throws {
        let document = makeDocument()
        let exports: [(PlotExportKind, UTType, Data)] = [
            (.plotPdf, .pdf, PlotNativeExports.plotPdfData(document, generatedAt: "2026-06-25T23:00:00Z")),
            (.patchCsv, .commaSeparatedText, PlotNativeExports.patchTableCsvData(document)),
            (.gelRollupCsv, .commaSeparatedText, PlotNativeExports.gelRollupCsvData(document)),
            (.circuitSummaryCsv, .commaSeparatedText, PlotNativeExports.circuitSummaryCsvData(document)),
            (.fixturePaperworkCsv, .commaSeparatedText, PlotNativeExports.fixturePaperworkCsvData(document)),
            (.oscBridgeJson, .json, try PlotNativeExports.oscBridgeManifestData(document, generatedAt: "2026-06-25T23:00:00Z")),
            (.interopManifestJson, .json, try PlotNativeExports.interopManifestData(document, generatedAt: "2026-06-25T23:00:00Z")),
            (.pdfReviewJson, .json, try PlotNativeExports.pdfReviewManifestData(document, generatedAt: "2026-06-25T23:00:00Z")),
        ]

        for (kind, _, data) in exports {
            let exportDocument = NativeExportDocument(data: data)
            let wrapper = exportDocument.regularFileWrapper()
            let written = try XCTUnwrap(wrapper.regularFileContents, "Missing export data for \(kind)")

            XCTAssertEqual(written, data)
            XCTAssertFalse(PlotNativeExports.filename(for: document, kind: kind).isEmpty)
        }
    }

    func testNativeExportDocumentExposesDataForExporterReadiness() throws {
        let data = Data("Unit,Position\n1,FOH\n".utf8)
        let exportDocument = NativeExportDocument(data: data)
        let wrapper = exportDocument.regularFileWrapper()

        XCTAssertEqual(exportDocument.data, data)
        XCTAssertEqual(wrapper.regularFileContents, data)
    }

    private func makeDocument() -> PlotShowDocument {
        let position = Position(id: "pos_foh", name: "FOH", kind: "foh", yMm: 1_000, lengthMm: 4_000, trimMm: 7_500)
        let fixture = Fixture(
            id: "fx_front",
            positionId: position.id,
            profileId: "s4_26",
            xMm: 0,
            focus: FocusPoint(xMm: 0, yMm: -1_200),
            unitNumber: 1,
            channel: 10,
            dmx: DmxAddress(universe: 1, address: 1),
            color: "R02",
            notes: FixtureNotes(color: "Warm front", focus: "Lectern", crew: "Check"),
            status: "patched",
            circuit: "A1",
            dimmer: "D1"
        )
        return PlotShowDocument(
            id: "show_export_doc",
            name: "Export Smoke",
            positions: [position.id: position],
            positionOrder: [position.id],
            fixtures: [fixture.id: fixture],
            fixtureOrder: [fixture.id]
        )
    }
}
