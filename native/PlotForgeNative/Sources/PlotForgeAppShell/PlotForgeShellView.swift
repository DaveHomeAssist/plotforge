import Foundation
import PlotForgeCore
import PlotForgeDocumentUI
import SwiftUI

public struct PlotForgeShellView: View {
    @Binding private var document: PlotForgeFileDocument
    @State private var selectedTool: PlotTool = .setup
    @State private var selection = PlotCanvasSelection()

    public init(document: Binding<PlotForgeFileDocument>) {
        _document = document
    }

    public var body: some View {
        NavigationSplitView {
            ToolSidebar(selectedTool: $selectedTool, document: document.show)
        } detail: {
            ToolWorkspace(tool: selectedTool, document: $document.show, selection: $selection)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiToken: .surface))
        }
    }
}

enum PlotTool: String, CaseIterable, Identifiable {
    case setup = "Setup"
    case fixtures = "Fixtures"
    case patch = "Patch"
    case labels = "Labels"
    case wizard = "Wizard"
    case inspector = "Inspector"
    case reports = "Reports"
    case files = "Files"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .setup: "slider.horizontal.3"
        case .fixtures: "lightbulb"
        case .patch: "point.3.connected.trianglepath.dotted"
        case .labels: "textformat.size"
        case .wizard: "sparkles"
        case .inspector: "sidebar.right"
        case .reports: "checklist"
        case .files: "folder"
        }
    }
}

struct ToolSidebar: View {
    @Binding var selectedTool: PlotTool
    let document: PlotShowDocument

    var body: some View {
        List {
            ForEach(PlotTool.allCases) { tool in
                Button {
                    selectedTool = tool
                } label: {
                    Label(tool.rawValue, systemImage: tool.systemImage)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .listRowBackground(selectedTool == tool ? Color(uiToken: .control) : Color.clear)
            }
        }
        .safeAreaInset(edge: .top) {
            VStack(alignment: .leading, spacing: 6) {
                Text("PlotForge")
                    .font(.title2.weight(.semibold))
                Text(document.name)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(uiToken: .chrome))
        }
        .navigationSplitViewColumnWidth(min: 180, ideal: 220)
    }
}

struct ToolWorkspace: View {
    let tool: PlotTool
    @Binding var document: PlotShowDocument
    @Binding var selection: PlotCanvasSelection
    @State private var history = PlotDocumentHistory()
    @State private var dragBaseline: PlotShowDocument?
    @State private var inspectorCollapsed = false

    var body: some View {
        VStack(spacing: 0) {
            TopStatusBar(
                document: document,
                selection: selection,
                canUndo: history.canUndo,
                canRedo: history.canRedo,
                onUndo: undo,
                onRedo: redo,
                onDeleteSelection: deleteSelection
            )
            Divider()
            HStack(spacing: 0) {
                ToolPanel(
                    tool: tool,
                    document: $document,
                    selection: selection,
                    onAddFixtureFromLibrary: addFixtureFromLibrary,
                    onUpdateLabelSettings: updateLabelSettings,
                    onApplyWizardPlan: applyWizardPlan
                )
                    .frame(width: 280)
                Divider()
                PlotCanvasView(
                    document: $document,
                    selection: $selection,
                    onBeginFixtureDrag: beginFixtureDrag,
                    onMoveFixture: moveFixtureLive,
                    onEndFixtureDrag: endFixtureDrag,
                    onNudgeSelection: nudgeSelection,
                    onSelectAdjacentFixture: selectAdjacentFixture,
                    onSelectAllFixtures: selectAllFixtures,
                    onClearSelection: clearSelection,
                    onDeleteSelection: deleteSelection
                )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                Divider()
                InspectorRail(
                    document: document,
                    selection: selection,
                    isCollapsed: $inspectorCollapsed,
                    onCommitPatch: commitInspectorPatch
                )
                .frame(width: inspectorCollapsed ? 48 : 320)
            }
        }
        .onChange(of: document.fixtureOrder) {
            pruneSelection()
        }
    }

    private func commit(_ nextDocument: PlotShowDocument) {
        let previous = document
        history.record(previous: previous, next: nextDocument)
        document = nextDocument
        pruneSelection()
    }

    private func beginFixtureDrag() {
        if dragBaseline == nil {
            dragBaseline = document
        }
    }

    private func moveFixtureLive(fixtureId: String, rawXMm: Double) {
        selection.selectFixture(fixtureId)
        document = PlotDocumentEditing.moveFixture(
            in: document,
            fixtureId: fixtureId,
            rawXMm: rawXMm
        )
        pruneSelection()
    }

    private func endFixtureDrag() {
        if let baseline = dragBaseline {
            history.record(previous: baseline, next: document)
        }
        dragBaseline = nil
        pruneSelection()
    }

    private func deleteSelection() {
        guard let fixtureId = selection.primaryFixtureId else { return }
        let next = PlotDocumentEditing.removeFixture(from: document, fixtureId: fixtureId)
        commit(next)
    }

    private func nudgeSelection(steps: Int) {
        guard let fixtureId = selection.primaryFixtureId else { return }
        let next = PlotDocumentEditing.nudgeFixture(
            in: document,
            fixtureId: fixtureId,
            steps: steps
        )
        commit(next)
    }

    private func addFixtureFromLibrary(profileId: String, positionId: String) {
        let next = PlotToolModules.addFixtureFromLibrary(
            profileId: profileId,
            to: document,
            positionId: positionId
        )
        commit(next)
    }

    private func updateLabelSettings(_ settings: LabelSettings) {
        guard settings != document.labelSettings else { return }
        var next = document
        next.labelSettings = settings
        next.updatedAt = currentTimestampMilliseconds()
        commit(next)
    }

    private func applyWizardPlan(brief: String) {
        let plan = PlotToolModules.buildWizardPlan(for: document, brief: brief)
        let result = PlotToolModules.applyWizardPlan(plan, to: document)
        commit(result.document)
    }

    private func commitInspectorPatch(fixtureId: String, patch: FixtureInspectorPatch) {
        var next = PlotInspectorValidation.apply(
            patch: patch,
            to: document,
            fixtureId: fixtureId
        )
        if selection.fixtureIds.count > 1 {
            next = PlotInspectorValidation.applyBatchSafe(
                patch: patch,
                to: next,
                fixtureIds: selection.fixtureIds.filter { $0 != fixtureId }
            )
        }
        commit(next)
    }

    private func selectAdjacentFixture(direction: Int, extending: Bool) {
        selection.selectAdjacentFixture(
            in: document.fixtureOrder,
            direction: direction,
            extending: extending
        )
        pruneSelection()
    }

    private func selectAllFixtures() {
        selection.selectAllFixtures(in: document.fixtureOrder)
        pruneSelection()
    }

    private func clearSelection() {
        selection.clear()
    }

    private func undo() {
        guard let previous = history.undo(current: document) else { return }
        document = previous
        pruneSelection()
    }

    private func redo() {
        guard let next = history.redo(current: document) else { return }
        document = next
        pruneSelection()
    }

    private func pruneSelection() {
        selection.prune(toAvailable: Set(document.fixtures.keys))
    }

    private func currentTimestampMilliseconds() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}

struct TopStatusBar: View {
    let document: PlotShowDocument
    let selection: PlotCanvasSelection
    let canUndo: Bool
    let canRedo: Bool
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onDeleteSelection: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text(document.metadata.drawingTitle)
                    .font(.headline)
                    .lineLimit(1)
                Text(document.metadata.venueName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            MetricPill(label: "Fixtures", value: "\(document.fixtureOrder.count)")
            MetricPill(label: "Positions", value: "\(document.positionOrder.count)")
            MetricPill(label: "Schema", value: "v\(document.version)")

            Divider()
                .frame(height: 22)

            Button(action: onUndo) {
                Label("Undo", systemImage: "arrow.uturn.backward")
            }
            .disabled(!canUndo)
            .keyboardShortcut("z", modifiers: .command)

            Button(action: onRedo) {
                Label("Redo", systemImage: "arrow.uturn.forward")
            }
            .disabled(!canRedo)
            .keyboardShortcut("z", modifiers: [.command, .shift])

            Button(action: onDeleteSelection) {
                Label("Delete Selection", systemImage: "trash")
            }
            .disabled(selection.isEmpty)
            .keyboardShortcut(.delete, modifiers: [])
        }
        .labelStyle(.iconOnly)
        .buttonStyle(.borderless)
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .background(Color(uiToken: .chrome))
    }
}

struct MetricPill: View {
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 6) {
            Text(label)
                .foregroundStyle(.secondary)
            Text(value)
                .fontWeight(.semibold)
        }
        .font(.caption)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(uiToken: .control))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct ToolPanel: View {
    let tool: PlotTool
    @Binding var document: PlotShowDocument
    let selection: PlotCanvasSelection
    let onAddFixtureFromLibrary: (_ profileId: String, _ positionId: String) -> Void
    let onUpdateLabelSettings: (_ settings: LabelSettings) -> Void
    let onApplyWizardPlan: (_ brief: String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label(tool.rawValue, systemImage: tool.systemImage)
                .font(.title3.weight(.semibold))

            switch tool {
            case .setup:
                SummaryRows(rows: [
                    ("Stage width", "\(document.venue.stageWidthMm) mm"),
                    ("Stage depth", "\(document.venue.stageDepthMm) mm"),
                    ("Scale", document.metadata.scaleLabel),
                ])
            case .fixtures:
                FixtureLibraryPanel(
                    document: document,
                    selection: selection,
                    onAddFixture: onAddFixtureFromLibrary
                )
            case .patch:
                PatchToolPanel(document: document)
            case .labels:
                LabelToolPanel(settings: document.labelSettings, onUpdate: onUpdateLabelSettings)
            case .wizard:
                WizardToolPanel(document: document, onApply: onApplyWizardPlan)
            case .inspector:
                SummaryRows(rows: [
                    ("Selection", selection.isEmpty ? "No selection" : "\(selection.fixtureIds.count) selected"),
                    ("Primary", selection.primaryFixtureId ?? "None"),
                    ("Validation", "N3"),
                ])
            case .reports:
                ReportsToolPanel(document: document)
            case .files:
                SummaryRows(rows: [
                    ("Open", ".plot FileDocument"),
                    ("Save", ".plot FileDocument"),
                    ("MVR import", "Not implemented"),
                ])
            }

            Spacer()
        }
        .padding(18)
        .background(Color(uiToken: .panel))
    }
}

struct SummaryRows: View {
    let rows: [(String, String)]

    var body: some View {
        VStack(spacing: 10) {
            ForEach(rows, id: \.0) { row in
                HStack {
                    Text(row.0)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(row.1)
                        .fontWeight(.medium)
                        .multilineTextAlignment(.trailing)
                }
                .font(.callout)
            }
        }
    }
}

struct InspectorRail: View {
    let document: PlotShowDocument
    let selection: PlotCanvasSelection
    @Binding var isCollapsed: Bool
    let onCommitPatch: (_ fixtureId: String, _ patch: FixtureInspectorPatch) -> Void

    var body: some View {
        Group {
            if isCollapsed {
                collapsedRail
            } else {
                expandedRail
            }
        }
        .background(Color(uiToken: .panel))
    }

    private var collapsedRail: some View {
        VStack(spacing: 14) {
            Button {
                withAnimation(.snappy(duration: 0.2)) { isCollapsed = false }
            } label: {
                Image(systemName: "sidebar.left")
                    .font(.title3)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Expand inspector")
            .help("Expand inspector")

            Text("Inspector")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .fixedSize()
                .rotationEffect(.degrees(90))

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .padding(.top, 16)
    }

    private var expandedRail: some View {
        let inspectorState = PlotInspectorValidation.state(document: document, selection: selection)

        return ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 8) {
                    Text("Inspector")
                        .font(.title3.weight(.semibold))
                    Spacer()
                    Button {
                        withAnimation(.snappy(duration: 0.2)) { isCollapsed = true }
                    } label: {
                        Image(systemName: "sidebar.right")
                    }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Collapse inspector")
                    .help("Collapse inspector")
                }

                switch inspectorState {
                case .singleFixture(let fixtureId, _), .multiFixture(let fixtureId, _, _):
                    if let fixture = document.fixtures[fixtureId] {
                        FixtureInspectorEditor(
                            document: document,
                            fixture: fixture,
                            state: inspectorState,
                            onCommitPatch: { patch in
                                onCommitPatch(fixture.id, patch)
                            }
                        )
                        .id(editorKey(for: fixture))
                    }
                case .invalidSelection(let missingFixtureId, _):
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Selection unavailable")
                            .font(.headline)
                        InspectorRow(label: "Missing fixture", value: missingFixtureId)
                        InspectorRow(label: "State", value: "Clear selection or undo")
                    }
                case .noSelection:
                    documentSummary
                }

                Divider()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Native N3")
                        .font(.headline)
                    InspectorRow(label: "State", value: stateLabel(inspectorState))
                    InspectorRow(label: "Validation", value: "Editable")
                    InspectorRow(label: "File IO", value: ".plot")
                    InspectorRow(label: "MVR", value: "Deferred")
                }
            }
            .padding(18)
        }
    }

    private var documentSummary: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Document")
                .font(.headline)
            InspectorRow(label: "Show", value: document.name)
            InspectorRow(label: "Drawing", value: document.metadata.drawingTitle)
            InspectorRow(label: "Venue", value: document.metadata.venueName)
            InspectorRow(label: "Revision", value: document.metadata.revision)
        }
    }

    private func stateLabel(_ state: PlotInspectorMode) -> String {
        switch state {
        case .noSelection:
            "No selection"
        case .singleFixture:
            "Single fixture"
        case .multiFixture(_, let selectedCount, _):
            "\(selectedCount) selected"
        case .invalidSelection:
            "Invalid selection"
        }
    }

    private func editorKey(for fixture: Fixture) -> String {
        [
            fixture.id,
            String(fixture.xMm),
            fixture.channel.map(String.init) ?? "",
            fixture.dmx?.universe.map(String.init) ?? "",
            fixture.dmx?.address.map(String.init) ?? "",
            fixture.circuit,
            fixture.dimmer,
            fixture.color,
            fixture.status,
            fixture.notes.color,
            fixture.notes.gobo,
            fixture.notes.focus,
            fixture.notes.crew,
            fixture.note,
        ].joined(separator: ":")
    }
}

struct FixtureInspectorEditor: View {
    let document: PlotShowDocument
    let fixture: Fixture
    let state: PlotInspectorMode
    let onCommitPatch: (_ patch: FixtureInspectorPatch) -> Void
    @State private var session: FixtureInspectorEditingSession
    @FocusState private var focusedField: FixtureInspectorField?

    init(
        document: PlotShowDocument,
        fixture: Fixture,
        state: PlotInspectorMode,
        onCommitPatch: @escaping (_ patch: FixtureInspectorPatch) -> Void
    ) {
        self.document = document
        self.fixture = fixture
        self.state = state
        self.onCommitPatch = onCommitPatch
        _session = State(initialValue: FixtureInspectorEditingSession(fixture: fixture))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            fixtureHeader

            editableField(.x, label: "Position", placeholder: "0'-0\"")
            editableField(.channel, label: "Channel", numeric: true)

            VStack(alignment: .leading, spacing: 8) {
                Text("DMX")
                    .font(.subheadline.weight(.semibold))
                editableField(.universe, label: "Universe", numeric: true)
                editableField(.address, label: "Address", numeric: true)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Circuit")
                    .font(.subheadline.weight(.semibold))
                editableField(.circuit, label: "Circuit", placeholder: "A1")
                editableField(.dimmer, label: "Dimmer", placeholder: "D12")
            }

            editableField(.color, label: "Color", placeholder: "R02")
            statusPicker

            VStack(alignment: .leading, spacing: 8) {
                Text("Notes")
                    .font(.subheadline.weight(.semibold))
                editableField(.colorNote, label: "Color note", multiline: true)
                editableField(.goboNote, label: "Gobo note", multiline: true)
                editableField(.focusNote, label: "Focus note", multiline: true)
                editableField(.note, label: "Crew note", multiline: true)
            }

            HStack(spacing: 8) {
                Button {
                    revertFocusedField()
                } label: {
                    Label("Revert Field", systemImage: "arrow.counterclockwise")
                }
                .disabled(focusedField == nil)
                .keyboardShortcut(.escape, modifiers: [])

                Button {
                    bumpFocusedNumeric(direction: 1)
                } label: {
                    Label("Step Up", systemImage: "chevron.up")
                }
                .disabled(!focusedFieldIsNumeric)
                .keyboardShortcut(.upArrow, modifiers: [])

                Button {
                    bumpFocusedNumeric(direction: -1)
                } label: {
                    Label("Step Down", systemImage: "chevron.down")
                }
                .disabled(!focusedFieldIsNumeric)
                .keyboardShortcut(.downArrow, modifiers: [])
            }
            .labelStyle(.iconOnly)
            .buttonStyle(.bordered)
        }
        .onChange(of: focusedField) { previousField, nextField in
            guard previousField != nextField,
                  let previousField
            else {
                return
            }
            commitPending(revertingInvalidField: previousField)
        }
    }

    private var fixtureHeader: some View {
        let profile = document.fixtureProfiles[fixture.profileId]
        return VStack(alignment: .leading, spacing: 10) {
            if case .multiFixture(_, let selectedCount, _) = state {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(selectedCount) fixtures selected")
                        .font(.subheadline.weight(.semibold))
                    Text("Editing primary fixture")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    InspectorRow(label: "Batch fields", value: "Color, status, notes")
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(uiToken: .control))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            Text("Fixture")
                .font(.headline)
            InspectorRow(label: "ID", value: fixture.id)
            InspectorRow(label: "Unit", value: fixture.unitNumber.map(String.init) ?? "None")
            InspectorRow(label: "Profile", value: [profile?.manufacturer, profile?.model].compactMap { $0 }.joined(separator: " "))
            InspectorRow(label: "Position", value: document.positions[fixture.positionId]?.name ?? "Missing")
        }
    }

    private var statusPicker: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Status")
                .font(.caption)
                .foregroundStyle(.secondary)
            Picker("Status", selection: textBinding(for: .status)) {
                Text("Planned").tag("planned")
                Text("Hung").tag("hung")
                Text("Patched").tag("patched")
                Text("Focused").tag("focused")
                Text("Needs work").tag("needs_work")
            }
            .pickerStyle(.menu)
            .onChange(of: session.draft.status) {
                commitPending()
            }
        }
    }

    private func editableField(
        _ field: FixtureInspectorField,
        label: String,
        placeholder: String = "",
        numeric: Bool = false,
        multiline: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField(
                label,
                text: textBinding(for: field),
                prompt: placeholder.isEmpty ? nil : Text(placeholder),
                axis: multiline ? .vertical : .horizontal
            )
            .textFieldStyle(.roundedBorder)
            .lineLimit(multiline ? 2...4 : 1...1)
            #if os(iOS)
            .keyboardType(numeric ? .numberPad : .default)
            #endif
            .focused($focusedField, equals: field)
            .onSubmit {
                commitPending()
                focusNextField(after: field)
            }

            if let error = session.errors[field] {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    private func textBinding(for field: FixtureInspectorField) -> Binding<String> {
        Binding(
            get: {
                session.value(for: field)
            },
            set: { value in
                session.setValue(value, for: field)
            }
        )
    }

    @discardableResult
    private func commitPending(revertingInvalidField field: FixtureInspectorField? = nil) -> Bool {
        session.commitPending(
            revertingInvalidField: field,
            onCommit: onCommitPatch
        )
    }

    private func revertFocusedField() {
        guard let focusedField else { return }
        revertField(focusedField)
    }

    private func revertField(_ field: FixtureInspectorField) {
        session.revertField(field)
    }

    private func focusNextField(after field: FixtureInspectorField) {
        focusedField = session.nextField(after: field)
    }

    private var focusedFieldIsNumeric: Bool {
        session.isNumericField(focusedField)
    }

    private func bumpFocusedNumeric(direction: Int) {
        guard let focusedField else { return }
        session.bumpNumericField(
            focusedField,
            direction: direction,
            onCommit: onCommitPatch
        )
    }
}

struct InspectorRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value.isEmpty ? "Empty" : value)
                .font(.callout)
                .lineLimit(2)
        }
    }
}

struct PlotCanvasView: View {
    @Binding var document: PlotShowDocument
    @Binding var selection: PlotCanvasSelection
    let onBeginFixtureDrag: () -> Void
    let onMoveFixture: (_ fixtureId: String, _ rawXMm: Double) -> Void
    let onEndFixtureDrag: () -> Void
    let onNudgeSelection: (_ steps: Int) -> Void
    let onSelectAdjacentFixture: (_ direction: Int, _ extending: Bool) -> Void
    let onSelectAllFixtures: () -> Void
    let onClearSelection: () -> Void
    let onDeleteSelection: () -> Void
    @State private var viewport = PlotCanvasViewport()
    @State private var panStartOffset: CGSize?
    @State private var zoomStart: CGFloat?
    @State private var activeDragFixtureId: String?
    @State private var additiveSelectionEnabled = false

    var body: some View {
        GeometryReader { proxy in
            let metrics = PlotCanvasMetrics(
                document: document,
                size: proxy.size,
                viewport: viewport
            )

            ZStack(alignment: .topLeading) {
                Canvas { context, _ in
                    drawStage(context: context, metrics: metrics)
                    drawPositions(context: context, metrics: metrics)
                    drawFixtures(context: context, metrics: metrics)
                }
                .background(Color(uiToken: .surface))
                .contentShape(Rectangle())
                .gesture(panGesture())
                .simultaneousGesture(zoomGesture())

                fixtureHitTargets(metrics: metrics)

                canvasControls
                    .padding(12)
            }
            .coordinateSpace(name: "plotCanvas")
            .focusable()
        }
    }

    private var canvasControls: some View {
        HStack(spacing: 8) {
            Button {
                viewport.reset()
            } label: {
                Label("Fit View", systemImage: "arrow.up.left.and.arrow.down.right")
            }
            .keyboardShortcut("0", modifiers: .command)

            Button {
                viewport.zoom(by: 1.2)
            } label: {
                Label("Zoom In", systemImage: "plus.magnifyingglass")
            }

            Button {
                viewport.zoom(by: 1 / 1.2)
            } label: {
                Label("Zoom Out", systemImage: "minus.magnifyingglass")
            }

            Divider()
                .frame(height: 22)

            Button {
                onSelectAdjacentFixture(-1, false)
            } label: {
                Label("Previous Fixture", systemImage: "chevron.left.2")
            }
            .disabled(document.fixtureOrder.isEmpty)
            .keyboardShortcut("[", modifiers: [])

            Button {
                onSelectAdjacentFixture(1, false)
            } label: {
                Label("Next Fixture", systemImage: "chevron.right.2")
            }
            .disabled(document.fixtureOrder.isEmpty)
            .keyboardShortcut("]", modifiers: [])

            Button {
                onSelectAllFixtures()
            } label: {
                Label("Select All Fixtures", systemImage: "checklist.checked")
            }
            .disabled(document.fixtureOrder.isEmpty)
            .keyboardShortcut("a", modifiers: .command)

            Toggle(isOn: $additiveSelectionEnabled) {
                Label("Add Selection", systemImage: "plus.square.on.square")
            }
            .toggleStyle(.button)

            Divider()
                .frame(height: 22)

            Button {
                onNudgeSelection(-1)
            } label: {
                Label("Nudge Left", systemImage: "arrow.left")
            }
            .disabled(selection.isEmpty)
            .keyboardShortcut(.leftArrow, modifiers: [])

            Button {
                onNudgeSelection(1)
            } label: {
                Label("Nudge Right", systemImage: "arrow.right")
            }
            .disabled(selection.isEmpty)
            .keyboardShortcut(.rightArrow, modifiers: [])

            Button(action: onClearSelection) {
                Label("Clear Selection", systemImage: "escape")
            }
            .disabled(selection.isEmpty)
            .keyboardShortcut(.escape, modifiers: [])

            Button(action: onDeleteSelection) {
                Label("Delete Selection", systemImage: "trash")
            }
            .disabled(selection.isEmpty)
            .keyboardShortcut(.delete, modifiers: [])
        }
        .labelStyle(.iconOnly)
        .buttonStyle(.bordered)
        .background(Color(uiToken: .chrome).opacity(0.88))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func fixtureHitTargets(metrics: PlotCanvasMetrics) -> some View {
        ForEach(document.fixtureOrder, id: \.self) { fixtureId in
            if let fixture = document.fixtures[fixtureId],
               let position = document.positions[fixture.positionId] {
                let point = metrics.map(xMm: fixture.xMm, yMm: position.yMm)
                Circle()
                    .fill(Color.clear)
                    .frame(width: 44, height: 44)
                    .contentShape(Circle())
                    .position(point)
                    .simultaneousGesture(
                        TapGesture().onEnded {
                            selection.selectFixture(fixtureId, additive: additiveSelectionEnabled)
                        }
                    )
                    .gesture(fixtureDragGesture(fixtureId: fixtureId, metrics: metrics))
                    .accessibilityLabel("Fixture \(fixture.unitNumber.map(String.init) ?? fixture.id)")
            }
        }
    }

    private func fixtureDragGesture(fixtureId: String, metrics: PlotCanvasMetrics) -> some Gesture {
        DragGesture(minimumDistance: 8, coordinateSpace: .named("plotCanvas"))
            .onChanged { value in
                if activeDragFixtureId != fixtureId {
                    activeDragFixtureId = fixtureId
                    selection.selectFixture(fixtureId)
                    onBeginFixtureDrag()
                }
                onMoveFixture(fixtureId, metrics.worldX(from: value.location))
            }
            .onEnded { _ in
                activeDragFixtureId = nil
                onEndFixtureDrag()
            }
    }

    private func panGesture() -> some Gesture {
        DragGesture(minimumDistance: 8, coordinateSpace: .named("plotCanvas"))
            .onChanged { value in
                if panStartOffset == nil {
                    panStartOffset = viewport.offset
                }
                let start = panStartOffset ?? .zero
                viewport.offset = CGSize(
                    width: start.width + value.translation.width,
                    height: start.height + value.translation.height
                )
            }
            .onEnded { _ in
                panStartOffset = nil
            }
    }

    private func zoomGesture() -> some Gesture {
        MagnificationGesture()
            .onChanged { value in
                if zoomStart == nil {
                    zoomStart = viewport.zoom
                }
                viewport.setZoom((zoomStart ?? 1) * value)
            }
            .onEnded { _ in
                zoomStart = nil
            }
    }

    private func drawStage(context: GraphicsContext, metrics: PlotCanvasMetrics) {
        let stage = metrics.stageRect

        var stagePath = Path()
        stagePath.addRoundedRect(in: stage, cornerSize: CGSize(width: 8, height: 8))
        context.fill(stagePath, with: .color(Color(uiToken: .stageFill)))
        context.stroke(stagePath, with: .color(Color(uiToken: .stageStroke)), lineWidth: 2)

        let plasterStart = metrics.map(xMm: -document.venue.stageWidthMm / 2, yMm: 0)
        let plasterEnd = metrics.map(xMm: document.venue.stageWidthMm / 2, yMm: 0)
        var plaster = Path()
        plaster.move(to: plasterStart)
        plaster.addLine(to: plasterEnd)
        context.stroke(plaster, with: .color(.orange), style: StrokeStyle(lineWidth: 2, dash: [6, 6]))

        context.draw(
            Text("Native canvas")
                .font(.caption)
                .foregroundStyle(.secondary),
            at: CGPoint(x: stage.midX, y: stage.maxY + 22)
        )
    }

    private func drawPositions(context: GraphicsContext, metrics: PlotCanvasMetrics) {
        for positionId in document.positionOrder {
            guard let position = document.positions[positionId] else { continue }
            let left = metrics.map(xMm: -position.lengthMm / 2, yMm: position.yMm)
            let right = metrics.map(xMm: position.lengthMm / 2, yMm: position.yMm)

            var path = Path()
            path.move(to: left)
            path.addLine(to: right)
            context.stroke(path, with: .color(.blue.opacity(0.75)), lineWidth: 3)

            if document.labelSettings.showPositionLabels {
                context.draw(
                    Text(position.name)
                        .font(.caption2)
                        .foregroundStyle(.primary),
                    at: CGPoint(x: left.x + 34, y: left.y - 12),
                    anchor: .leading
                )
            }
        }
    }

    private func drawFixtures(context: GraphicsContext, metrics: PlotCanvasMetrics) {
        let selectedIds = Set(selection.fixtureIds)
        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId],
                  let position = document.positions[fixture.positionId]
            else { continue }

            let point = metrics.map(xMm: fixture.xMm, yMm: position.yMm)
            let isSelected = selectedIds.contains(fixtureId)

            let profile = document.fixtureProfiles[fixture.profileId]
            let kind = FixtureGlyphKind(symbol: profile?.symbol ?? "generic")
            let radiusMm = CGFloat(profile?.radiusMm ?? 180)
            // Real-world scale, clamped so symbols stay legible/tappable at any zoom.
            let radius = min(max(radiusMm * metrics.pointsPerMm, 7), 80)
            let glyph = FixtureGlyph.paths(for: kind, radius: radius)

            let strokeColor = isSelected
                ? Color(red: 0.0, green: 0.48, blue: 0.9)
                : FixtureGlyph.defaultColor(for: kind)
            let bodyLine: CGFloat = isSelected ? 2.4 : 1.6
            let frontLine = bodyLine + 1.4

            if isSelected {
                let halo = radius * 1.7
                var ring = Path()
                ring.addEllipse(in: CGRect(x: point.x - halo, y: point.y - halo, width: 2 * halo, height: 2 * halo))
                context.fill(ring, with: .color(strokeColor.opacity(0.12)))
            }

            // Draw the glyph in a rotated, fixture-local space; labels stay upright.
            var glyphContext = context
            glyphContext.translateBy(x: point.x, y: point.y)
            glyphContext.rotate(by: .degrees(fixture.rotation))
            glyphContext.fill(glyph.body, with: .color(Color(uiToken: .stageFill)))
            glyphContext.stroke(glyph.body, with: .color(strokeColor), lineWidth: bodyLine)
            glyphContext.stroke(glyph.detail, with: .color(strokeColor), lineWidth: bodyLine)
            glyphContext.fill(glyph.solid, with: .color(strokeColor))
            glyphContext.stroke(
                glyph.front,
                with: .color(strokeColor),
                style: StrokeStyle(lineWidth: frontLine, lineCap: .round, lineJoin: .round)
            )

            if document.labelSettings.showFixtureUnit,
               let unitNumber = fixture.unitNumber {
                context.draw(
                    Text("\(unitNumber)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.primary),
                    at: CGPoint(x: point.x, y: point.y + radius + 12)
                )
            }
        }
    }
}

struct PlotCanvasViewport: Equatable {
    var zoom: CGFloat = 1
    var offset: CGSize = .zero

    mutating func reset() {
        zoom = 1
        offset = .zero
    }

    mutating func zoom(by multiplier: CGFloat) {
        setZoom(zoom * multiplier)
    }

    mutating func setZoom(_ nextZoom: CGFloat) {
        zoom = min(max(nextZoom, 0.25), 8)
    }
}

struct PlotCanvasMetrics {
    let document: PlotShowDocument
    let size: CGSize
    var viewport = PlotCanvasViewport()

    private var padding: CGFloat { 64 }

    var stageRect: CGRect {
        let scale = scaleFactor
        let width = CGFloat(document.venue.stageWidthMm) * scale
        let height = CGFloat(document.venue.stageDepthMm) * scale
        return CGRect(
            x: (size.width - width) / 2 + viewport.offset.width,
            y: (size.height - height) / 2 + viewport.offset.height,
            width: width,
            height: height
        )
    }

    private var scaleFactor: CGFloat {
        baseScaleFactor * viewport.zoom
    }

    /// Points per real-world millimetre at the current zoom, so the canvas can
    /// draw fixture symbols at their true `radiusMm` scale.
    var pointsPerMm: CGFloat { scaleFactor }

    private var baseScaleFactor: CGFloat {
        let usableWidth = max(size.width - padding * 2, 1)
        let usableHeight = max(size.height - padding * 2, 1)
        return min(
            usableWidth / CGFloat(max(document.venue.stageWidthMm, 1)),
            usableHeight / CGFloat(max(document.venue.stageDepthMm, 1))
        )
    }

    func map(xMm: Int, yMm: Int) -> CGPoint {
        let stage = stageRect
        let x = stage.midX + CGFloat(xMm) * scaleFactor
        let y = stage.minY + CGFloat(yMm) * scaleFactor
        return CGPoint(x: x, y: y)
    }

    func worldX(from point: CGPoint) -> Double {
        let stage = stageRect
        return Double((point.x - stage.midX) / scaleFactor)
    }
}

enum UIToken {
    case chrome
    case panel
    case surface
    case control
    case stageFill
    case stageStroke
}

extension Color {
    init(uiToken: UIToken) {
        switch uiToken {
        case .chrome:
            self = Color(red: 0.94, green: 0.95, blue: 0.96)
        case .panel:
            self = Color(red: 0.98, green: 0.98, blue: 0.97)
        case .surface:
            self = Color(red: 0.90, green: 0.92, blue: 0.93)
        case .control:
            self = Color(red: 0.86, green: 0.89, blue: 0.91)
        case .stageFill:
            self = Color(red: 0.99, green: 0.99, blue: 0.96)
        case .stageStroke:
            self = Color(red: 0.38, green: 0.42, blue: 0.46)
        }
    }
}
