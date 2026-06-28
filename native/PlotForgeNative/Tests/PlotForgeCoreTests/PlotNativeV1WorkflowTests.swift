import Foundation
import PlotForgeCore
import XCTest

final class PlotNativeV1WorkflowTests: XCTestCase {
    func testNativeV1WorkflowEditsSavesReopensAndExports() throws {
        var document = PlotShowDocument.starterDocument(timestamp: 1_000)
        let originalFixtureIds = Set(document.fixtureOrder)

        document = PlotToolModules.addFixtureFromLibrary(
            profileId: "led_profile_rgbal",
            to: document,
            positionId: "pos_1",
            xMm: 915,
            channel: 301,
            dmx: DmxAddress(universe: 3, address: 1),
            updatedAt: 2_000
        )

        let addedFixtureId = try XCTUnwrap(document.fixtureOrder.first { !originalFixtureIds.contains($0) })
        XCTAssertEqual(document.fixtures[addedFixtureId]?.profileId, "led_profile_rgbal")
        XCTAssertEqual(document.fixtures[addedFixtureId]?.channel, 301)

        let inspectorPatch = FixtureInspectorPatch(
            fields: [
                .channel,
                .universe,
                .address,
                .circuit,
                .dimmer,
                .color,
                .status,
                .colorNote,
                .focusNote,
                .note,
            ],
            channel: 111,
            dmx: DmxAddress(universe: 1, address: 50),
            circuit: "A9",
            dimmer: "D9",
            color: "R80",
            status: "patched",
            notes: FixtureNotes(color: "Cool front", focus: "Lead vocal", crew: "Check trim"),
            note: "Check trim"
        )
        document = PlotInspectorValidation.apply(
            patch: inspectorPatch,
            to: document,
            fixtureId: "fx_1",
            updatedAt: 3_000
        )

        document.labelSettings.showFixtureChannel = true
        document.labelSettings.fixtureChannelSize = 112
        document.labelSettings.positionLabelSize = 132
        document.updatedAt = 4_000

        let wizardPlan = PlotToolModules.buildWizardPlan(
            for: document,
            brief: "concert plot with FOH wash, backlight, specials, and moving looks"
        )
        let wizardResult = PlotToolModules.applyWizardPlan(wizardPlan, to: document, updatedAt: 5_000)
        document = wizardResult.document

        XCTAssertFalse(wizardResult.addedPositionIds.isEmpty)
        XCTAssertFalse(wizardResult.addedFixtureIds.isEmpty)
        XCTAssertNotNil(document.fixtures["fx_1"])
        XCTAssertNotNil(document.fixtures[addedFixtureId])

        let saved = try PlotDocumentCodec.encode(document)
        let reopened = try PlotDocumentCodec.decode(saved)

        XCTAssertEqual(reopened.version, plotDocumentVersion)
        XCTAssertEqual(reopened.fixtures["fx_1"]?.channel, 111)
        XCTAssertEqual(reopened.fixtures["fx_1"]?.dmx, DmxAddress(universe: 1, address: 50))
        XCTAssertEqual(reopened.fixtures["fx_1"]?.circuit, "A9")
        XCTAssertEqual(reopened.fixtures["fx_1"]?.dimmer, "D9")
        XCTAssertEqual(reopened.fixtures["fx_1"]?.color, "R80")
        XCTAssertEqual(reopened.fixtures["fx_1"]?.status, "patched")
        XCTAssertEqual(reopened.fixtures["fx_1"]?.notes.focus, "Lead vocal")
        XCTAssertEqual(reopened.fixtures[addedFixtureId]?.profileId, "led_profile_rgbal")
        XCTAssertEqual(reopened.labelSettings.showFixtureChannel, true)
        XCTAssertEqual(reopened.labelSettings.fixtureChannelSize, 112)
        XCTAssertEqual(reopened.labelSettings.positionLabelSize, 132)
        XCTAssertGreaterThan(reopened.fixtureOrder.count, 3)

        let patchRows = PlotToolModules.patchTableRows(in: reopened)
        XCTAssertTrue(patchRows.contains { $0.id == "fx_1" && $0.channel == 111 })
        XCTAssertTrue(patchRows.contains { $0.id == addedFixtureId && $0.profileName.contains("Generic LED Profile") })

        let artifacts = try PlotNativeExports.smokeExportArtifacts(
            reopened,
            generatedAt: "2026-06-26T05:55:00Z"
        )
        XCTAssertEqual(artifacts.count, 9)
        XCTAssertTrue(artifacts.allSatisfy { !$0.filename.isEmpty && !$0.data.isEmpty })

        let filenames = Set(artifacts.map(\.filename))
        XCTAssertTrue(filenames.contains(PlotNativeExports.plotDocumentFilename(for: reopened)))
        XCTAssertTrue(filenames.contains(PlotNativeExports.filename(for: reopened, kind: .plotPdf)))
        XCTAssertTrue(filenames.contains(PlotNativeExports.filename(for: reopened, kind: .pdfReviewJson)))
        XCTAssertTrue(filenames.contains(PlotNativeExports.filename(for: reopened, kind: .patchCsv)))
        XCTAssertTrue(filenames.contains(PlotNativeExports.filename(for: reopened, kind: .oscBridgeJson)))
        XCTAssertTrue(filenames.contains(PlotNativeExports.filename(for: reopened, kind: .interopManifestJson)))

        let pdf = try XCTUnwrap(artifacts.first { $0.filename.hasSuffix("-plot.pdf") })
        let pdfText = try XCTUnwrap(String(data: pdf.data, encoding: .utf8))
        XCTAssertTrue(pdfText.hasPrefix("%PDF-1.4"))
        XCTAssertTrue(pdfText.contains("/MediaBox [0 0 2448 1584]"))

        let review = try XCTUnwrap(artifacts.first { $0.filename.hasSuffix("-pdf-review.json") })
        let reviewJson = try XCTUnwrap(String(data: review.data, encoding: .utf8))
        XCTAssertTrue(reviewJson.contains("\"kind\" : \"plotforge-pdf-review\""))
        XCTAssertTrue(reviewJson.contains("\"physicalSignoff\" : \"pending\""))

        let interop = try XCTUnwrap(artifacts.first { $0.filename.hasSuffix("-interop-manifest.json") })
        let interopJson = try XCTUnwrap(String(data: interop.data, encoding: .utf8))
        XCTAssertTrue(interopJson.contains("\"kind\" : \"plotforge-interop-manifest\""))
        XCTAssertTrue(interopJson.contains("\"importParser\" : \"parked\""))
    }
}
