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
    @State private var isExpanded = false

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
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .center, spacing: 10) {
                    Button {
                        withAnimation(.snappy(duration: 0.2)) {
                            isExpanded.toggle()
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "chevron.right")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .rotationEffect(.degrees(isExpanded ? 90 : 0))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(detail.displayName)
                                    .font(.subheadline.weight(.semibold))
                                    .lineLimit(1)
                                Text(detail.sourceLabel)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 8)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(profileName)
                    .accessibilityHint(isExpanded ? "Hide profile details" : "Show profile details")

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
                    .accessibilityIdentifier("fixture-add-\(entry.profile.id)")
                }

                if isExpanded {
                    FixtureProfileDetailView(detail: detail, insetPadding: 0)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
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

struct DmxOutputSafetyState: Equatable {
    private(set) var isArmed = false
    private(set) var hasActiveOutput = false

    var requiresBlackoutBeforeDisarm: Bool {
        isArmed && hasActiveOutput
    }

    mutating func arm() {
        isArmed = true
    }

    mutating func recordOutput(hasNonzeroValues: Bool) {
        if hasNonzeroValues {
            hasActiveOutput = true
        }
    }

    mutating func recordBlackout() {
        hasActiveOutput = false
    }

    mutating func completeDisarm() {
        isArmed = false
        hasActiveOutput = false
    }
}

private enum DmxOutputSendEffect: Equatable {
    case preview
    case blackout
}

struct DmxOutputToolPanel: View {
    let document: PlotShowDocument

    @Environment(\.scenePhase) private var scenePhase

    @State private var selectedFixtureId = ""
    @State private var intensity = 255
    @State private var red = 255
    @State private var green = 255
    @State private var blue = 255
    @State private var white = 0
    @State private var targetHost = "127.0.0.1"
    @State private var targetPort = "6454"
    @State private var artNetNet = 0
    @State private var artNetSubNet = 0
    @State private var artNetUniverse = 0
    @State private var safetyState = DmxOutputSafetyState()
    @State private var isSending = false
    @State private var isDisarming = false
    @State private var status = "Idle"
    @State private var errorMessage = ""

    private var fixtureIds: [String] {
        document.fixtureOrder.filter { document.fixtures[$0] != nil }
    }

    private var activeFixtureId: String? {
        if fixtureIds.contains(selectedFixtureId) {
            return selectedFixtureId
        }
        return fixtureIds.first
    }

    private var values: [String: Int] {
        [
            "intensity": intensity,
            "red": red,
            "green": green,
            "blue": blue,
            "white": white,
        ]
    }

    private var preview: DmxOutputCompilation {
        PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(
            selectedFixtureId: activeFixtureId,
            values: values
        ))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("OUTPUT TEST MODE - Not for show use")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.orange)
                .padding(.vertical, 6)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.orange.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            SummaryRows(rows: [
                ("State", safetyState.isArmed ? "Armed" : "Idle"),
                ("Universes", "\(preview.universes.count)"),
                ("Blocks", "\(preview.errors.count)"),
                ("Warnings", "\(preview.warnings.count)"),
                ("Target", "\(targetHost):\(targetPort)"),
            ])

            Picker("Fixture", selection: Binding(
                get: { activeFixtureId ?? "" },
                set: { selectedFixtureId = $0 }
            )) {
                ForEach(fixtureIds, id: \.self) { id in
                    Text(fixtureLabel(id)).tag(id)
                }
            }
            .pickerStyle(.menu)
            .disabled(fixtureIds.isEmpty)

            VStack(alignment: .leading, spacing: 8) {
                ModuleSectionTitle("Safe test values")
                Stepper("Dimmer \(intensity)", value: $intensity, in: 0...255, step: 5)
                Stepper("Red \(red)", value: $red, in: 0...255, step: 5)
                Stepper("Green \(green)", value: $green, in: 0...255, step: 5)
                Stepper("Blue \(blue)", value: $blue, in: 0...255, step: 5)
                Stepper("White \(white)", value: $white, in: 0...255, step: 5)
            }
            .font(.callout)

            VStack(alignment: .leading, spacing: 8) {
                ModuleSectionTitle("Art-Net unicast")
                TextField("Target host", text: $targetHost)
                    .textFieldStyle(.roundedBorder)
                    .autocorrectionDisabled()
                TextField("Target port", text: $targetPort)
                    .textFieldStyle(.roundedBorder)
                    #if os(iOS)
                    .keyboardType(.numberPad)
                    #endif
                Stepper("Net \(artNetNet)", value: $artNetNet, in: 0...127)
                Stepper("Sub-Net \(artNetSubNet)", value: $artNetSubNet, in: 0...15)
                Stepper("Universe \(artNetUniverse)", value: $artNetUniverse, in: 0...15)
            }
            .font(.callout)

            HStack(spacing: 8) {
                Button {
                    armOutput()
                } label: {
                    Label("Arm output", systemImage: "lock.open")
                }
                .disabled(safetyState.isArmed || preview.blocked || isDisarming)

                Button {
                    Task { await sendPreviewFrame() }
                } label: {
                    Label("Send test", systemImage: "paperplane")
                }
                .disabled(!safetyState.isArmed || preview.blocked || isSending || isDisarming)

                Button {
                    Task { await sendBlackout() }
                } label: {
                    Label("Blackout", systemImage: "power")
                }
                .disabled(!safetyState.isArmed || isSending || isDisarming)

                Button {
                    Task { await disarmOutput() }
                } label: {
                    Label("Disarm", systemImage: "lock")
                }
                .disabled(!safetyState.isArmed || isSending || isDisarming)
            }
            .buttonStyle(.bordered)

            Text("iPadOS asks for Local Network access on first UDP output. If permission is denied or the target is unreachable, this panel reports the send failure and no success is logged.")
                .font(.caption)
                .foregroundStyle(.secondary)

            if !status.isEmpty {
                Text(status)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 10) {
                    ModuleSectionTitle("Preview")
                    ForEach(preview.errors, id: \.message) { issue in
                        OutputIssueRow(issue: issue)
                    }
                    ForEach(preview.warnings, id: \.message) { issue in
                        OutputIssueRow(issue: issue)
                    }
                    ForEach(preview.universes, id: \.universe) { universe in
                        DmxUniversePreviewRow(universe: universe)
                    }
                    if preview.universes.isEmpty {
                        EmptyModuleState(title: "No patched universes", detail: "Patch a fixture with a valid universe and address before output.")
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .onAppear {
            if selectedFixtureId.isEmpty, let first = fixtureIds.first {
                selectedFixtureId = first
            }
        }
        .onChange(of: document.fixtureOrder) {
            if !fixtureIds.contains(selectedFixtureId) {
                selectedFixtureId = fixtureIds.first ?? ""
            }
        }
        .onChange(of: scenePhase) { _, nextPhase in
            guard nextPhase != .active, safetyState.isArmed else { return }
            Task { await disarmOutput(statusMessage: "Output disarmed after the app left the foreground.") }
        }
        .onDisappear {
            guard safetyState.isArmed else { return }
            Task { await disarmOutput(statusMessage: "Output disarmed after the panel closed.") }
        }
    }

    private func fixtureLabel(_ fixtureId: String) -> String {
        guard let fixture = document.fixtures[fixtureId] else { return fixtureId }
        let profile = PlotToolModules.getProfile(fixture.profileId, in: document.fixtureProfiles)
        let position = document.positions[fixture.positionId]
        let unit = fixture.unitNumber.map { "U\($0)" } ?? fixture.id
        let profileName = [profile?.manufacturer, profile?.model]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return [position?.name, unit, profileName.isEmpty ? fixture.profileId : profileName]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private func armOutput() {
        guard !preview.blocked else {
            errorMessage = "Resolve DMX output errors before arming."
            return
        }
        safetyState.arm()
        status = "Output armed. Target \(targetHost):\(targetPort) is visible."
        errorMessage = ""
    }

    @MainActor
    private func disarmOutput(statusMessage: String = "Output disarmed after blackout.") async {
        guard safetyState.isArmed, !isDisarming else { return }
        isDisarming = true
        defer { isDisarming = false }

        while isSending {
            try? await Task.sleep(for: .milliseconds(10))
        }

        if safetyState.requiresBlackoutBeforeDisarm {
            guard await sendBlackout() else {
                status = "Output remains armed because blackout failed."
                return
            }
        }

        safetyState.completeDisarm()
        status = statusMessage
        errorMessage = ""
    }

    @MainActor
    private func sendPreviewFrame() async {
        _ = await send(compilation: preview, successPrefix: "Sent test frame", effect: .preview)
    }

    @discardableResult
    @MainActor
    private func sendBlackout() async -> Bool {
        let blackout = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(
            intent: .blackout,
            selectedFixtureId: activeFixtureId,
            values: values
        ))
        return await send(
            compilation: blackout,
            successPrefix: "Sent blackout",
            effect: .blackout,
            repetitions: 3
        )
    }

    @discardableResult
    @MainActor
    private func send(
        compilation: DmxOutputCompilation,
        successPrefix: String,
        effect: DmxOutputSendEffect,
        repetitions: Int = 1
    ) async -> Bool {
        guard safetyState.isArmed else {
            errorMessage = "Arm output before sending."
            return false
        }
        guard !compilation.blocked else {
            errorMessage = "Compiler errors block all output."
            return false
        }
        guard let target = outputTarget() else {
            errorMessage = "Enter a valid target host and UDP port."
            return false
        }

        isSending = true
        errorMessage = ""
        defer { isSending = false }

        do {
            var totalBytes = 0
            var totalFrames = 0
            for _ in 0..<max(1, repetitions) {
                for universe in compilation.universes {
                    let portAddress = try mappedPortAddress(for: universe.universe)
                    let packet = try PlotDmxOutput.artNetDmxPacket(slots: universe.slots, portAddress: portAddress)
                    totalBytes += try await PlotDmxUdpSender().send(packet, to: target)
                    totalFrames += 1
                    if effect == .preview {
                        safetyState.recordOutput(hasNonzeroValues: !universe.nonZeroSlots.isEmpty)
                    }
                }
            }
            if effect == .blackout {
                safetyState.recordBlackout()
            }
            status = "\(successPrefix): \(totalFrames) universe frame(s), \(totalBytes) UDP bytes."
            return true
        } catch {
            errorMessage = localNetworkFailureMessage(error)
            status = "Output send failed."
            return false
        }
    }

    private func outputTarget() -> DmxOutputTarget? {
        guard let port = UInt16(targetPort),
              !targetHost.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return DmxOutputTarget(host: targetHost.trimmingCharacters(in: .whitespacesAndNewlines), port: port)
    }

    private func mappedPortAddress(for documentUniverse: Int) throws -> DmxArtNetPortAddress {
        let mappedUniverse = artNetUniverse + max(0, documentUniverse - 1)
        guard mappedUniverse <= 15 else {
            throw DmxOutputTransportError.invalidPortAddress
        }
        return DmxArtNetPortAddress(net: artNetNet, subNet: artNetSubNet, universe: mappedUniverse)
    }

    private func localNetworkFailureMessage(_ error: Error) -> String {
        let base = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        return "\(base). Check Local Network permission, target IP, Art-Net node power, and Wi-Fi/Ethernet membership."
    }
}

struct OutputIssueRow: View {
    let issue: DmxOutputIssue

    var body: some View {
        ModuleRowShell {
            VStack(alignment: .leading, spacing: 5) {
                Text(issue.code)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(issue.severity == "error" ? .red : .orange)
                Text(issue.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
    }
}

struct DmxUniversePreviewRow: View {
    let universe: DmxUniverseOutput

    var body: some View {
        ModuleRowShell {
            VStack(alignment: .leading, spacing: 7) {
                HStack {
                    Text("Universe \(universe.universe)")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    Text(universe.blocked ? "Blocked" : "\(universe.nonZeroSlots.count) active")
                        .font(.caption)
                        .foregroundStyle(universe.blocked ? .red : .secondary)
                }
                if universe.nonZeroSlots.isEmpty {
                    Text("All slots zero.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(universe.nonZeroSlots.prefix(8), id: \.address) { slot in
                        Text("\(slot.address): \(slot.value) \(slot.type)")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            }
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
