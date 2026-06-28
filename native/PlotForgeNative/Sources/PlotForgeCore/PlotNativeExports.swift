import Foundation

public enum PlotExportKind: String, Sendable {
    case patchCsv
    case gelRollupCsv
    case circuitSummaryCsv
    case fixturePaperworkCsv
    case oscBridgeJson
    case interopManifestJson
    case pdfReviewJson
    case plotPdf
}

public struct PlotPdfPaper: Equatable, Sendable {
    public var id: String
    public var label: String
    public var widthIn: Double
    public var heightIn: Double

    public init(id: String, label: String, widthIn: Double, heightIn: Double) {
        self.id = id
        self.label = label
        self.widthIn = widthIn
        self.heightIn = heightIn
    }

    public var widthPoints: Double {
        widthIn * 72
    }

    public var heightPoints: Double {
        heightIn * 72
    }

    public static let ansiD = PlotPdfPaper(id: "ansi_d", label: "ANSI D", widthIn: 34, heightIn: 22)
    public static let tabloid = PlotPdfPaper(id: "tabloid", label: "Tabloid", widthIn: 17, heightIn: 11)
    public static let letter = PlotPdfPaper(id: "letter", label: "Letter", widthIn: 11, heightIn: 8.5)
}

public struct PlotNativeExportArtifact: Equatable, Sendable {
    public var label: String
    public var filename: String
    public var data: Data

    public init(label: String, filename: String, data: Data) {
        self.label = label
        self.filename = filename
        self.data = data
    }
}

public struct PlotOscRouteArg: Codable, Equatable, Sendable {
    public var type: String
    public var value: JSONValue

    public init(type: String, value: JSONValue) {
        self.type = type
        self.value = value
    }
}

public struct PlotOscRoute: Codable, Equatable, Sendable, Identifiable {
    public var id: String { "\(fixtureId)-\(purpose)" }
    public var fixtureId: String
    public var label: String
    public var channel: Int?
    public var targetHost: String
    public var targetPort: Int
    public var purpose: String
    public var address: String
    public var args: [PlotOscRouteArg]
}

public struct PlotOscTransport: Codable, Equatable, Sendable {
    public var browser: String
    public var relayScript: String
    public var udpTarget: PlotOscUdpTarget
}

public struct PlotOscUdpTarget: Codable, Equatable, Sendable {
    public var host: String
    public var port: Int
}

public struct PlotManifestShow: Codable, Equatable, Sendable {
    public var id: String
    public var name: String
    public var metadata: ProjectMetadata
}

public struct PlotOscBridgeManifest: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var kind: String
    public var generatedAt: String
    public var show: PlotManifestShow
    public var bridge: OscBridgeSettings
    public var transport: PlotOscTransport
    public var routes: [PlotOscRoute]
}

public struct PlotInteropFocus: Codable, Equatable, Sendable {
    public var xMm: Int
    public var yMm: Int

    public init(xMm: Int, yMm: Int) {
        self.xMm = xMm
        self.yMm = yMm
    }
}

public struct PlotInteropFixtureRow: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var mvrName: String
    public var positionId: String
    public var positionName: String
    public var unitNumber: Int?
    public var profileId: String
    public var profileName: String
    public var manufacturer: String
    public var model: String
    public var mode: String
    public var dmxFootprint: Int
    public var gdtf: [String: JSONValue]
    public var xMm: Int
    public var yMm: Int
    public var rotation: Double
    public var channel: Int?
    public var dmx: DmxAddress?
    public var color: String
    public var gobo: String
    public var status: String
    public var circuit: String
    public var dimmer: String
    public var focus: PlotInteropFocus?
    public var notes: FixtureNotes
}

public struct PlotMvrDisposition: Codable, Equatable, Sendable {
    public var importParser: String
    public var blocker: String
}

public struct PlotInteropManifest: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var kind: String
    public var generatedAt: String
    public var show: PlotManifestShow
    public var venue: Venue
    public var positions: [Position]
    public var fixtures: [PlotInteropFixtureRow]
    public var commentPins: [CommentPin]
    public var mvr: PlotMvrDisposition
}

public struct PlotPdfReviewPaper: Codable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var widthIn: Double
    public var heightIn: Double
    public var mediaBoxPoints: [Double]
}

public struct PlotPdfReviewContent: Codable, Equatable, Sendable {
    public var positions: Int
    public var fixtures: Int
    public var fixtureProfiles: Int
    public var focusBeams: Int
    public var commentPins: Int
    public var patchStatus: String
    public var includesTitleBlock: Bool
    public var includesFixtureLegend: Bool
    public var includesStageFrame: Bool
}

public struct PlotPdfReviewManifest: Codable, Equatable, Sendable {
    public var schemaVersion: Int
    public var kind: String
    public var generatedAt: String
    public var show: PlotManifestShow
    public var paper: PlotPdfReviewPaper
    public var drawingTitle: String
    public var scaleLabel: String
    public var content: PlotPdfReviewContent
    public var physicalSignoff: String
    public var evidenceRequired: [String]
}

public struct PlotGelRollupRow: Equatable, Sendable, Identifiable {
    public var id: String { code }
    public var code: String
    public var count: Int
    public var fixtureIds: [String]
    public var fixtureLabels: [String]
    public var profileLabels: [String]
    public var positionNames: [String]
}

public struct PlotCircuitSummaryRow: Equatable, Sendable, Identifiable {
    public var id: String { key }
    public var key: String
    public var circuit: String
    public var dimmer: String
    public var fixtureIds: [String]
    public var fixtureLabels: [String]
    public var isPartial: Bool
    public var isShared: Bool
}

public struct PlotCircuitSummary: Equatable, Sendable {
    public var totalFixtures: Int
    public var assignedCount: Int
    public var missingCount: Int
    public var partialCount: Int
    public var sharedCount: Int
    public var rows: [PlotCircuitSummaryRow]
    public var missingFixtureLabels: [String]
    public var partialFixtureLabels: [String]
}

public enum PlotNativeExports {
    public static let oscBridgeVersion = 1
    public static let interopManifestVersion = 1
    public static let mvrCorpusBlocker = "Vectorworks Spotlight 2024/2025/2026 .mvr test corpus required before locking import parser."

    public static func safeFileBase(_ value: String) -> String {
        var output = ""
        var lastWasSeparator = false

        for scalar in value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().unicodeScalars {
            let isLetter = scalar.value >= 97 && scalar.value <= 122
            let isNumber = scalar.value >= 48 && scalar.value <= 57
            if isLetter || isNumber {
                output.append(String(scalar))
                lastWasSeparator = false
            } else if !lastWasSeparator {
                output.append("-")
                lastWasSeparator = true
            }
        }

        let trimmed = output.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return trimmed.isEmpty ? "plotforge" : trimmed
    }

    public static func filename(for document: PlotShowDocument, kind: PlotExportKind) -> String {
        let base = safeFileBase(document.name)
        switch kind {
        case .patchCsv:
            return "\(base)-patch.csv"
        case .gelRollupCsv:
            return "\(base)-gel-order.csv"
        case .circuitSummaryCsv:
            return "\(base)-circuit-summary.csv"
        case .fixturePaperworkCsv:
            return "\(base)-fixture-paperwork.csv"
        case .oscBridgeJson:
            return "\(base)-osc-bridge.json"
        case .interopManifestJson:
            return "\(base)-interop-manifest.json"
        case .pdfReviewJson:
            return "\(base)-pdf-review.json"
        case .plotPdf:
            return "\(base)-plot.pdf"
        }
    }

    public static func plotDocumentFilename(for document: PlotShowDocument) -> String {
        "\(safeFileBase(document.name)).plot"
    }

    public static func patchTableCsv(_ document: PlotShowDocument) -> String {
        let header = [
            "Unit",
            "Position",
            "Profile",
            "Mode",
            "Status",
            "Channel",
            "Universe",
            "Address",
            "End Address",
            "Footprint",
            "Circuit",
            "Dimmer",
            "Color",
            "Gobo",
            "Color Note",
            "Gobo Note",
            "Focus Note",
            "Crew Note",
            "Conflicts",
        ]
        let body = PlotToolModules.patchTableRows(in: document).map { row in
            [
                row.unitNumber.map(String.init),
                row.positionName,
                row.profileName,
                row.mode,
                row.statusLabel,
                row.channel.map(String.init),
                row.universe.map(String.init),
                row.address.map(String.init),
                row.endAddress.map(String.init),
                String(row.footprint),
                row.circuit,
                row.dimmer,
                row.color,
                row.gobo,
                row.notes.color,
                row.notes.gobo,
                row.notes.focus,
                row.notes.crew,
                row.conflictLabel,
            ]
        }
        return ([header.map(Optional.some)] + body)
            .map { values in values.map(csvField).joined(separator: ",") }
            .joined(separator: "\n") + "\n"
    }

    public static func patchTableCsvData(_ document: PlotShowDocument) -> Data {
        Data(patchTableCsv(document).utf8)
    }

    public static func gelRollupRows(in document: PlotShowDocument) -> [PlotGelRollupRow] {
        var rows: [String: PlotGelRollupRow] = [:]

        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId] else { continue }
            for code in parseGelCodes(fixture.color) {
                var row = rows[code] ?? PlotGelRollupRow(
                    code: code,
                    count: 0,
                    fixtureIds: [],
                    fixtureLabels: [],
                    profileLabels: [],
                    positionNames: []
                )
                let position = document.positions[fixture.positionId]
                row.count += 1
                row.fixtureIds.append(fixture.id)
                row.fixtureLabels.append(gelFixtureLabel(document, fixture))
                row.profileLabels.append(profileDisplayName(PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)))
                if let positionName = position?.name,
                   !row.positionNames.contains(positionName) {
                    row.positionNames.append(positionName)
                }
                rows[code] = row
            }
        }

        return rows.values
            .map { row in
                var next = row
                next.positionNames.sort()
                return next
            }
            .sorted { compareGelCodes($0.code, $1.code) }
    }

    public static func gelRollupCsv(_ document: PlotShowDocument) -> String {
        let header = ["Gel", "Count", "Fixtures", "Positions", "Profiles"]
        let body = gelRollupRows(in: document).map { row in
            [
                row.code,
                String(row.count),
                row.fixtureLabels.joined(separator: "; "),
                row.positionNames.joined(separator: "; "),
                row.profileLabels.joined(separator: "; "),
            ]
        }

        return ([header.map(Optional.some)] + body)
            .map { values in values.map(csvField).joined(separator: ",") }
            .joined(separator: "\n") + "\n"
    }

    public static func gelRollupCsvData(_ document: PlotShowDocument) -> Data {
        Data(gelRollupCsv(document).utf8)
    }

    public static func circuitSummary(in document: PlotShowDocument) -> PlotCircuitSummary {
        let fixtures = sortedFixturesByPaperworkOrder(document)
        var groups: [String: PlotCircuitSummaryRow] = [:]
        var missingFixtureLabels: [String] = []
        var partialFixtureLabels: [String] = []

        for fixture in fixtures {
            let circuit = normalizedCircuitValue(fixture.circuit)
            let dimmer = normalizedCircuitValue(fixture.dimmer)
            let label = circuitFixtureLabel(document, fixture)
            if circuit.isEmpty && dimmer.isEmpty {
                missingFixtureLabels.append(label)
                continue
            }
            if circuit.isEmpty || dimmer.isEmpty {
                partialFixtureLabels.append(label)
            }

            let key = "\(dimmer.isEmpty ? "No dimmer" : dimmer)::\(circuit.isEmpty ? "No circuit" : circuit)"
            var row = groups[key] ?? PlotCircuitSummaryRow(
                key: key,
                circuit: circuit,
                dimmer: dimmer,
                fixtureIds: [],
                fixtureLabels: [],
                isPartial: circuit.isEmpty || dimmer.isEmpty,
                isShared: false
            )
            row.fixtureIds.append(fixture.id)
            row.fixtureLabels.append(label)
            row.isPartial = row.isPartial || circuit.isEmpty || dimmer.isEmpty
            row.isShared = row.fixtureIds.count > 1
            groups[key] = row
        }

        let rows = groups.values.sorted {
            let leftDimmer = $0.dimmer.isEmpty ? "ZZZ" : $0.dimmer
            let rightDimmer = $1.dimmer.isEmpty ? "ZZZ" : $1.dimmer
            if leftDimmer != rightDimmer {
                return leftDimmer.localizedStandardCompare(rightDimmer) == .orderedAscending
            }
            let leftCircuit = $0.circuit.isEmpty ? "ZZZ" : $0.circuit
            let rightCircuit = $1.circuit.isEmpty ? "ZZZ" : $1.circuit
            return leftCircuit.localizedStandardCompare(rightCircuit) == .orderedAscending
        }

        return PlotCircuitSummary(
            totalFixtures: fixtures.count,
            assignedCount: fixtures.count - missingFixtureLabels.count,
            missingCount: missingFixtureLabels.count,
            partialCount: partialFixtureLabels.count,
            sharedCount: rows.filter(\.isShared).count,
            rows: rows,
            missingFixtureLabels: missingFixtureLabels,
            partialFixtureLabels: partialFixtureLabels
        )
    }

    public static func circuitSummaryCsv(_ document: PlotShowDocument) -> String {
        let header = ["Circuit", "Dimmer", "Fixtures", "Shared", "Partial"]
        let body = circuitSummary(in: document).rows.map { row in
            [
                row.circuit,
                row.dimmer,
                row.fixtureLabels.joined(separator: "; "),
                row.isShared ? "yes" : "no",
                row.isPartial ? "yes" : "no",
            ]
        }

        return ([header.map(Optional.some)] + body)
            .map { values in values.map(csvField).joined(separator: ",") }
            .joined(separator: "\n") + "\n"
    }

    public static func circuitSummaryCsvData(_ document: PlotShowDocument) -> Data {
        Data(circuitSummaryCsv(document).utf8)
    }

    public static func fixturePaperworkCsv(_ document: PlotShowDocument) -> String {
        let header = [
            "Unit",
            "Position",
            "Profile",
            "Manufacturer",
            "Model",
            "Mode",
            "Channel",
            "Universe",
            "Address",
            "Footprint",
            "Status",
            "Circuit",
            "Dimmer",
            "Color",
            "Gobo",
            "Focus X",
            "Focus Y",
            "Color Note",
            "Gobo Note",
            "Focus Note",
            "Crew Note",
        ]
        let body: [[String?]] = interopFixtureRows(in: document).map { row in
            let unit = row.unitNumber.map(String.init)
            let channel = row.channel.map(String.init)
            let universe = row.dmx?.universe.map(String.init)
            let address = row.dmx?.address.map(String.init)
            let focusX = row.focus.map { String($0.xMm) }
            let focusY = row.focus.map { String($0.yMm) }
            return [
                unit,
                row.positionName,
                row.profileName,
                row.manufacturer,
                row.model,
                row.mode,
                channel,
                universe,
                address,
                String(row.dmxFootprint),
                row.status,
                row.circuit,
                row.dimmer,
                row.color,
                row.gobo,
                focusX,
                focusY,
                row.notes.color,
                row.notes.gobo,
                row.notes.focus,
                row.notes.crew,
            ]
        }

        return ([header.map(Optional.some)] + body)
            .map { values in values.map(csvField).joined(separator: ",") }
            .joined(separator: "\n") + "\n"
    }

    public static func fixturePaperworkCsvData(_ document: PlotShowDocument) -> Data {
        Data(fixturePaperworkCsv(document).utf8)
    }

    public static func normalizedOscBridgeSettings(_ settings: OscBridgeSettings) -> OscBridgeSettings {
        var next = settings
        next.version = oscBridgeVersion
        next.namespace = normalizeOscNamespace(settings.namespace)
        next.relayUrl = settings.relayUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "ws://127.0.0.1:8765"
            : settings.relayUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        next.targetHost = settings.targetHost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "127.0.0.1"
            : settings.targetHost.trimmingCharacters(in: .whitespacesAndNewlines)
        if next.targetPort <= 0 || next.targetPort > 65_535 {
            next.targetPort = 8_000
        }
        next.consoleProfile = settings.consoleProfile.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? "generic"
            : settings.consoleProfile.trimmingCharacters(in: .whitespacesAndNewlines)
        return next
    }

    public static func oscBridgeRoutes(
        in document: PlotShowDocument,
        bridge: OscBridgeSettings? = nil
    ) -> [PlotOscRoute] {
        let settings = normalizedOscBridgeSettings(bridge ?? document.oscBridge)
        let focusRows = Dictionary(uniqueKeysWithValues: focusBeamRows(in: document).map { ($0.fixtureId, $0) })

        return document.fixtureOrder
            .compactMap { document.fixtures[$0] }
            .flatMap { fixture -> [PlotOscRoute] in
                let profile = PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)
                let label = fixtureLabel(document, fixture)
                let base = "\(settings.namespace)/fixture/\(cleanOscSegment(fixture.id, fallback: "fixture"))"
                let common = (
                    fixtureId: fixture.id,
                    label: label,
                    channel: fixture.channel,
                    targetHost: settings.targetHost,
                    targetPort: settings.targetPort
                )
                var routes = [
                    PlotOscRoute(
                        fixtureId: common.fixtureId,
                        label: common.label,
                        channel: common.channel,
                        targetHost: common.targetHost,
                        targetPort: common.targetPort,
                        purpose: "select",
                        address: "\(base)/select",
                        args: [
                            .integer(fixture.channel ?? 0),
                            .string(label),
                        ]
                    ),
                    PlotOscRoute(
                        fixtureId: common.fixtureId,
                        label: common.label,
                        channel: common.channel,
                        targetHost: common.targetHost,
                        targetPort: common.targetPort,
                        purpose: "patch",
                        address: "\(base)/patch",
                        args: [
                            .integer(fixture.dmx?.universe ?? 0),
                            .integer(fixture.dmx?.address ?? 0),
                            .integer(max(1, profile?.dmxFootprint ?? 1)),
                        ]
                    ),
                    PlotOscRoute(
                        fixtureId: common.fixtureId,
                        label: common.label,
                        channel: common.channel,
                        targetHost: common.targetHost,
                        targetPort: common.targetPort,
                        purpose: "status",
                        address: "\(base)/status",
                        args: [
                            .string(fixture.status.isEmpty ? "planned" : fixture.status),
                        ]
                    ),
                ]

                if let focus = focusRows[fixture.id] {
                    routes.append(
                        PlotOscRoute(
                            fixtureId: common.fixtureId,
                            label: common.label,
                            channel: common.channel,
                            targetHost: common.targetHost,
                            targetPort: common.targetPort,
                            purpose: "focus",
                            address: "\(base)/focus",
                            args: [
                                .integer(focus.toX),
                                .integer(focus.toY),
                            ]
                        )
                    )
                }

                return routes
            }
    }

    public static func oscBridgeManifest(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) -> PlotOscBridgeManifest {
        let settings = normalizedOscBridgeSettings(document.oscBridge)
        return PlotOscBridgeManifest(
            schemaVersion: oscBridgeVersion,
            kind: "plotforge-osc-bridge",
            generatedAt: generatedAt,
            show: manifestShow(document),
            bridge: settings,
            transport: PlotOscTransport(
                browser: "websocket",
                relayScript: "npm run osc:relay",
                udpTarget: PlotOscUdpTarget(host: settings.targetHost, port: settings.targetPort)
            ),
            routes: oscBridgeRoutes(in: document, bridge: settings)
        )
    }

    public static func oscBridgeManifestJson(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> String {
        try jsonString(oscBridgeManifest(document, generatedAt: generatedAt))
    }

    public static func oscBridgeManifestData(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> Data {
        Data(try oscBridgeManifestJson(document, generatedAt: generatedAt).utf8)
    }

    public static func interopFixtureRows(in document: PlotShowDocument) -> [PlotInteropFixtureRow] {
        let focusRows = Dictionary(uniqueKeysWithValues: focusBeamRows(in: document).map { ($0.fixtureId, $0) })
        return document.fixtureOrder
            .compactMap { document.fixtures[$0] }
            .map { fixture in
                let profile = PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)
                let position = document.positions[fixture.positionId]
                let focus = focusRows[fixture.id]
                let positionName = position?.name ?? "Unassigned"
                let unit = fixture.unitNumber.map { "U\($0)" } ?? "No unit"
                return PlotInteropFixtureRow(
                    id: fixture.id,
                    mvrName: "\(positionName) \(unit)",
                    positionId: fixture.positionId,
                    positionName: positionName,
                    unitNumber: fixture.unitNumber,
                    profileId: fixture.profileId,
                    profileName: profileDisplayName(profile),
                    manufacturer: profile?.manufacturer ?? "",
                    model: profile?.model ?? "",
                    mode: profile?.defaultMode ?? "Default",
                    dmxFootprint: max(1, profile?.dmxFootprint ?? 1),
                    gdtf: profileSource(profile),
                    xMm: fixture.xMm,
                    yMm: position?.yMm ?? 0,
                    rotation: fixture.rotation,
                    channel: fixture.channel,
                    dmx: fixture.dmx,
                    color: fixture.color,
                    gobo: fixture.gobo,
                    status: fixture.status.isEmpty ? "planned" : fixture.status,
                    circuit: fixture.circuit,
                    dimmer: fixture.dimmer,
                    focus: focus.map { PlotInteropFocus(xMm: $0.toX, yMm: $0.toY) },
                    notes: PlotInspectorValidation.normalizedNotes(fixture.notes, legacyNote: fixture.note)
                )
            }
    }

    public static func interopManifest(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) -> PlotInteropManifest {
        PlotInteropManifest(
            schemaVersion: interopManifestVersion,
            kind: "plotforge-interop-manifest",
            generatedAt: generatedAt,
            show: manifestShow(document),
            venue: document.venue,
            positions: document.positionOrder.compactMap { document.positions[$0] },
            fixtures: interopFixtureRows(in: document),
            commentPins: commentPinRows(in: document),
            mvr: PlotMvrDisposition(
                importParser: "parked",
                blocker: mvrCorpusBlocker
            )
        )
    }

    public static func interopManifestJson(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> String {
        try jsonString(interopManifest(document, generatedAt: generatedAt))
    }

    public static func interopManifestData(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> Data {
        Data(try interopManifestJson(document, generatedAt: generatedAt).utf8)
    }

    public static func plotPdfData(
        _ document: PlotShowDocument,
        paper: PlotPdfPaper = .ansiD,
        generatedAt: String = currentIsoTimestamp()
    ) -> Data {
        let pageWidth = paper.widthPoints
        let pageHeight = paper.heightPoints
        let margin = 36.0
        let footerHeight = min(300.0, pageHeight * 0.24)
        let plotRect = PdfRect(
            x: margin,
            y: margin + footerHeight + 18,
            width: pageWidth - margin * 2,
            height: pageHeight - footerHeight - margin * 2 - 18
        )
        let footerRect = PdfRect(
            x: margin,
            y: margin,
            width: pageWidth - margin * 2,
            height: footerHeight
        )
        let bounds = printWorldBounds(document)
        let mapper = PdfWorldMapper(bounds: bounds, rect: plotRect)
        var commands: [String] = []

        commands.append("1 1 1 rg 0 0 \(pdfNumber(pageWidth)) \(pdfNumber(pageHeight)) re f")
        commands.append("0 0 0 RG 1 w \(plotRect.commandRect) re S")
        drawGrid(bounds: bounds, mapper: mapper, commands: &commands)
        drawStage(document, mapper: mapper, commands: &commands)
        drawPositions(document, mapper: mapper, commands: &commands)
        drawFocusBeams(document, mapper: mapper, commands: &commands)
        drawFixtures(document, mapper: mapper, commands: &commands)
        drawCommentPins(document, mapper: mapper, commands: &commands)
        drawTitleBlock(
            document,
            paper: paper,
            generatedAt: generatedAt,
            footerRect: footerRect,
            commands: &commands
        )

        let content = commands.joined(separator: "\n") + "\n"
        return buildPdf(
            pageWidth: pageWidth,
            pageHeight: pageHeight,
            content: content,
            title: "\(document.name) \(document.metadata.drawingTitle)"
        )
    }

    public static func smokeExportArtifacts(
        _ document: PlotShowDocument,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> [PlotNativeExportArtifact] {
        [
            PlotNativeExportArtifact(
                label: "plot document",
                filename: plotDocumentFilename(for: document),
                data: try PlotDocumentCodec.encode(document)
            ),
            PlotNativeExportArtifact(
                label: "plot pdf",
                filename: filename(for: document, kind: .plotPdf),
                data: plotPdfData(document, generatedAt: generatedAt)
            ),
            PlotNativeExportArtifact(
                label: "pdf review manifest",
                filename: filename(for: document, kind: .pdfReviewJson),
                data: try pdfReviewManifestData(document, generatedAt: generatedAt)
            ),
            PlotNativeExportArtifact(
                label: "patch csv",
                filename: filename(for: document, kind: .patchCsv),
                data: patchTableCsvData(document)
            ),
            PlotNativeExportArtifact(
                label: "gel rollup csv",
                filename: filename(for: document, kind: .gelRollupCsv),
                data: gelRollupCsvData(document)
            ),
            PlotNativeExportArtifact(
                label: "circuit summary csv",
                filename: filename(for: document, kind: .circuitSummaryCsv),
                data: circuitSummaryCsvData(document)
            ),
            PlotNativeExportArtifact(
                label: "fixture paperwork csv",
                filename: filename(for: document, kind: .fixturePaperworkCsv),
                data: fixturePaperworkCsvData(document)
            ),
            PlotNativeExportArtifact(
                label: "osc bridge json",
                filename: filename(for: document, kind: .oscBridgeJson),
                data: try oscBridgeManifestData(document, generatedAt: generatedAt)
            ),
            PlotNativeExportArtifact(
                label: "interop manifest json",
                filename: filename(for: document, kind: .interopManifestJson),
                data: try interopManifestData(document, generatedAt: generatedAt)
            ),
        ]
    }

    public static func pdfReviewManifest(
        _ document: PlotShowDocument,
        paper: PlotPdfPaper = .ansiD,
        generatedAt: String = currentIsoTimestamp()
    ) -> PlotPdfReviewManifest {
        let profiles = Set(document.fixtures.values.map(\.profileId))
        return PlotPdfReviewManifest(
            schemaVersion: 1,
            kind: "plotforge-pdf-review",
            generatedAt: generatedAt,
            show: manifestShow(document),
            paper: PlotPdfReviewPaper(
                id: paper.id,
                label: paper.label,
                widthIn: paper.widthIn,
                heightIn: paper.heightIn,
                mediaBoxPoints: [0, 0, paper.widthPoints, paper.heightPoints]
            ),
            drawingTitle: document.metadata.drawingTitle,
            scaleLabel: document.metadata.scaleLabel,
            content: PlotPdfReviewContent(
                positions: document.positionOrder.filter { document.positions[$0] != nil }.count,
                fixtures: document.fixtureOrder.filter { document.fixtures[$0] != nil }.count,
                fixtureProfiles: profiles.count,
                focusBeams: focusBeamRows(in: document).count,
                commentPins: commentPinRows(in: document).count,
                patchStatus: printPatchStatus(document),
                includesTitleBlock: true,
                includesFixtureLegend: true,
                includesStageFrame: true
            ),
            physicalSignoff: "pending",
            evidenceRequired: [
                "Open the exported PDF on macOS and signed physical iPad.",
                "Confirm ANSI D media size, stage frame, title block, fixture legend, focus beams, comment pins, and patch status are readable.",
                "Capture screenshot or print proof before marking PDF fidelity complete.",
            ]
        )
    }

    public static func pdfReviewManifestJson(
        _ document: PlotShowDocument,
        paper: PlotPdfPaper = .ansiD,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> String {
        try jsonString(pdfReviewManifest(document, paper: paper, generatedAt: generatedAt))
    }

    public static func pdfReviewManifestData(
        _ document: PlotShowDocument,
        paper: PlotPdfPaper = .ansiD,
        generatedAt: String = currentIsoTimestamp()
    ) throws -> Data {
        Data(try pdfReviewManifestJson(document, paper: paper, generatedAt: generatedAt).utf8)
    }

    private static func csvField(_ value: String?) -> String {
        guard let value else { return "" }
        if value.rangeOfCharacter(from: CharacterSet(charactersIn: "\",\n\r")) == nil {
            return value
        }
        return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
    }

    private static func jsonString<T: Encodable>(_ value: T) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return String(data: try encoder.encode(value), encoding: .utf8)! + "\n"
    }

    private static func manifestShow(_ document: PlotShowDocument) -> PlotManifestShow {
        PlotManifestShow(id: document.id, name: document.name, metadata: document.metadata)
    }

    public static func currentIsoTimestamp() -> String {
        ISO8601DateFormatter().string(from: Date())
    }
}

private extension PlotOscRouteArg {
    static func integer(_ value: Int) -> PlotOscRouteArg {
        PlotOscRouteArg(type: "integer", value: .number(Double(value)))
    }

    static func string(_ value: String) -> PlotOscRouteArg {
        PlotOscRouteArg(type: "string", value: .string(value))
    }
}

private extension PlotNativeExports {
    struct FocusBeamRow: Equatable {
        var fixtureId: String
        var unitNumber: Int?
        var fromX: Int
        var fromY: Int
        var toX: Int
        var toY: Int
    }

    struct WorldBounds {
        var x: Double
        var y: Double
        var width: Double
        var height: Double
    }

    struct PdfPoint {
        var x: Double
        var y: Double

        var commandPoint: String {
            "\(pdfNumber(x)) \(pdfNumber(y))"
        }
    }

    struct PdfRect {
        var x: Double
        var y: Double
        var width: Double
        var height: Double

        var commandRect: String {
            "\(pdfNumber(x)) \(pdfNumber(y)) \(pdfNumber(width)) \(pdfNumber(height))"
        }
    }

    struct PdfWorldMapper {
        var bounds: WorldBounds
        var rect: PdfRect

        private var scale: Double {
            min(rect.width / max(bounds.width, 1), rect.height / max(bounds.height, 1))
        }

        private var drawnWidth: Double {
            bounds.width * scale
        }

        private var drawnHeight: Double {
            bounds.height * scale
        }

        private var originX: Double {
            rect.x + (rect.width - drawnWidth) / 2
        }

        private var originY: Double {
            rect.y + (rect.height - drawnHeight) / 2
        }

        func map(xMm: Int, yMm: Int) -> PdfPoint {
            let x = originX + (Double(xMm) - bounds.x) * scale
            let y = originY + (bounds.y + bounds.height - Double(yMm)) * scale
            return PdfPoint(x: x, y: y)
        }

        func rect(xMm: Double, yMm: Double, widthMm: Double, heightMm: Double) -> PdfRect {
            let topLeft = map(xMm: Int(xMm.rounded()), yMm: Int(yMm.rounded()))
            return PdfRect(
                x: topLeft.x,
                y: topLeft.y - heightMm * scale,
                width: widthMm * scale,
                height: heightMm * scale
            )
        }
    }

    static func normalizeOscNamespace(_ value: String) -> String {
        let raw = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return "/plotforge" }
        let segments = raw
            .split(separator: "/")
            .map { cleanOscSegment(String($0), fallback: "") }
            .filter { !$0.isEmpty }
        return "/\(segments.isEmpty ? "plotforge" : segments.joined(separator: "/"))"
    }

    static func cleanOscSegment(_ value: String, fallback: String) -> String {
        var output = ""
        var lastWasSeparator = false
        for scalar in value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().unicodeScalars {
            let isLetter = scalar.value >= 97 && scalar.value <= 122
            let isNumber = scalar.value >= 48 && scalar.value <= 57
            let isUnderscore = scalar == "_"
            if isLetter || isNumber || isUnderscore {
                output.append(String(scalar))
                lastWasSeparator = false
            } else if !lastWasSeparator {
                output.append("_")
                lastWasSeparator = true
            }
        }
        let trimmed = output.trimmingCharacters(in: CharacterSet(charactersIn: "_"))
        return trimmed.isEmpty ? fallback : trimmed
    }

    static func fixtureLabel(_ document: PlotShowDocument, _ fixture: Fixture) -> String {
        let position = document.positions[fixture.positionId]
        let unit = fixture.unitNumber.map { "U\($0)" } ?? "No unit"
        return "\(position?.name ?? "Unassigned") \(unit)"
    }

    static func profileDisplayName(_ profile: FixtureProfile?) -> String {
        guard let profile else { return "Unknown profile" }
        let name = [profile.manufacturer, profile.model]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return name.isEmpty ? "Unknown profile" : name
    }

    static func parseGelCodes(_ value: String) -> [String] {
        let text = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return [] }

        let pattern = #"\b(ROSCO|LEE|GAM|APOLLO|[A-Z]{1,4})[\s-]*(\d{1,4}[A-Z]?)\b"#
        let range = NSRange(text.startIndex..<text.endIndex, in: text)
        let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive])
        let detected = regex?.matches(in: text, range: range).compactMap { match -> String? in
            guard match.numberOfRanges == 3,
                  let prefixRange = Range(match.range(at: 1), in: text),
                  let numberRange = Range(match.range(at: 2), in: text)
            else {
                return nil
            }
            return normalizeGelToken("\(text[prefixRange]) \(text[numberRange])")
        } ?? []
        if !detected.isEmpty {
            return orderedUnique(detected.filter { !$0.isEmpty })
        }

        let splitPattern = #",|;|/|\+|&|\||\band\b"#
        let normalizedSeparators = text.replacingOccurrences(
            of: splitPattern,
            with: ",",
            options: [.regularExpression, .caseInsensitive]
        )
        let tokens = normalizedSeparators
            .components(separatedBy: ",")
            .map(normalizeGelToken)
            .filter { !$0.isEmpty }
        return orderedUnique(tokens)
    }

    static func normalizeGelToken(_ token: String) -> String {
        let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        let upper = trimmed.uppercased()
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
        let compact = upper
            .unicodeScalars
            .filter { ($0.value >= 65 && $0.value <= 90) || ($0.value >= 48 && $0.value <= 57) }
            .map(String.init)
            .joined()
        let emptyLabels = Set(["", "OPEN", "NO COLOR", "NOCOLOR", "NO COLOUR", "NC", "N/C", "NONE"])
        if emptyLabels.contains(upper) || emptyLabels.contains(compact) {
            return ""
        }

        let pattern = #"^([A-Z]+)[\s-]*(\d{1,4}[A-Z]?)$"#
        let regex = try? NSRegularExpression(pattern: pattern)
        let range = NSRange(upper.startIndex..<upper.endIndex, in: upper)
        guard let match = regex?.firstMatch(in: upper, range: range),
              match.numberOfRanges == 3,
              let prefixRange = Range(match.range(at: 1), in: upper),
              let numberRange = Range(match.range(at: 2), in: upper)
        else {
            return compact.isEmpty ? upper : compact
        }

        let prefix = String(upper[prefixRange])
        let brandMap = ["ROSCO": "R", "LEE": "L", "GAM": "G", "APOLLO": "AP"]
        return "\(brandMap[prefix] ?? prefix)\(upper[numberRange])"
    }

    static func orderedUnique(_ values: [String]) -> [String] {
        var seen: Set<String> = []
        var output: [String] = []
        for value in values where !seen.contains(value) {
            seen.insert(value)
            output.append(value)
        }
        return output
    }

    static func compareGelCodes(_ left: String, _ right: String) -> Bool {
        let parsedLeft = parsedGelCode(left)
        let parsedRight = parsedGelCode(right)
        if let parsedLeft,
           let parsedRight,
           parsedLeft.prefix == parsedRight.prefix {
            if parsedLeft.number != parsedRight.number {
                return parsedLeft.number < parsedRight.number
            }
            return parsedLeft.suffix < parsedRight.suffix
        }
        return left.localizedStandardCompare(right) == .orderedAscending
    }

    static func parsedGelCode(_ value: String) -> (prefix: String, number: Int, suffix: String)? {
        let pattern = #"^([A-Z]+)(\d+)([A-Z]?)$"#
        let regex = try? NSRegularExpression(pattern: pattern)
        let range = NSRange(value.startIndex..<value.endIndex, in: value)
        guard let match = regex?.firstMatch(in: value, range: range),
              match.numberOfRanges == 4,
              let prefixRange = Range(match.range(at: 1), in: value),
              let numberRange = Range(match.range(at: 2), in: value),
              let suffixRange = Range(match.range(at: 3), in: value),
              let number = Int(value[numberRange])
        else {
            return nil
        }
        return (String(value[prefixRange]), number, String(value[suffixRange]))
    }

    static func gelFixtureLabel(_ document: PlotShowDocument, _ fixture: Fixture) -> String {
        let position = document.positions[fixture.positionId]
        let unit = fixture.unitNumber.map { "U\($0)" } ?? "No unit"
        let channel = fixture.channel.map { " ch \($0)" } ?? ""
        return "\(unit) \(position?.name ?? "Unassigned")\(channel)"
    }

    static func circuitFixtureLabel(_ document: PlotShowDocument, _ fixture: Fixture) -> String {
        let position = document.positions[fixture.positionId]
        let profile = PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)
        let unit = fixture.unitNumber.map { "U\($0)" } ?? "No unit"
        let channel = fixture.channel.map { " ch \($0)" } ?? ""
        let type = profile?.model.isEmpty == false ? " \(profile?.model ?? "")" : ""
        return "\(unit) \(position?.name ?? "Unassigned")\(channel)\(type)"
    }

    static func sortedFixturesByPaperworkOrder(_ document: PlotShowDocument) -> [Fixture] {
        let positionOrder = Dictionary(uniqueKeysWithValues: document.positionOrder.enumerated().map { ($0.element, $0.offset) })
        return document.fixtureOrder
            .compactMap { document.fixtures[$0] }
            .sorted {
                let leftPosition = positionOrder[$0.positionId] ?? Int.max
                let rightPosition = positionOrder[$1.positionId] ?? Int.max
                if leftPosition != rightPosition {
                    return leftPosition < rightPosition
                }
                if ($0.unitNumber ?? Int.max) != ($1.unitNumber ?? Int.max) {
                    return ($0.unitNumber ?? Int.max) < ($1.unitNumber ?? Int.max)
                }
                return $0.id < $1.id
            }
    }

    static func normalizedCircuitValue(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
    }

    static func profileSource(_ profile: FixtureProfile?) -> [String: JSONValue] {
        guard let source = profile?.source else {
            return ["type": .string("unknown")]
        }
        if source["type"] == .string("gdtf-share") {
            let keys = ["type", "fixtureId", "revisionId", "revision", "revisionDate", "gdtfVersion", "apiUrl"]
            return Dictionary(uniqueKeysWithValues: keys.compactMap { key in
                source[key].map { (key, $0) }
            })
        }
        return ["type": source["type"] ?? .string("unknown")]
    }

    static func focusBeamRows(in document: PlotShowDocument) -> [FocusBeamRow] {
        document.fixtureOrder.compactMap { fixtureId in
            guard let fixture = document.fixtures[fixtureId],
                  let position = document.positions[fixture.positionId],
                  let focus = fixture.focus
            else {
                return nil
            }
            return FocusBeamRow(
                fixtureId: fixture.id,
                unitNumber: fixture.unitNumber,
                fromX: fixture.xMm,
                fromY: position.yMm,
                toX: focus.xMm,
                toY: focus.yMm
            )
        }
    }

    static func commentPinRows(in document: PlotShowDocument) -> [CommentPin] {
        document.commentPinOrder.compactMap { document.commentPins[$0] }
    }

    static func printWorldBounds(_ document: PlotShowDocument) -> WorldBounds {
        let margin = feetToMillimeters(8)
        var xValues = [
            -Double(document.venue.stageWidthMm) / 2,
            Double(document.venue.stageWidthMm) / 2,
        ]
        var yValues = [
            -Double(document.venue.stageDepthMm),
            0,
        ]

        for positionId in document.positionOrder {
            guard let position = document.positions[positionId] else { continue }
            let half = Double(position.lengthMm) / 2
            xValues.append(contentsOf: [-half, half])
            yValues.append(Double(position.yMm))
        }
        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId] else { continue }
            xValues.append(Double(fixture.xMm))
        }
        for focus in focusBeamRows(in: document) {
            xValues.append(Double(focus.toX))
            yValues.append(Double(focus.toY))
        }
        for comment in commentPinRows(in: document) {
            xValues.append(Double(comment.xMm))
            yValues.append(Double(comment.yMm))
        }

        let minX = (xValues.min() ?? 0) - margin
        let maxX = (xValues.max() ?? 0) + margin
        let minY = (yValues.min() ?? 0) - margin
        let maxY = (yValues.max() ?? 0) + margin
        return WorldBounds(x: minX, y: minY, width: maxX - minX, height: maxY - minY)
    }

    static func drawGrid(bounds: WorldBounds, mapper: PdfWorldMapper, commands: inout [String]) {
        let gridStep = feetToMillimeters(5)
        let startX = floor(bounds.x / gridStep) * gridStep
        let endX = ceil((bounds.x + bounds.width) / gridStep) * gridStep
        let startY = floor(bounds.y / gridStep) * gridStep
        let endY = ceil((bounds.y + bounds.height) / gridStep) * gridStep
        commands.append("0.84 0.85 0.87 RG 0.35 w")
        stride(from: startX, through: endX, by: gridStep).forEach { x in
            drawLine(from: mapper.map(xMm: Int(x.rounded()), yMm: Int(bounds.y.rounded())), to: mapper.map(xMm: Int(x.rounded()), yMm: Int((bounds.y + bounds.height).rounded())), commands: &commands)
        }
        stride(from: startY, through: endY, by: gridStep).forEach { y in
            drawLine(from: mapper.map(xMm: Int(bounds.x.rounded()), yMm: Int(y.rounded())), to: mapper.map(xMm: Int((bounds.x + bounds.width).rounded()), yMm: Int(y.rounded())), commands: &commands)
        }
    }

    static func drawStage(_ document: PlotShowDocument, mapper: PdfWorldMapper, commands: inout [String]) {
        commands.append("0 0 0 RG 1.2 w")
        let stageRect = mapper.rect(
            xMm: -Double(document.venue.stageWidthMm) / 2,
            yMm: 0,
            widthMm: Double(document.venue.stageWidthMm),
            heightMm: Double(document.venue.stageDepthMm)
        )
        commands.append("\(stageRect.commandRect) re S")
        drawLine(
            from: mapper.map(xMm: -document.venue.stageWidthMm / 2, yMm: 0),
            to: mapper.map(xMm: document.venue.stageWidthMm / 2, yMm: 0),
            commands: &commands
        )
        drawLine(
            from: mapper.map(xMm: 0, yMm: Int(mapper.bounds.y.rounded())),
            to: mapper.map(xMm: 0, yMm: Int((mapper.bounds.y + mapper.bounds.height).rounded())),
            commands: &commands
        )
    }

    static func drawPositions(_ document: PlotShowDocument, mapper: PdfWorldMapper, commands: inout [String]) {
        commands.append("0 0 0 RG 1 w")
        for positionId in document.positionOrder {
            guard let position = document.positions[positionId] else { continue }
            drawLine(
                from: mapper.map(xMm: -position.lengthMm / 2, yMm: position.yMm),
                to: mapper.map(xMm: position.lengthMm / 2, yMm: position.yMm),
                commands: &commands
            )
            let labelPoint = mapper.map(xMm: -position.lengthMm / 2, yMm: position.yMm)
            drawText(position.name, x: labelPoint.x + 4, y: labelPoint.y + 5, size: 8, commands: &commands)
        }
    }

    static func drawFocusBeams(_ document: PlotShowDocument, mapper: PdfWorldMapper, commands: inout [String]) {
        commands.append("0 0 0 RG 0.65 w")
        for focus in focusBeamRows(in: document) {
            drawLine(
                from: mapper.map(xMm: focus.fromX, yMm: focus.fromY),
                to: mapper.map(xMm: focus.toX, yMm: focus.toY),
                commands: &commands
            )
            let point = mapper.map(xMm: focus.toX, yMm: focus.toY)
            drawCircle(center: point, radius: 5, commands: &commands)
            drawText("Focus \(focus.unitNumber.map(String.init) ?? "")", x: point.x + 8, y: point.y + 5, size: 7, commands: &commands)
        }
    }

    static func drawFixtures(_ document: PlotShowDocument, mapper: PdfWorldMapper, commands: inout [String]) {
        commands.append("0 0 0 RG 1 w")
        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId],
                  let position = document.positions[fixture.positionId]
            else {
                continue
            }
            let point = mapper.map(xMm: fixture.xMm, yMm: position.yMm)
            drawCircle(center: point, radius: 7, commands: &commands)
            if let unit = fixture.unitNumber {
                drawText("\(unit)", x: point.x - 3, y: point.y - 17, size: 8, commands: &commands)
            }
        }
    }

    static func drawCommentPins(_ document: PlotShowDocument, mapper: PdfWorldMapper, commands: inout [String]) {
        for (index, comment) in commentPinRows(in: document).enumerated() {
            let point = mapper.map(xMm: comment.xMm, yMm: comment.yMm)
            drawCircle(center: point, radius: 6, commands: &commands)
            drawText("\(index + 1)", x: point.x - 2, y: point.y - 2, size: 7, commands: &commands)
            drawText("Comment \(index + 1): \(comment.text)", x: point.x + 9, y: point.y + 4, size: 7, commands: &commands)
        }
    }

    static func drawTitleBlock(
        _ document: PlotShowDocument,
        paper: PlotPdfPaper,
        generatedAt: String,
        footerRect: PdfRect,
        commands: inout [String]
    ) {
        commands.append("0 0 0 RG 1 w \(footerRect.commandRect) re S")
        let splitX = footerRect.x + footerRect.width * 0.58
        drawLine(
            from: PdfPoint(x: splitX, y: footerRect.y),
            to: PdfPoint(x: splitX, y: footerRect.y + footerRect.height),
            commands: &commands
        )

        let metadata = document.metadata
        let patchStatus = printPatchStatus(document)
        let titleRows = [
            "Title block",
            document.name.isEmpty ? "Untitled Show" : document.name,
            "Drawing: \(metadata.drawingTitle)",
            "Venue: \(metadata.venueName.isEmpty ? "Unspecified" : metadata.venueName)",
            "Designer: \(metadata.designer.isEmpty ? "Unassigned" : metadata.designer)",
            "Drafted by: \(metadata.draftsperson.isEmpty ? "Unassigned" : metadata.draftsperson)",
            "Company: \(metadata.company.isEmpty ? "Unassigned" : metadata.company)",
            "Show date: \(metadata.showDate.isEmpty ? "Unscheduled" : metadata.showDate)",
            "Revision: \(metadata.revision)",
            "Scale: \(metadata.scaleLabel)",
            "Print date: \(generatedAt)",
            "Paper: \(paper.label) \(paper.widthIn) x \(paper.heightIn) in",
            "Stage: \(formatImperial(document.venue.stageWidthMm)) wide x \(formatImperial(document.venue.stageDepthMm)) deep",
            "Fixtures: \(document.fixtureOrder.count)",
            "Positions: \(document.positionOrder.count)",
            "Patch: \(patchStatus)",
        ]

        var y = footerRect.y + footerRect.height - 18
        for (index, row) in titleRows.enumerated() {
            drawText(row, x: footerRect.x + 12, y: y, size: index <= 1 ? 11 : 7, commands: &commands)
            y -= index <= 1 ? 15 : 12
        }

        drawText("Fixture legend", x: splitX + 12, y: footerRect.y + footerRect.height - 18, size: 11, commands: &commands)
        y = footerRect.y + footerRect.height - 38
        for row in legendRows(document).prefix(16) {
            drawText("\(row.count)  \(profileDisplayName(row.profile))  \(row.profile?.defaultMode ?? "Default")  \(max(1, row.profile?.dmxFootprint ?? 1))ch", x: splitX + 12, y: y, size: 7, commands: &commands)
            y -= 12
        }
        if legendRows(document).isEmpty {
            drawText("No fixtures", x: splitX + 12, y: y, size: 7, commands: &commands)
        }
    }

    static func drawLine(from: PdfPoint, to: PdfPoint, commands: inout [String]) {
        commands.append("\(from.commandPoint) m \(to.commandPoint) l S")
    }

    static func drawCircle(center: PdfPoint, radius: Double, commands: inout [String]) {
        let c = radius * 0.552_284_749_8
        commands.append("""
        \(pdfNumber(center.x + radius)) \(pdfNumber(center.y)) m
        \(pdfNumber(center.x + radius)) \(pdfNumber(center.y + c)) \(pdfNumber(center.x + c)) \(pdfNumber(center.y + radius)) \(pdfNumber(center.x)) \(pdfNumber(center.y + radius)) c
        \(pdfNumber(center.x - c)) \(pdfNumber(center.y + radius)) \(pdfNumber(center.x - radius)) \(pdfNumber(center.y + c)) \(pdfNumber(center.x - radius)) \(pdfNumber(center.y)) c
        \(pdfNumber(center.x - radius)) \(pdfNumber(center.y - c)) \(pdfNumber(center.x - c)) \(pdfNumber(center.y - radius)) \(pdfNumber(center.x)) \(pdfNumber(center.y - radius)) c
        \(pdfNumber(center.x + c)) \(pdfNumber(center.y - radius)) \(pdfNumber(center.x + radius)) \(pdfNumber(center.y - c)) \(pdfNumber(center.x + radius)) \(pdfNumber(center.y)) c S
        """)
    }

    static func drawText(_ value: String, x: Double, y: Double, size: Double, commands: inout [String]) {
        commands.append("BT /F1 \(pdfNumber(size)) Tf \(pdfNumber(x)) \(pdfNumber(y)) Td (\(pdfText(value))) Tj ET")
    }

    static func printPatchStatus(_ document: PlotShowDocument) -> String {
        let summary = PlotToolModules.patchSummary(in: document)
        if summary.dmxConflicts == 0 && summary.channelConflicts == 0 {
            return "Patch clear"
        }
        return [
            summary.dmxConflicts > 0 ? "\(summary.dmxConflicts) DMX conflict\(summary.dmxConflicts == 1 ? "" : "s")" : "",
            summary.channelConflicts > 0 ? "\(summary.channelConflicts) channel conflict\(summary.channelConflicts == 1 ? "" : "s")" : "",
        ]
        .filter { !$0.isEmpty }
        .joined(separator: ", ")
    }

    static func legendRows(_ document: PlotShowDocument) -> [(profile: FixtureProfile?, count: Int)] {
        var counts: [String: (profile: FixtureProfile?, count: Int)] = [:]
        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId] else { continue }
            let profile = PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)
            var row = counts[fixture.profileId] ?? (profile, 0)
            row.count += 1
            counts[fixture.profileId] = row
        }
        return counts.values.sorted {
            profileDisplayName($0.profile) == profileDisplayName($1.profile)
                ? ($0.profile?.id ?? "") < ($1.profile?.id ?? "")
                : profileDisplayName($0.profile) < profileDisplayName($1.profile)
        }
    }

    static func formatImperial(_ millimeters: Int) -> String {
        let totalInches = Int((Double(millimeters) / 25.4).rounded())
        let feet = totalInches / 12
        let inches = abs(totalInches % 12)
        return "\(feet) ft \(inches) in"
    }

    static func feetToMillimeters(_ feet: Double) -> Double {
        feet * 304.8
    }

    static func pdfNumber(_ value: Double) -> String {
        var text = String(format: "%.2f", value)
        if text.contains(".") {
            while text.last == "0" {
                text.removeLast()
            }
            if text.last == "." {
                text.removeLast()
            }
        }
        return text
    }

    static func pdfText(_ value: String) -> String {
        var output = ""
        for scalar in value.unicodeScalars {
            if scalar.value < 32 {
                continue
            }
            switch scalar {
            case "\\":
                output += "\\\\"
            case "(":
                output += "\\("
            case ")":
                output += "\\)"
            default:
                output += scalar.isASCII ? String(scalar) : "?"
            }
        }
        return output
    }

    static func buildPdf(pageWidth: Double, pageHeight: Double, content: String, title: String) -> Data {
        let contentLength = Data(content.utf8).count
        let objects = [
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 \(pdfNumber(pageWidth)) \(pdfNumber(pageHeight))] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            "5 0 obj\n<< /Length \(contentLength) >>\nstream\n\(content)endstream\nendobj\n",
            "6 0 obj\n<< /Title (\(pdfText(title))) /Producer (PlotForge Native) >>\nendobj\n",
        ]

        var pdf = "%PDF-1.4\n%\n"
        var offsets: [Int] = [0]
        for object in objects {
            offsets.append(Data(pdf.utf8).count)
            pdf += object
        }
        let xrefOffset = Data(pdf.utf8).count
        pdf += "xref\n0 \(objects.count + 1)\n"
        pdf += "0000000000 65535 f \n"
        for offset in offsets.dropFirst() {
            pdf += String(format: "%010d 00000 n \n", offset)
        }
        pdf += "trailer\n<< /Size \(objects.count + 1) /Root 1 0 R /Info 6 0 R >>\n"
        pdf += "startxref\n\(xrefOffset)\n%%EOF\n"
        return Data(pdf.utf8)
    }
}
