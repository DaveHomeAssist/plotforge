import PlotForgeCore
import XCTest

final class PlotNativeExportsTests: XCTestCase {
    func testDeterministicExportFilenames() {
        let document = makeExportDocument(name: "AT&T Dallas v2025")

        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .patchCsv), "at-t-dallas-v2025-patch.csv")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .gelRollupCsv), "at-t-dallas-v2025-gel-order.csv")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .circuitSummaryCsv), "at-t-dallas-v2025-circuit-summary.csv")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .fixturePaperworkCsv), "at-t-dallas-v2025-fixture-paperwork.csv")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .oscBridgeJson), "at-t-dallas-v2025-osc-bridge.json")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .interopManifestJson), "at-t-dallas-v2025-interop-manifest.json")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .pdfReviewJson), "at-t-dallas-v2025-pdf-review.json")
        XCTAssertEqual(PlotNativeExports.filename(for: document, kind: .plotPdf), "at-t-dallas-v2025-plot.pdf")
    }

    func testPatchCsvMatchesWebHeaderAndEscapesFields() {
        let csv = PlotNativeExports.patchTableCsv(makeExportDocument())
        let header = "Unit,Position,Profile,Mode,Status,Channel,Universe,Address,End Address,Footprint,Circuit,Dimmer,Color,Gobo,Color Note,Gobo Note,Focus Note,Crew Note,Conflicts"

        XCTAssertTrue(csv.hasPrefix(header + "\n"))
        XCTAssertTrue(csv.contains("1,FOH,ETC Source Four 26 deg,Default,Patched,10,1,1,1,1,A1,D1,R02,,Warm front,,Lectern,\"Needs, \"\"check\"\"\","))
        XCTAssertTrue(csv.contains("2,FOH,Robe Lighting Robin MegaPointe,Mode 1 - Standard 16 bit,Planned,20,2,1,39,39,,,R80,,Blue back,,Aerial,,"))
    }

    func testGelCircuitAndFixturePaperworkCsvsMatchNativeContracts() {
        let document = makeExportDocument()
        let gelCsv = PlotNativeExports.gelRollupCsv(document)
        let circuitCsv = PlotNativeExports.circuitSummaryCsv(document)
        let paperworkCsv = PlotNativeExports.fixturePaperworkCsv(document)
        let circuitSummary = PlotNativeExports.circuitSummary(in: document)

        XCTAssertTrue(gelCsv.hasPrefix("Gel,Count,Fixtures,Positions,Profiles\n"))
        XCTAssertTrue(gelCsv.contains("R02,1,U1 FOH ch 10,FOH,ETC Source Four 26 deg"))
        XCTAssertTrue(gelCsv.contains("R80,1,U2 FOH ch 20,FOH,Robe Lighting Robin MegaPointe"))

        XCTAssertEqual(circuitSummary.totalFixtures, 2)
        XCTAssertEqual(circuitSummary.assignedCount, 1)
        XCTAssertEqual(circuitSummary.missingCount, 1)
        XCTAssertTrue(circuitCsv.hasPrefix("Circuit,Dimmer,Fixtures,Shared,Partial\n"))
        XCTAssertTrue(circuitCsv.contains("A1,D1,U1 FOH ch 10 Source Four 26 deg,no,no"))

        XCTAssertTrue(paperworkCsv.hasPrefix("Unit,Position,Profile,Manufacturer,Model,Mode,Channel,Universe,Address,Footprint,Status,Circuit,Dimmer,Color,Gobo,Focus X,Focus Y,Color Note,Gobo Note,Focus Note,Crew Note\n"))
        XCTAssertTrue(paperworkCsv.contains("1,FOH,ETC Source Four 26 deg,ETC,Source Four 26 deg,Default,10,1,1,1,patched,A1,D1,R02,,0,-1200,Warm front,,Lectern,\"Needs, \"\"check\"\"\""))
    }

    func testOscBridgeManifestMatchesRouteContract() throws {
        let document = makeExportDocument()
        let json = try PlotNativeExports.oscBridgeManifestJson(document, generatedAt: "2026-06-25T22:31:00Z")
        let manifest = try JSONDecoder().decode(PlotOscBridgeManifest.self, from: Data(json.utf8))

        XCTAssertEqual(manifest.schemaVersion, 1)
        XCTAssertEqual(manifest.kind, "plotforge-osc-bridge")
        XCTAssertEqual(manifest.generatedAt, "2026-06-25T22:31:00Z")
        XCTAssertEqual(manifest.bridge.namespace, "/show/main")
        XCTAssertEqual(manifest.transport.udpTarget.host, "10.0.0.5")
        XCTAssertEqual(manifest.transport.udpTarget.port, 9_000)
        XCTAssertEqual(manifest.routes.count, 7)

        let select = try XCTUnwrap(manifest.routes.first { $0.fixtureId == "fx_front" && $0.purpose == "select" })
        XCTAssertEqual(select.address, "/show/main/fixture/fx_front/select")
        XCTAssertEqual(select.args, [
            PlotOscRouteArg(type: "integer", value: .number(10)),
            PlotOscRouteArg(type: "string", value: .string("FOH U1")),
        ])

        let focus = try XCTUnwrap(manifest.routes.first { $0.fixtureId == "fx_front" && $0.purpose == "focus" })
        XCTAssertEqual(focus.args, [
            PlotOscRouteArg(type: "integer", value: .number(0)),
            PlotOscRouteArg(type: "integer", value: .number(-1_200)),
        ])
    }

    func testInteropManifestCarriesFixturePaperworkAndMvrDisposition() throws {
        let document = makeExportDocument()
        let json = try PlotNativeExports.interopManifestJson(document, generatedAt: "2026-06-25T22:32:00Z")
        let manifest = try JSONDecoder().decode(PlotInteropManifest.self, from: Data(json.utf8))

        XCTAssertEqual(manifest.schemaVersion, 1)
        XCTAssertEqual(manifest.kind, "plotforge-interop-manifest")
        XCTAssertEqual(manifest.generatedAt, "2026-06-25T22:32:00Z")
        XCTAssertEqual(manifest.positions.map(\.name), ["FOH"])
        XCTAssertEqual(manifest.commentPins.map(\.text), ["Door note"])
        XCTAssertEqual(manifest.mvr.importParser, "parked")
        XCTAssertEqual(manifest.mvr.blocker, PlotNativeExports.mvrCorpusBlocker)

        let front = try XCTUnwrap(manifest.fixtures.first { $0.id == "fx_front" })
        XCTAssertEqual(front.mvrName, "FOH U1")
        XCTAssertEqual(front.profileName, "ETC Source Four 26 deg")
        XCTAssertEqual(front.dmx, DmxAddress(universe: 1, address: 1))
        XCTAssertEqual(front.focus, PlotInteropFocus(xMm: 0, yMm: -1_200))
        XCTAssertEqual(front.notes.crew, "Needs, \"check\"")

        let mover = try XCTUnwrap(manifest.fixtures.first { $0.id == "fx_mover" })
        XCTAssertEqual(mover.gdtf["type"], .string("gdtf-share"))
        XCTAssertEqual(mover.dmxFootprint, 39)
    }

    func testPlotPdfDataIsDeterministicVectorPayload() throws {
        let data = PlotNativeExports.plotPdfData(
            makeExportDocument(),
            generatedAt: "2026-06-25T22:33:00Z"
        )
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))

        XCTAssertTrue(text.hasPrefix("%PDF-1.4"))
        XCTAssertTrue(text.contains("/MediaBox [0 0 2448 1584]"))
        XCTAssertTrue(text.contains("Title block"))
        XCTAssertTrue(text.contains("Fixture legend"))
        XCTAssertTrue(text.contains("Focus 1"))
        XCTAssertTrue(text.contains("Comment 1: Door note"))
        XCTAssertTrue(text.contains("Patch: Patch clear"))
        XCTAssertTrue(text.hasSuffix("%%EOF\n"))
    }

    func testPdfReviewManifestCapturesPhysicalSignoffChecklist() throws {
        let document = makeExportDocument()
        let json = try PlotNativeExports.pdfReviewManifestJson(document, generatedAt: "2026-06-25T22:33:00Z")
        let manifest = try JSONDecoder().decode(PlotPdfReviewManifest.self, from: Data(json.utf8))

        XCTAssertEqual(manifest.schemaVersion, 1)
        XCTAssertEqual(manifest.kind, "plotforge-pdf-review")
        XCTAssertEqual(manifest.generatedAt, "2026-06-25T22:33:00Z")
        XCTAssertEqual(manifest.paper.id, "ansi_d")
        XCTAssertEqual(manifest.paper.mediaBoxPoints, [0, 0, 2448, 1584])
        XCTAssertEqual(manifest.drawingTitle, "Export Test Plot")
        XCTAssertEqual(manifest.scaleLabel, "1/4\" = 1'-0\"")
        XCTAssertEqual(manifest.content.positions, 1)
        XCTAssertEqual(manifest.content.fixtures, 2)
        XCTAssertEqual(manifest.content.fixtureProfiles, 2)
        XCTAssertEqual(manifest.content.focusBeams, 1)
        XCTAssertEqual(manifest.content.commentPins, 1)
        XCTAssertEqual(manifest.content.patchStatus, "Patch clear")
        XCTAssertTrue(manifest.content.includesTitleBlock)
        XCTAssertTrue(manifest.content.includesFixtureLegend)
        XCTAssertTrue(manifest.content.includesStageFrame)
        XCTAssertEqual(manifest.physicalSignoff, "pending")
        XCTAssertTrue(manifest.evidenceRequired.contains { $0.contains("Capture screenshot or print proof") })
    }

    func testSmokeExportArtifactsWriteEverySupportedNativeExport() throws {
        let document = makeExportDocument(name: "Smoke Show")
        let artifacts = try PlotNativeExports.smokeExportArtifacts(document, generatedAt: "2026-06-25T22:36:00Z")

        XCTAssertEqual(artifacts.map(\.filename), [
            "smoke-show.plot",
            "smoke-show-plot.pdf",
            "smoke-show-pdf-review.json",
            "smoke-show-patch.csv",
            "smoke-show-gel-order.csv",
            "smoke-show-circuit-summary.csv",
            "smoke-show-fixture-paperwork.csv",
            "smoke-show-osc-bridge.json",
            "smoke-show-interop-manifest.json",
        ])
        XCTAssertTrue(artifacts.allSatisfy { !$0.data.isEmpty })

        let review = try XCTUnwrap(artifacts.first { $0.filename == "smoke-show-pdf-review.json" })
        let reviewManifest = try JSONDecoder().decode(PlotPdfReviewManifest.self, from: review.data)
        XCTAssertEqual(reviewManifest.generatedAt, "2026-06-25T22:36:00Z")
        XCTAssertEqual(reviewManifest.physicalSignoff, "pending")

        let plot = try XCTUnwrap(artifacts.first { $0.filename == "smoke-show.plot" })
        let decoded = try PlotDocumentCodec.decode(plot.data)
        XCTAssertEqual(decoded.name, "Smoke Show")
    }

    func testEmptyAndMalformedDocumentsExportSafely() throws {
        let empty = PlotShowDocument(id: "empty", name: "")
        let emptyCsv = PlotNativeExports.patchTableCsv(empty)
        let emptyGelCsv = PlotNativeExports.gelRollupCsv(empty)
        let emptyCircuitCsv = PlotNativeExports.circuitSummaryCsv(empty)
        let emptyPaperworkCsv = PlotNativeExports.fixturePaperworkCsv(empty)
        let emptyOsc = PlotNativeExports.oscBridgeManifest(empty, generatedAt: "2026-06-25T22:34:00Z")
        let emptyPdf = PlotNativeExports.plotPdfData(empty, generatedAt: "2026-06-25T22:34:00Z")
        let emptyReview = PlotNativeExports.pdfReviewManifest(empty, generatedAt: "2026-06-25T22:34:00Z")

        XCTAssertEqual(emptyCsv.split(separator: "\n").count, 1)
        XCTAssertEqual(emptyGelCsv.split(separator: "\n").count, 1)
        XCTAssertEqual(emptyCircuitCsv.split(separator: "\n").count, 1)
        XCTAssertEqual(emptyPaperworkCsv.split(separator: "\n").count, 1)
        XCTAssertEqual(emptyOsc.routes, [])
        XCTAssertGreaterThan(emptyPdf.count, 500)
        XCTAssertEqual(emptyReview.content.fixtures, 0)
        XCTAssertEqual(emptyReview.physicalSignoff, "pending")

        let malformed = makeMalformedDocument()
        let malformedCsv = PlotNativeExports.patchTableCsv(malformed)
        let malformedInterop = PlotNativeExports.interopManifest(malformed, generatedAt: "2026-06-25T22:35:00Z")
        let malformedOsc = PlotNativeExports.oscBridgeManifest(malformed, generatedAt: "2026-06-25T22:35:00Z")
        let malformedReview = PlotNativeExports.pdfReviewManifest(malformed, generatedAt: "2026-06-25T22:35:00Z")

        XCTAssertTrue(malformedCsv.contains("Unassigned,Unknown profile"))
        XCTAssertEqual(malformedInterop.fixtures.count, 1)
        XCTAssertEqual(malformedInterop.fixtures.first?.positionName, "Unassigned")
        XCTAssertEqual(malformedInterop.fixtures.first?.yMm, 0)
        XCTAssertEqual(malformedOsc.routes.count, 3)
        XCTAssertEqual(malformedOsc.routes.first?.label, "Unassigned No unit")
        XCTAssertEqual(malformedReview.content.fixtures, 1)
        XCTAssertEqual(malformedReview.content.focusBeams, 0)
    }

    private func makeExportDocument(name: String = "Native Export") -> PlotShowDocument {
        let position = Position(id: "pos_foh", name: "FOH", kind: "foh", yMm: 1_000, lengthMm: 4_000, trimMm: 7_500)
        let fixtures = [
            Fixture(
                id: "fx_front",
                positionId: position.id,
                profileId: "s4_26",
                xMm: -600,
                focus: FocusPoint(xMm: 0, yMm: -1_200),
                unitNumber: 1,
                channel: 10,
                dmx: DmxAddress(universe: 1, address: 1),
                color: "R02",
                notes: FixtureNotes(color: "Warm front", focus: "Lectern", crew: "Needs, \"check\""),
                status: "patched",
                circuit: "A1",
                dimmer: "D1"
            ),
            Fixture(
                id: "fx_mover",
                positionId: position.id,
                profileId: "robe_megapointe",
                xMm: 600,
                unitNumber: 2,
                channel: 20,
                dmx: DmxAddress(universe: 2, address: 1),
                color: "R80",
                notes: FixtureNotes(color: "Blue back", focus: "Aerial"),
                status: "planned"
            ),
        ]
        let comment = CommentPin(id: "comment_1", xMm: 900, yMm: -900, text: "Door note", createdAt: 1)

        return PlotShowDocument(
            version: plotDocumentVersion,
            id: "show_export",
            name: name,
            metadata: ProjectMetadata(
                drawingTitle: "Export Test Plot",
                venueName: "Studio B",
                company: "Dave Home Assist",
                designer: "Dave",
                draftsperson: "Codex",
                showDate: "2026-06-25",
                revision: "A"
            ),
            createdAt: 1,
            updatedAt: 2,
            venue: Venue(stageWidthMm: 10_973, stageDepthMm: 6_706, proscWidthMm: 9_144),
            positions: [position.id: position],
            positionOrder: [position.id],
            fixtures: Dictionary(uniqueKeysWithValues: fixtures.map { ($0.id, $0) }),
            fixtureOrder: fixtures.map(\.id),
            commentPins: [comment.id: comment],
            commentPinOrder: [comment.id],
            oscBridge: OscBridgeSettings(namespace: "/Show/Main", targetHost: "10.0.0.5", targetPort: 9_000)
        )
    }

    private func makeMalformedDocument() -> PlotShowDocument {
        let fixture = Fixture(
            id: "fx_orphan",
            positionId: "missing_position",
            profileId: "missing_profile",
            xMm: 0
        )
        return PlotShowDocument(
            id: "malformed",
            name: "Malformed",
            fixtures: [fixture.id: fixture],
            fixtureOrder: ["missing_fixture", fixture.id]
        )
    }
}
