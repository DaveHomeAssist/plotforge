import PlotForgeCore
import SwiftUI
import UniformTypeIdentifiers

struct FixtureLibraryPanel: View {
    let document: PlotShowDocument
    let selection: PlotCanvasSelection
    let onAddFixture: (_ profileId: String, _ positionId: String) -> Void
    @State private var query = ""

    private var library: [FixtureProfileLibraryEntry] {
        PlotToolModules.fixtureProfileLibrary(documentProfiles: document.fixtureProfiles, query: query)
    }

    private var totalLibraryCount: Int {
        PlotToolModules.fixtureProfileLibrary(documentProfiles: document.fixtureProfiles).count
    }

    private var targetPositionId: String? {
        if let fixtureId = selection.primaryFixtureId,
           let fixture = document.fixtures[fixtureId],
           document.positions[fixture.positionId] != nil {
            return fixture.positionId
        }
        return document.positionOrder.first { document.positions[$0] != nil }
    }

    private var targetPositionName: String {
        guard let targetPositionId,
              let position = document.positions[targetPositionId]
        else {
            return "No position"
        }
        return position.name
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SummaryRows(rows: [
                ("Library profiles", "\(totalLibraryCount)"),
                ("Curated seeds", "\(PlotToolModules.seededFixtureProfiles.count)"),
                ("Placed fixtures", "\(document.fixtureOrder.count)"),
                ("Add target", targetPositionName),
            ])

            TextField("Search profiles", text: $query)
                .textFieldStyle(.roundedBorder)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    if library.isEmpty {
                        EmptyModuleState(
                            title: "No profiles found",
                            detail: "Clear the search to show the full library."
                        )
                    } else {
                        ForEach(library) { entry in
                            FixtureLibraryEntryRow(
                                entry: entry,
                                targetPositionId: targetPositionId,
                                onAddFixture: onAddFixture
                            )
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }
}

struct FixtureLibraryEntryRow: View {
    let entry: FixtureProfileLibraryEntry
    let targetPositionId: String?
    let onAddFixture: (_ profileId: String, _ positionId: String) -> Void

    private var profileName: String {
        let name = [entry.profile.manufacturer, entry.profile.model]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return name.isEmpty ? entry.profile.id : name
    }

    private var detail: FixtureProfileDetailSummary {
        PlotToolModules.fixtureProfileDetail(entry.profile, sourceLabel: entry.sourceLabel)
    }

    var body: some View {
        ModuleRowShell {
            HStack(alignment: .top, spacing: 10) {
                FixtureProfileDetailView(detail: detail, insetPadding: 0)

                Spacer(minLength: 8)

                Button {
                    if let targetPositionId {
                        onAddFixture(entry.profile.id, targetPositionId)
                    }
                } label: {
                    Label("Add fixture", systemImage: "plus")
                }
                .labelStyle(.iconOnly)
                .buttonStyle(.bordered)
                .disabled(targetPositionId == nil)
                .accessibilityLabel("Add \(profileName)")
            }
        }
    }
}

struct PatchToolPanel: View {
    let document: PlotShowDocument

    private var rows: [PatchTableRow] {
        PlotToolModules.patchTableRows(in: document)
    }

    private var checks: [PlotCheckRow] {
        PlotToolModules.checkRows(in: document)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SummaryRows(rows: [
                ("Patch rows", "\(rows.count)"),
                ("Open checks", "\(checks.count)"),
                ("DMX conflicts", "\(rows.filter(\.hasDmxConflict).count)"),
                ("Channel conflicts", "\(rows.filter(\.hasChannelConflict).count)"),
            ])

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ModuleSectionTitle("Patch")
                    if rows.isEmpty {
                        EmptyModuleState(title: "No fixtures", detail: "Add fixtures from the library to build patch rows.")
                    } else {
                        ForEach(rows) { row in
                            PatchTableCompactRow(row: row)
                        }
                    }

                    ModuleSectionTitle("Checks")
                    if checks.isEmpty {
                        Label("No open patch checks", systemImage: "checkmark.circle")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(checks) { check in
                            PlotCheckCompactRow(check: check)
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }
}

struct PatchTableCompactRow: View {
    let row: PatchTableRow

    private var unitLabel: String {
        row.unitNumber.map { "#\($0)" } ?? "#?"
    }

    private var conflictColor: Color {
        row.hasDmxConflict || row.hasChannelConflict ? .red : .secondary
    }

    var body: some View {
        ModuleRowShell {
            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .firstTextBaseline) {
                    Text("\(unitLabel) \(row.profileName)")
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(2)
                    Spacer()
                    Text(row.statusLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                SummaryRows(rows: [
                    ("Position", row.positionName),
                    ("Channel", row.channel.map(String.init) ?? "Open"),
                    ("DMX", row.dmxRangeLabel),
                    ("Circuit", row.circuitLabel),
                ])
                if !row.conflictLabel.isEmpty {
                    Text(row.conflictLabel)
                        .font(.caption)
                        .foregroundStyle(conflictColor)
                        .lineLimit(2)
                }
            }
        }
    }
}

struct PlotCheckCompactRow: View {
    let check: PlotCheckRow

    var body: some View {
        ModuleRowShell {
            VStack(alignment: .leading, spacing: 6) {
                Label(check.title, systemImage: iconName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Text(check.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Text(check.fixtureLabels.joined(separator: ", "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
    }

    private var iconName: String {
        switch check.kind {
        case .channel:
            "number"
        case .dmx:
            "point.3.connected.trianglepath.dotted"
        case .circuit:
            "bolt"
        case .profile:
            "exclamationmark.triangle"
        }
    }
}

struct LabelToolPanel: View {
    let settings: LabelSettings
    let onUpdate: (_ settings: LabelSettings) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SummaryRows(rows: summaryRows)

            ScrollView {
                VStack(alignment: .leading, spacing: 10) {
                    LabelSettingControl(
                        title: "Fixture unit",
                        enabled: boolBinding(\.showFixtureUnit),
                        size: intBinding(\.fixtureUnitSize)
                    )
                    LabelSettingControl(
                        title: "Fixture channel",
                        enabled: boolBinding(\.showFixtureChannel),
                        size: intBinding(\.fixtureChannelSize)
                    )
                    LabelSettingControl(
                        title: "Position labels",
                        enabled: boolBinding(\.showPositionLabels),
                        size: intBinding(\.positionLabelSize)
                    )
                    LabelSettingControl(
                        title: "Comment text",
                        enabled: boolBinding(\.showCommentText),
                        size: intBinding(\.commentLabelSize)
                    )
                    LabelSettingControl(
                        title: "Focus labels",
                        enabled: boolBinding(\.showFocusLabels),
                        size: intBinding(\.focusLabelSize)
                    )
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var summaryRows: [(String, String)] {
        let labels = PlotToolModules.labelControlSummary(settings)
        return [
            ("Fixture unit", labels.fixtureUnit),
            ("Fixture channel", labels.fixtureChannel),
            ("Position", labels.position),
            ("Comment", labels.comment),
            ("Focus", labels.focus),
        ]
    }

    private func boolBinding(_ keyPath: WritableKeyPath<LabelSettings, Bool>) -> Binding<Bool> {
        Binding(
            get: { settings[keyPath: keyPath] },
            set: { value in
                var next = settings
                next[keyPath: keyPath] = value
                onUpdate(next)
            }
        )
    }

    private func intBinding(_ keyPath: WritableKeyPath<LabelSettings, Int>) -> Binding<Int> {
        Binding(
            get: { settings[keyPath: keyPath] },
            set: { value in
                var next = settings
                next[keyPath: keyPath] = value
                onUpdate(next)
            }
        )
    }
}

struct LabelSettingControl: View {
    let title: String
    @Binding var enabled: Bool
    @Binding var size: Int

    var body: some View {
        ModuleRowShell {
            VStack(alignment: .leading, spacing: 8) {
                Toggle(title, isOn: $enabled)
                    .font(.subheadline.weight(.semibold))
                Stepper(value: $size, in: 60...180, step: 5) {
                    Text("Text size \(size)%")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .disabled(!enabled)
            }
        }
    }
}

struct WizardToolPanel: View {
    let document: PlotShowDocument
    let onApply: (_ brief: String) -> Void
    @State private var brief = PlotToolModules.defaultWizardBrief

    private var plan: PlotWizardPlan {
        PlotToolModules.buildWizardPlan(for: document, brief: brief)
    }

    private var fixtureCount: Int {
        plan.fixtureGroups.reduce(0) { $0 + $1.count }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SummaryRows(rows: [
                ("Starter type", plan.productionLabel),
                ("Positions", "\(plan.positions.count)"),
                ("Fixtures", "\(fixtureCount)"),
                ("Source", plan.source),
            ])

            TextEditor(text: $brief)
                .font(.callout)
                .frame(minHeight: 88, maxHeight: 124)
                .scrollContentBackground(.hidden)
                .padding(8)
                .background(Color(uiToken: .control))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .accessibilityLabel("Wizard brief")

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    ModuleSectionTitle("Preview")
                    ForEach(plan.positions) { position in
                        WizardPositionPreviewRow(position: position)
                    }
                    ForEach(plan.fixtureGroups) { group in
                        WizardFixtureGroupPreviewRow(group: group)
                    }
                    ForEach(plan.notes, id: \.self) { note in
                        Text(note)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                }
                .padding(.vertical, 2)
            }

            Button {
                onApply(brief)
            } label: {
                Label("Apply Starter", systemImage: "plus.square.dashed")
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

struct WizardPositionPreviewRow: View {
    let position: PlotWizardPositionPlan

    var body: some View {
        ModuleRowShell {
            SummaryRows(rows: [
                ("Position", position.name),
                ("Kind", position.kind),
                ("Y", "\(position.yMm) mm"),
                ("Trim", "\(position.trimMm) mm"),
            ])
        }
    }
}

struct WizardFixtureGroupPreviewRow: View {
    let group: PlotWizardFixtureGroupPlan

    var body: some View {
        ModuleRowShell {
            SummaryRows(rows: [
                ("Group", group.role),
                ("Profile", group.profileId),
                ("Count", "\(group.count)"),
                ("Patch", "Ch \(group.channelStart) / U\(group.dmxUniverse)"),
            ])
        }
    }
}

struct ReportsToolPanel: View {
    let document: PlotShowDocument
    @State private var exportDocument = NativeExportDocument()
    @State private var exportContentType = UTType.data
    @State private var exportFilename = "plotforge-export"
    @State private var exportError = ""
    @State private var isExporterPresented = false

    private var summary: (rows: Int, dmxConflicts: Int, channelConflicts: Int, checks: Int) {
        PlotToolModules.patchSummary(in: document)
    }

    private var checks: [PlotCheckRow] {
        PlotToolModules.checkRows(in: document)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SummaryRows(rows: [
                ("Patch rows", "\(summary.rows)"),
                ("Open checks", "\(summary.checks)"),
                ("PDF", PlotNativeExports.filename(for: document, kind: .plotPdf)),
                ("Review", PlotNativeExports.filename(for: document, kind: .pdfReviewJson)),
                ("Paperwork", PlotNativeExports.filename(for: document, kind: .fixturePaperworkCsv)),
            ])

            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Button {
                        prepareExport(.plotPdf)
                    } label: {
                        Label("PDF", systemImage: "doc.richtext")
                    }
                    Button {
                        prepareExport(.pdfReviewJson)
                    } label: {
                        Label("Review", systemImage: "checkmark.seal")
                    }
                    Button {
                        prepareExport(.patchCsv)
                    } label: {
                        Label("CSV", systemImage: "tablecells")
                    }
                    Button {
                        prepareExport(.fixturePaperworkCsv)
                    } label: {
                        Label("Paperwork", systemImage: "list.clipboard")
                    }
                }
                HStack(spacing: 8) {
                    Button {
                        prepareExport(.gelRollupCsv)
                    } label: {
                        Label("Gels", systemImage: "paintpalette")
                    }
                    Button {
                        prepareExport(.circuitSummaryCsv)
                    } label: {
                        Label("Circuits", systemImage: "bolt")
                    }
                }
                HStack(spacing: 8) {
                    Button {
                        prepareExport(.oscBridgeJson)
                    } label: {
                        Label("OSC", systemImage: "point.3.connected.trianglepath.dotted")
                    }
                    Button {
                        prepareExport(.interopManifestJson)
                    } label: {
                        Label("Interop", systemImage: "square.stack.3d.up")
                    }
                }
            }
            .buttonStyle(.bordered)

            if !exportError.isEmpty {
                Text(exportError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    ModuleSectionTitle("Report readiness")
                    if checks.isEmpty {
                        EmptyModuleState(
                            title: "Ready for export",
                            detail: "PDF, patch CSV, gel CSV, circuit CSV, paperwork CSV, OSC JSON, and interop JSON are generated locally. MVR import remains parked on the sample corpus."
                        )
                    } else {
                        ForEach(checks) { check in
                            PlotCheckCompactRow(check: check)
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .fileExporter(
            isPresented: $isExporterPresented,
            document: exportDocument,
            contentType: exportContentType,
            defaultFilename: exportFilename
        ) { result in
            if case .failure(let error) = result {
                exportError = error.localizedDescription
            }
        }
    }

    private func prepareExport(_ kind: PlotExportKind) {
        do {
            exportError = ""
            exportFilename = PlotNativeExports.filename(for: document, kind: kind)
            switch kind {
            case .patchCsv:
                exportDocument = NativeExportDocument(data: PlotNativeExports.patchTableCsvData(document))
                exportContentType = .commaSeparatedText
            case .gelRollupCsv:
                exportDocument = NativeExportDocument(data: PlotNativeExports.gelRollupCsvData(document))
                exportContentType = .commaSeparatedText
            case .circuitSummaryCsv:
                exportDocument = NativeExportDocument(data: PlotNativeExports.circuitSummaryCsvData(document))
                exportContentType = .commaSeparatedText
            case .fixturePaperworkCsv:
                exportDocument = NativeExportDocument(data: PlotNativeExports.fixturePaperworkCsvData(document))
                exportContentType = .commaSeparatedText
            case .oscBridgeJson:
                exportDocument = NativeExportDocument(data: try PlotNativeExports.oscBridgeManifestData(document))
                exportContentType = .json
            case .interopManifestJson:
                exportDocument = NativeExportDocument(data: try PlotNativeExports.interopManifestData(document))
                exportContentType = .json
            case .pdfReviewJson:
                exportDocument = NativeExportDocument(data: try PlotNativeExports.pdfReviewManifestData(document))
                exportContentType = .json
            case .plotPdf:
                exportDocument = NativeExportDocument(data: PlotNativeExports.plotPdfData(document))
                exportContentType = .pdf
            }
            isExporterPresented = true
        } catch {
            exportError = error.localizedDescription
        }
    }
}

struct NativeExportDocument: FileDocument {
    static var readableContentTypes: [UTType] {
        [.pdf, .json, .commaSeparatedText, .data]
    }

    var data: Data

    init(data: Data = Data()) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        regularFileWrapper()
    }

    func regularFileWrapper() -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct ModuleSectionTitle: View {
    let title: String

    init(_ title: String) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .padding(.top, 4)
    }
}

struct ModuleRowShell<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(uiToken: .control))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct EmptyModuleState: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 8)
    }
}
