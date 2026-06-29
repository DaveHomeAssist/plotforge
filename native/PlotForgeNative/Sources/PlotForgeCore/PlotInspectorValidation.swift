import Foundation

public enum FixtureInspectorField: String, CaseIterable, Hashable, Sendable {
    case x
    case channel
    case universe
    case address
    case circuit
    case dimmer
    case color
    case status
    case colorNote
    case goboNote
    case focusNote
    case note
}

public struct FixtureInspectorDraft: Equatable, Sendable {
    public var x: String
    public var channel: String
    public var universe: String
    public var address: String
    public var circuit: String
    public var dimmer: String
    public var color: String
    public var status: String
    public var colorNote: String
    public var goboNote: String
    public var focusNote: String
    public var note: String

    public init(
        x: String,
        channel: String,
        universe: String,
        address: String,
        circuit: String,
        dimmer: String,
        color: String,
        status: String,
        colorNote: String,
        goboNote: String,
        focusNote: String,
        note: String
    ) {
        self.x = x
        self.channel = channel
        self.universe = universe
        self.address = address
        self.circuit = circuit
        self.dimmer = dimmer
        self.color = color
        self.status = status
        self.colorNote = colorNote
        self.goboNote = goboNote
        self.focusNote = focusNote
        self.note = note
    }
}

public struct FixtureInspectorPatch: Equatable, Sendable {
    public var fields: Set<FixtureInspectorField>
    public var xMm: Int?
    public var channel: Int?
    public var dmx: DmxAddress?
    public var circuit: String?
    public var dimmer: String?
    public var color: String?
    public var status: String?
    public var notes: FixtureNotes?
    public var note: String?

    public init(
        fields: Set<FixtureInspectorField> = [],
        xMm: Int? = nil,
        channel: Int? = nil,
        dmx: DmxAddress? = nil,
        circuit: String? = nil,
        dimmer: String? = nil,
        color: String? = nil,
        status: String? = nil,
        notes: FixtureNotes? = nil,
        note: String? = nil
    ) {
        self.fields = fields
        self.xMm = xMm
        self.channel = channel
        self.dmx = dmx
        self.circuit = circuit
        self.dimmer = dimmer
        self.color = color
        self.status = status
        self.notes = notes
        self.note = note
    }

    public var isEmpty: Bool {
        fields.isEmpty
    }

    public var hasDmxChange: Bool {
        fields.contains(.universe) || fields.contains(.address)
    }

    public var hasNotesChange: Bool {
        fields.contains(.colorNote) ||
            fields.contains(.goboNote) ||
            fields.contains(.focusNote) ||
            fields.contains(.note)
    }
}

public struct FixtureInspectorPendingPatch: Equatable, Sendable {
    public var errors: [FixtureInspectorField: String]
    public var patch: FixtureInspectorPatch?

    public init(errors: [FixtureInspectorField: String], patch: FixtureInspectorPatch?) {
        self.errors = errors
        self.patch = patch
    }
}

public enum PlotInspectorMode: Equatable, Sendable {
    case noSelection(readOnly: Bool)
    case singleFixture(fixtureId: String, readOnly: Bool)
    case multiFixture(primaryFixtureId: String, selectedCount: Int, readOnly: Bool)
    case invalidSelection(missingFixtureId: String, readOnly: Bool)
}

public enum PlotInspectorValidation {
    public static let fieldOrder: [FixtureInspectorField] = [
        .x,
        .channel,
        .universe,
        .address,
        .circuit,
        .dimmer,
        .color,
        .status,
        .colorNote,
        .goboNote,
        .focusNote,
        .note,
    ]
    public static let fixtureStatusOptions = ["planned", "hung", "patched", "focused", "needs_work"]
    public static let defaultFixtureStatus = "planned"
    public static let batchSafeFields: Set<FixtureInspectorField> = [
        .color,
        .status,
        .colorNote,
        .goboNote,
        .focusNote,
        .note,
    ]

    public static func state(
        document: PlotShowDocument,
        selection: PlotCanvasSelection,
        readOnly: Bool = false
    ) -> PlotInspectorMode {
        guard let primaryFixtureId = selection.primaryFixtureId else {
            return .noSelection(readOnly: readOnly)
        }
        if let missingFixtureId = selection.fixtureIds.first(where: { document.fixtures[$0] == nil }) {
            return .invalidSelection(missingFixtureId: missingFixtureId, readOnly: readOnly)
        }
        if selection.fixtureIds.count > 1 {
            return .multiFixture(
                primaryFixtureId: primaryFixtureId,
                selectedCount: selection.fixtureIds.count,
                readOnly: readOnly
            )
        }
        return .singleFixture(fixtureId: primaryFixtureId, readOnly: readOnly)
    }

    public static func draft(from fixture: Fixture) -> FixtureInspectorDraft {
        let notes = normalizedNotes(fixture.notes, legacyNote: fixture.note)
        return FixtureInspectorDraft(
            x: formatImperial(fixture.xMm),
            channel: fixture.channel.map(String.init) ?? "",
            universe: fixture.dmx?.universe.map(String.init) ?? "",
            address: fixture.dmx?.address.map(String.init) ?? "",
            circuit: normalizedCircuitValue(fixture.circuit),
            dimmer: normalizedCircuitValue(fixture.dimmer),
            color: fixture.color,
            status: normalizedFixtureStatus(fixture.status),
            colorNote: notes.color,
            goboNote: notes.gobo,
            focusNote: notes.focus,
            note: notes.crew
        )
    }

    public static func value(
        for field: FixtureInspectorField,
        in draft: FixtureInspectorDraft
    ) -> String {
        switch field {
        case .x:
            draft.x
        case .channel:
            draft.channel
        case .universe:
            draft.universe
        case .address:
            draft.address
        case .circuit:
            draft.circuit
        case .dimmer:
            draft.dimmer
        case .color:
            draft.color
        case .status:
            draft.status
        case .colorNote:
            draft.colorNote
        case .goboNote:
            draft.goboNote
        case .focusNote:
            draft.focusNote
        case .note:
            draft.note
        }
    }

    public static func updating(
        _ draft: FixtureInspectorDraft,
        field: FixtureInspectorField,
        value: String
    ) -> FixtureInspectorDraft {
        var next = draft
        switch field {
        case .x:
            next.x = value
        case .channel:
            next.channel = value
        case .universe:
            next.universe = value
        case .address:
            next.address = value
        case .circuit:
            next.circuit = value
        case .dimmer:
            next.dimmer = value
        case .color:
            next.color = value
        case .status:
            next.status = value
        case .colorNote:
            next.colorNote = value
        case .goboNote:
            next.goboNote = value
        case .focusNote:
            next.focusNote = value
        case .note:
            next.note = value
        }
        return next
    }

    public static func bumpedNumericField(
        _ field: FixtureInspectorField,
        direction: Int,
        step: Int = 1,
        dmxFootprint: Int = 1,
        draft: FixtureInspectorDraft,
        committed: FixtureInspectorDraft
    ) -> FixtureInspectorDraft {
        guard direction != 0,
              let limits = numericLimits(for: field, dmxFootprint: dmxFootprint)
        else {
            return draft
        }

        let draftValue = parseIntegerDraft(
            value(for: field, in: draft),
            limits: limits
        ).value
        let committedValue = parseIntegerDraft(
            value(for: field, in: committed),
            limits: limits
        ).value
        let base = draftValue ?? committedValue ?? limits.min
        let nextValue = clamp(base + direction * max(1, step), min: limits.min, max: limits.max)
        return updating(draft, field: field, value: String(nextValue))
    }

    public static func buildPendingPatch(
        fixture: Fixture,
        draft: FixtureInspectorDraft,
        dmxFootprint: Int = 1
    ) -> FixtureInspectorPendingPatch {
        let committed = Self.draft(from: fixture)
        var errors: [FixtureInspectorField: String] = [:]
        var patch = FixtureInspectorPatch()

        let xMm = parseImperial(draft.x)
        let channel = parseIntegerDraft(draft.channel, limits: numericLimits(for: .channel, dmxFootprint: dmxFootprint)!)
        let universe = parseIntegerDraft(draft.universe, limits: numericLimits(for: .universe, dmxFootprint: dmxFootprint)!)
        let address = parseIntegerDraft(draft.address, limits: numericLimits(for: .address, dmxFootprint: dmxFootprint)!)

        if xMm == nil {
            errors[.x] = "Use feet and inches, like 2'-6\"."
        }
        if let error = channel.error {
            errors[.channel] = error
        }
        if let error = universe.error {
            errors[.universe] = error
        }
        if let error = address.error {
            errors[.address] = error
        }

        if errors[.x] == nil,
           draft.x != committed.x,
           xMm != fixture.xMm {
            patch.fields.insert(.x)
            patch.xMm = xMm
        }

        if errors[.channel] == nil,
           draft.channel != committed.channel,
           channel.value != fixture.channel {
            patch.fields.insert(.channel)
            patch.channel = channel.value
        }

        let universeChanged = draft.universe != committed.universe
        let addressChanged = draft.address != committed.address
        var nextUniverse = fixture.dmx?.universe
        var nextAddress = fixture.dmx?.address
        var dmxHasValidChange = false

        if universeChanged && errors[.universe] == nil {
            nextUniverse = universe.value
            if nextUniverse == nil {
                nextAddress = nil
            }
            patch.fields.insert(.universe)
            dmxHasValidChange = true
        }

        if addressChanged && errors[.address] == nil {
            if nextUniverse == nil && address.value != nil {
                errors[.address] = "Set universe before address."
            } else {
                nextAddress = address.value
                patch.fields.insert(.address)
                dmxHasValidChange = true
            }
        }

        if dmxHasValidChange && errors[.address] == nil {
            let nextDmx = nextUniverse.map { DmxAddress(universe: $0, address: nextAddress) }
            if !sameDmx(nextDmx, fixture.dmx) {
                patch.dmx = nextDmx
            } else {
                patch.fields.remove(.universe)
                patch.fields.remove(.address)
            }
        } else if dmxHasValidChange && universeChanged && errors[.universe] == nil {
            let nextDmx = nextUniverse.map { DmxAddress(universe: $0, address: nextAddress) }
            if !sameDmx(nextDmx, fixture.dmx) {
                patch.dmx = nextDmx
            }
        }

        let circuit = normalizedCircuitValue(draft.circuit)
        let dimmer = normalizedCircuitValue(draft.dimmer)
        if draft.circuit != committed.circuit,
           circuit != fixture.circuit {
            patch.fields.insert(.circuit)
            patch.circuit = circuit
        }
        if draft.dimmer != committed.dimmer,
           dimmer != fixture.dimmer {
            patch.fields.insert(.dimmer)
            patch.dimmer = dimmer
        }
        if draft.color != committed.color,
           draft.color != fixture.color {
            patch.fields.insert(.color)
            patch.color = draft.color
        }

        let nextNotes = normalizedNotes(
            FixtureNotes(
                color: draft.colorNote,
                gobo: draft.goboNote,
                focus: draft.focusNote,
                crew: draft.note
            )
        )
        if nextNotes != normalizedNotes(fixture.notes, legacyNote: fixture.note) {
            if draft.colorNote != committed.colorNote {
                patch.fields.insert(.colorNote)
            }
            if draft.goboNote != committed.goboNote {
                patch.fields.insert(.goboNote)
            }
            if draft.focusNote != committed.focusNote {
                patch.fields.insert(.focusNote)
            }
            if draft.note != committed.note {
                patch.fields.insert(.note)
            }
            patch.notes = nextNotes
            patch.note = nextNotes.crew
        }

        let status = normalizedFixtureStatus(draft.status)
        if draft.status != committed.status,
           status != normalizedFixtureStatus(fixture.status) {
            patch.fields.insert(.status)
            patch.status = status
        }

        return FixtureInspectorPendingPatch(
            errors: errors,
            patch: patch.isEmpty ? nil : patch
        )
    }

    public static func apply(
        patch: FixtureInspectorPatch,
        to document: PlotShowDocument,
        fixtureId: String,
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        guard var fixture = document.fixtures[fixtureId] else { return document }
        var next = document

        if patch.fields.contains(.x), let xMm = patch.xMm {
            fixture.xMm = xMm
        }
        if patch.fields.contains(.channel) {
            fixture.channel = patch.channel
        }
        if patch.hasDmxChange {
            fixture.dmx = patch.dmx
        }
        if patch.fields.contains(.circuit), let circuit = patch.circuit {
            fixture.circuit = circuit
        }
        if patch.fields.contains(.dimmer), let dimmer = patch.dimmer {
            fixture.dimmer = dimmer
        }
        if patch.fields.contains(.color), let color = patch.color {
            fixture.color = color
        }
        if patch.fields.contains(.status), let status = patch.status {
            fixture.status = normalizedFixtureStatus(status)
        }
        if patch.hasNotesChange, let notes = patch.notes {
            var nextNotes = normalizedNotes(fixture.notes, legacyNote: fixture.note)
            if patch.fields.contains(.colorNote) {
                nextNotes.color = notes.color
            }
            if patch.fields.contains(.goboNote) {
                nextNotes.gobo = notes.gobo
            }
            if patch.fields.contains(.focusNote) {
                nextNotes.focus = notes.focus
            }
            if patch.fields.contains(.note) {
                nextNotes.crew = notes.crew
            }
            fixture.notes = nextNotes
            if patch.fields.contains(.note) {
                fixture.note = patch.note ?? nextNotes.crew
            }
        }

        guard fixture != document.fixtures[fixtureId] else { return document }
        next.updatedAt = updatedAt ?? currentTimestampMilliseconds()
        next.fixtures[fixtureId] = fixture

        if patch.fields.contains(.x) {
            return PlotDocumentEditing.renumberPosition(in: next, positionId: fixture.positionId)
        }
        return next
    }

    public static func batchSafePatch(from patch: FixtureInspectorPatch) -> FixtureInspectorPatch {
        let fields = patch.fields.intersection(batchSafeFields)
        guard !fields.isEmpty else { return FixtureInspectorPatch() }

        return FixtureInspectorPatch(
            fields: fields,
            color: fields.contains(.color) ? patch.color : nil,
            status: fields.contains(.status) ? patch.status : nil,
            notes: patch.hasNotesChange ? patch.notes : nil,
            note: fields.contains(.note) ? patch.note : nil
        )
    }

    public static func applyBatchSafe(
        patch: FixtureInspectorPatch,
        to document: PlotShowDocument,
        fixtureIds: [String],
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        let safePatch = batchSafePatch(from: patch)
        guard !safePatch.isEmpty else { return document }

        var next = document
        var didChange = false
        for fixtureId in fixtureIds {
            let updated = apply(
                patch: safePatch,
                to: next,
                fixtureId: fixtureId,
                updatedAt: updatedAt
            )
            if updated != next {
                didChange = true
                next = updated
            }
        }

        return didChange ? next : document
    }

    public static func normalizedFixtureStatus(_ status: String) -> String {
        fixtureStatusOptions.contains(status) ? status : defaultFixtureStatus
    }

    public static func normalizedNotes(
        _ notes: FixtureNotes,
        legacyNote: String = ""
    ) -> FixtureNotes {
        FixtureNotes(
            color: notes.color,
            gobo: notes.gobo,
            focus: notes.focus,
            crew: notes.crew.isEmpty ? legacyNote : notes.crew
        )
    }

    public static func normalizedCircuitValue(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
    }

    public static func parseImperial(_ input: String) -> Int? {
        var value = normalizeImperialInput(input)
        guard !value.isEmpty else { return nil }

        if let shorthand = captureGroups(#"^(-?\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$"#, in: value),
           shorthand.count == 2 {
            value = "\(shorthand[0])'-\(shorthand[1])\""
        }

        if let feetMatch = captureGroups(#"^(-?\d+(?:\.\d+)?)\s*'(?:\s*-?\s*(\d+(?:\.\d+)?)\s*"?\s*)?$"#, in: value),
           let feet = Double(feetMatch[0]) {
            let inches = feetMatch.count > 1 ? Double(feetMatch[1]) ?? 0 : 0
            let sign: Double = feet < 0 ? -1 : 1
            return Int((sign * (abs(feet) * 304.8 + inches * 25.4)).rounded())
        }

        if let inchesMatch = captureGroups(#"^(-?\d+(?:\.\d+)?)\s*"$"#, in: value),
           let inches = Double(inchesMatch[0]) {
            return Int((inches * 25.4).rounded())
        }

        return nil
    }

    public static func formatImperial(_ millimeters: Int?) -> String {
        guard let millimeters else { return "" }
        let sign = millimeters < 0 ? "-" : ""
        let totalInches = abs(Double(millimeters) / 25.4)
        var feet = floor(totalInches / 12)
        var inches = (totalInches - feet * 12).roundedToTenths()

        if inches >= 12 {
            feet += 1
            inches = 0
        }

        if feet == 0 {
            return "\(sign)\(formatDecimal(inches))\""
        }
        return "\(sign)\(Int(feet))'-\(formatDecimal(inches))\""
    }
}

private struct NumericLimits {
    var min: Int
    var max: Int
    var label: String
}

private func numericLimits(for field: FixtureInspectorField, dmxFootprint: Int = 1) -> NumericLimits? {
    switch field {
    case .channel:
        NumericLimits(min: 1, max: 9_999, label: "Channel")
    case .universe:
        NumericLimits(min: 1, max: 63, label: "Universe")
    case .address:
        NumericLimits(min: 1, max: max(1, 513 - max(1, dmxFootprint)), label: "Address")
    default:
        nil
    }
}

private func clamp(_ value: Int, min: Int, max: Int) -> Int {
    Swift.max(min, Swift.min(value, max))
}

private struct ParsedIntegerDraft {
    var value: Int?
    var error: String?
}

private func parseIntegerDraft(_ value: String, limits: NumericLimits) -> ParsedIntegerDraft {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
        return ParsedIntegerDraft(value: nil, error: nil)
    }
    guard trimmed.range(of: #"^\d+$"#, options: .regularExpression) != nil,
          let parsed = Int(trimmed)
    else {
        return ParsedIntegerDraft(value: nil, error: "\(limits.label) must be a whole number.")
    }
    guard parsed >= limits.min && parsed <= limits.max else {
        return ParsedIntegerDraft(value: nil, error: "\(limits.label) must be \(limits.min) to \(limits.max).")
    }
    return ParsedIntegerDraft(value: parsed, error: nil)
}

private func sameDmx(_ lhs: DmxAddress?, _ rhs: DmxAddress?) -> Bool {
    lhs?.universe == rhs?.universe &&
        lhs?.address == rhs?.address
}

private func currentTimestampMilliseconds() -> Int64 {
    Int64(Date().timeIntervalSince1970 * 1000)
}

private func normalizeImperialInput(_ input: String) -> String {
    input
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .replacingOccurrences(of: "\u{2019}", with: "'")
        .replacingOccurrences(of: "\u{2032}", with: "'")
        .replacingOccurrences(of: "\u{201C}", with: "\"")
        .replacingOccurrences(of: "\u{201D}", with: "\"")
        .replacingOccurrences(of: "\u{2033}", with: "\"")
        .replacingOccurrences(
            of: #"\b(feet|foot|ft)\b"#,
            with: "'",
            options: [.regularExpression, .caseInsensitive]
        )
        .replacingOccurrences(
            of: #"\b(inches|inch|in)\b"#,
            with: "\"",
            options: [.regularExpression, .caseInsensitive]
        )
        .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
}

private func captureGroups(_ pattern: String, in value: String) -> [String]? {
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
    let range = NSRange(value.startIndex..<value.endIndex, in: value)
    guard let match = regex.firstMatch(in: value, range: range),
          match.range.location != NSNotFound,
          match.range.length == range.length
    else {
        return nil
    }

    var groups: [String] = []
    for index in 1..<match.numberOfRanges {
        let groupRange = match.range(at: index)
        if groupRange.location == NSNotFound {
            continue
        }
        guard let swiftRange = Range(groupRange, in: value) else { continue }
        groups.append(String(value[swiftRange]))
    }
    return groups
}

private func formatDecimal(_ value: Double) -> String {
    if value.rounded(.towardZero) == value {
        return String(Int(value))
    }
    return String(format: "%.1f", value)
}

private extension Double {
    func roundedToTenths() -> Double {
        (self * 10).rounded() / 10
    }
}
