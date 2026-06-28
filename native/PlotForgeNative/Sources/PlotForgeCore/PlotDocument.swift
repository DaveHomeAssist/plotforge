import Foundation

public let plotDocumentVersion = 9

public struct PlotShowDocument: Codable, Equatable, Sendable {
    public var version: Int
    public var id: String
    public var name: String
    public var metadata: ProjectMetadata
    public var createdAt: Int64
    public var updatedAt: Int64
    public var venue: Venue
    public var positions: [String: Position]
    public var positionOrder: [String]
    public var fixtures: [String: Fixture]
    public var fixtureOrder: [String]
    public var fixtureProfiles: [String: FixtureProfile]
    public var revisions: [String: Revision]
    public var revisionOrder: [String]
    public var activeRevisionId: String?
    public var commentPins: [String: CommentPin]
    public var commentPinOrder: [String]
    public var oscBridge: OscBridgeSettings
    public var labelSettings: LabelSettings
    public var extraFields: [String: JSONValue]

    public init(
        version: Int = plotDocumentVersion,
        id: String = "show_native",
        name: String = "Untitled Show",
        metadata: ProjectMetadata = ProjectMetadata(),
        createdAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        updatedAt: Int64 = Int64(Date().timeIntervalSince1970 * 1000),
        venue: Venue = Venue(),
        positions: [String: Position] = [:],
        positionOrder: [String] = [],
        fixtures: [String: Fixture] = [:],
        fixtureOrder: [String] = [],
        fixtureProfiles: [String: FixtureProfile] = [:],
        revisions: [String: Revision] = [:],
        revisionOrder: [String] = [],
        activeRevisionId: String? = nil,
        commentPins: [String: CommentPin] = [:],
        commentPinOrder: [String] = [],
        oscBridge: OscBridgeSettings = OscBridgeSettings(),
        labelSettings: LabelSettings = LabelSettings(),
        extraFields: [String: JSONValue] = [:]
    ) {
        self.version = version
        self.id = id
        self.name = name
        self.metadata = metadata
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.venue = venue
        self.positions = positions
        self.positionOrder = positionOrder
        self.fixtures = fixtures
        self.fixtureOrder = fixtureOrder
        self.fixtureProfiles = fixtureProfiles
        self.revisions = revisions
        self.revisionOrder = revisionOrder
        self.activeRevisionId = activeRevisionId
        self.commentPins = commentPins
        self.commentPinOrder = commentPinOrder
        self.oscBridge = oscBridge
        self.labelSettings = labelSettings
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case version
        case id
        case name
        case metadata
        case createdAt
        case updatedAt
        case venue
        case positions
        case positionOrder
        case fixtures
        case fixtureOrder
        case fixtureProfiles
        case revisions
        case revisionOrder
        case activeRevisionId
        case commentPins
        case commentPinOrder
        case oscBridge
        case labelSettings
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(Int.self, forKey: .version) ?? 0
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? "show_imported"
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Untitled Show"
        metadata = try container.decodeIfPresent(ProjectMetadata.self, forKey: .metadata) ?? ProjectMetadata()
        createdAt = try container.decodeIfPresent(Int64.self, forKey: .createdAt) ?? 0
        updatedAt = try container.decodeIfPresent(Int64.self, forKey: .updatedAt) ?? 0
        venue = try container.decodeIfPresent(Venue.self, forKey: .venue) ?? Venue()
        positions = try container.decodeIfPresent([String: Position].self, forKey: .positions) ?? [:]
        positionOrder = try container.decodeIfPresent([String].self, forKey: .positionOrder) ?? []
        fixtures = try container.decodeIfPresent([String: Fixture].self, forKey: .fixtures) ?? [:]
        fixtureOrder = try container.decodeIfPresent([String].self, forKey: .fixtureOrder) ?? []
        fixtureProfiles = try container.decodeIfPresent([String: FixtureProfile].self, forKey: .fixtureProfiles) ?? [:]
        revisions = try container.decodeIfPresent([String: Revision].self, forKey: .revisions) ?? [:]
        revisionOrder = try container.decodeIfPresent([String].self, forKey: .revisionOrder) ?? []
        activeRevisionId = try container.decodeIfPresent(String.self, forKey: .activeRevisionId)
        commentPins = try container.decodeIfPresent([String: CommentPin].self, forKey: .commentPins) ?? [:]
        commentPinOrder = try container.decodeIfPresent([String].self, forKey: .commentPinOrder) ?? []
        oscBridge = try container.decodeIfPresent(OscBridgeSettings.self, forKey: .oscBridge) ?? OscBridgeSettings()
        labelSettings = try container.decodeIfPresent(LabelSettings.self, forKey: .labelSettings) ?? LabelSettings()
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
        if version < plotDocumentVersion {
            version = plotDocumentVersion
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(version, forKey: .version)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(metadata, forKey: .metadata)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
        try container.encode(venue, forKey: .venue)
        try container.encode(positions, forKey: .positions)
        try container.encode(positionOrder, forKey: .positionOrder)
        try container.encode(fixtures, forKey: .fixtures)
        try container.encode(fixtureOrder, forKey: .fixtureOrder)
        try container.encode(fixtureProfiles, forKey: .fixtureProfiles)
        try container.encode(revisions, forKey: .revisions)
        try container.encode(revisionOrder, forKey: .revisionOrder)
        try container.encodeIfPresent(activeRevisionId, forKey: .activeRevisionId)
        try container.encode(commentPins, forKey: .commentPins)
        try container.encode(commentPinOrder, forKey: .commentPinOrder)
        try container.encode(oscBridge, forKey: .oscBridge)
        try container.encode(labelSettings, forKey: .labelSettings)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct ProjectMetadata: Codable, Equatable, Sendable {
    public var drawingTitle: String
    public var venueName: String
    public var company: String
    public var designer: String
    public var draftsperson: String
    public var showDate: String
    public var revision: String
    public var scaleLabel: String
    public var extraFields: [String: JSONValue]

    public init(
        drawingTitle: String = "Lighting Plot",
        venueName: String = "Studio A",
        company: String = "",
        designer: String = "",
        draftsperson: String = "",
        showDate: String = "",
        revision: String = "Draft",
        scaleLabel: String = "1/4\" = 1'-0\"",
        extraFields: [String: JSONValue] = [:]
    ) {
        self.drawingTitle = drawingTitle
        self.venueName = venueName
        self.company = company
        self.designer = designer
        self.draftsperson = draftsperson
        self.showDate = showDate
        self.revision = revision
        self.scaleLabel = scaleLabel
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case drawingTitle
        case venueName
        case company
        case designer
        case draftsperson
        case showDate
        case revision
        case scaleLabel
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        drawingTitle = try container.decodeIfPresent(String.self, forKey: .drawingTitle) ?? "Lighting Plot"
        venueName = try container.decodeIfPresent(String.self, forKey: .venueName) ?? "Studio A"
        company = try container.decodeIfPresent(String.self, forKey: .company) ?? ""
        designer = try container.decodeIfPresent(String.self, forKey: .designer) ?? ""
        draftsperson = try container.decodeIfPresent(String.self, forKey: .draftsperson) ?? ""
        showDate = try container.decodeIfPresent(String.self, forKey: .showDate) ?? ""
        revision = try container.decodeIfPresent(String.self, forKey: .revision) ?? "Draft"
        scaleLabel = try container.decodeIfPresent(String.self, forKey: .scaleLabel) ?? "1/4\" = 1'-0\""
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(drawingTitle, forKey: .drawingTitle)
        try container.encode(venueName, forKey: .venueName)
        try container.encode(company, forKey: .company)
        try container.encode(designer, forKey: .designer)
        try container.encode(draftsperson, forKey: .draftsperson)
        try container.encode(showDate, forKey: .showDate)
        try container.encode(revision, forKey: .revision)
        try container.encode(scaleLabel, forKey: .scaleLabel)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct Venue: Codable, Equatable, Sendable {
    public var stageWidthMm: Int
    public var stageDepthMm: Int
    public var proscWidthMm: Int
    public var extraFields: [String: JSONValue]

    public init(
        stageWidthMm: Int = 10_973,
        stageDepthMm: Int = 6_706,
        proscWidthMm: Int = 9_144,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.stageWidthMm = stageWidthMm
        self.stageDepthMm = stageDepthMm
        self.proscWidthMm = proscWidthMm
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case stageWidthMm
        case stageDepthMm
        case proscWidthMm
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        stageWidthMm = try container.decodeIfPresent(Int.self, forKey: .stageWidthMm) ?? 10_973
        stageDepthMm = try container.decodeIfPresent(Int.self, forKey: .stageDepthMm) ?? 6_706
        proscWidthMm = try container.decodeIfPresent(Int.self, forKey: .proscWidthMm) ?? 9_144
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(stageWidthMm, forKey: .stageWidthMm)
        try container.encode(stageDepthMm, forKey: .stageDepthMm)
        try container.encode(proscWidthMm, forKey: .proscWidthMm)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct Position: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var kind: String
    public var yMm: Int
    public var lengthMm: Int
    public var trimMm: Int?
    public var extraFields: [String: JSONValue]

    public init(
        id: String,
        name: String,
        kind: String = "pipe",
        yMm: Int,
        lengthMm: Int,
        trimMm: Int? = nil,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.name = name
        self.kind = kind
        self.yMm = yMm
        self.lengthMm = lengthMm
        self.trimMm = trimMm
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case name
        case kind
        case yMm
        case lengthMm
        case trimMm
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Position"
        kind = try container.decodeIfPresent(String.self, forKey: .kind) ?? "pipe"
        yMm = try container.decodeIfPresent(Int.self, forKey: .yMm) ?? 0
        lengthMm = try container.decodeIfPresent(Int.self, forKey: .lengthMm) ?? 0
        trimMm = try container.decodeIfPresent(Int.self, forKey: .trimMm)
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(kind, forKey: .kind)
        try container.encode(yMm, forKey: .yMm)
        try container.encode(lengthMm, forKey: .lengthMm)
        try container.encodeIfPresent(trimMm, forKey: .trimMm)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct Fixture: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var positionId: String
    public var profileId: String
    public var xMm: Int
    public var rotation: Double
    public var focus: FocusPoint?
    public var unitNumber: Int?
    public var channel: Int?
    public var dmx: DmxAddress?
    public var color: String
    public var gobo: String
    public var note: String
    public var notes: FixtureNotes
    public var status: String
    public var circuit: String
    public var dimmer: String
    public var extraFields: [String: JSONValue]

    public init(
        id: String,
        positionId: String,
        profileId: String,
        xMm: Int,
        rotation: Double = 0,
        focus: FocusPoint? = nil,
        unitNumber: Int? = nil,
        channel: Int? = nil,
        dmx: DmxAddress? = nil,
        color: String = "",
        gobo: String = "",
        note: String = "",
        notes: FixtureNotes = FixtureNotes(),
        status: String = "planned",
        circuit: String = "",
        dimmer: String = "",
        extraFields: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.positionId = positionId
        self.profileId = profileId
        self.xMm = xMm
        self.rotation = rotation
        self.focus = focus
        self.unitNumber = unitNumber
        self.channel = channel
        self.dmx = dmx
        self.color = color
        self.gobo = gobo
        self.note = note
        self.notes = notes
        self.status = status
        self.circuit = circuit
        self.dimmer = dimmer
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case positionId
        case profileId
        case xMm
        case rotation
        case focus
        case unitNumber
        case channel
        case dmx
        case color
        case gobo
        case note
        case notes
        case status
        case circuit
        case dimmer
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        positionId = try container.decode(String.self, forKey: .positionId)
        profileId = try container.decode(String.self, forKey: .profileId)
        xMm = try container.decode(Int.self, forKey: .xMm)
        rotation = try container.decodeIfPresent(Double.self, forKey: .rotation) ?? 0
        focus = try container.decodeIfPresent(FocusPoint.self, forKey: .focus)
        unitNumber = try container.decodeIfPresent(Int.self, forKey: .unitNumber)
        channel = try container.decodeIfPresent(Int.self, forKey: .channel)
        dmx = try container.decodeIfPresent(DmxAddress.self, forKey: .dmx)
        color = try container.decodeIfPresent(String.self, forKey: .color) ?? ""
        gobo = try container.decodeIfPresent(String.self, forKey: .gobo) ?? ""
        note = try container.decodeIfPresent(String.self, forKey: .note) ?? ""
        notes = try container.decodeIfPresent(FixtureNotes.self, forKey: .notes) ?? FixtureNotes(crew: note)
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? "planned"
        circuit = try container.decodeIfPresent(String.self, forKey: .circuit) ?? ""
        dimmer = try container.decodeIfPresent(String.self, forKey: .dimmer) ?? ""
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(positionId, forKey: .positionId)
        try container.encode(profileId, forKey: .profileId)
        try container.encode(xMm, forKey: .xMm)
        try container.encode(rotation, forKey: .rotation)
        try container.encodeIfPresent(focus, forKey: .focus)
        try container.encodeIfPresent(unitNumber, forKey: .unitNumber)
        try container.encodeIfPresent(channel, forKey: .channel)
        try container.encodeIfPresent(dmx, forKey: .dmx)
        try container.encode(color, forKey: .color)
        try container.encode(gobo, forKey: .gobo)
        try container.encode(note, forKey: .note)
        try container.encode(notes, forKey: .notes)
        try container.encode(status, forKey: .status)
        try container.encode(circuit, forKey: .circuit)
        try container.encode(dimmer, forKey: .dimmer)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct DmxAddress: Codable, Equatable, Sendable {
    public var universe: Int?
    public var address: Int?
    public var extraFields: [String: JSONValue]

    public init(universe: Int?, address: Int?, extraFields: [String: JSONValue] = [:]) {
        self.universe = universe
        self.address = address
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case universe
        case address
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        universe = try container.decodeIfPresent(Int.self, forKey: .universe)
        address = try container.decodeIfPresent(Int.self, forKey: .address)
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(universe, forKey: .universe)
        try container.encode(address, forKey: .address)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct FocusPoint: Codable, Equatable, Sendable {
    public var xMm: Int
    public var yMm: Int
    public var extraFields: [String: JSONValue]

    public init(xMm: Int, yMm: Int, extraFields: [String: JSONValue] = [:]) {
        self.xMm = xMm
        self.yMm = yMm
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case xMm
        case yMm
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        xMm = try container.decodeIfPresent(Int.self, forKey: .xMm) ?? 0
        yMm = try container.decodeIfPresent(Int.self, forKey: .yMm) ?? 0
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(xMm, forKey: .xMm)
        try container.encode(yMm, forKey: .yMm)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct FixtureNotes: Codable, Equatable, Sendable {
    public var color: String
    public var gobo: String
    public var focus: String
    public var crew: String
    public var extraFields: [String: JSONValue]

    public init(
        color: String = "",
        gobo: String = "",
        focus: String = "",
        crew: String = "",
        extraFields: [String: JSONValue] = [:]
    ) {
        self.color = color
        self.gobo = gobo
        self.focus = focus
        self.crew = crew
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case color
        case gobo
        case focus
        case crew
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        color = try container.decodeIfPresent(String.self, forKey: .color) ?? ""
        gobo = try container.decodeIfPresent(String.self, forKey: .gobo) ?? ""
        focus = try container.decodeIfPresent(String.self, forKey: .focus) ?? ""
        crew = try container.decodeIfPresent(String.self, forKey: .crew) ?? ""
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(color, forKey: .color)
        try container.encode(gobo, forKey: .gobo)
        try container.encode(focus, forKey: .focus)
        try container.encode(crew, forKey: .crew)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct FixtureProfile: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var manufacturer: String
    public var model: String
    public var symbol: String
    public var category: String
    public var radiusMm: Int
    public var dmxFootprint: Int
    public var color: String?
    public var defaultMode: String
    public var modes: [FixtureMode]
    public var info: FixtureProfileInfo?
    public var libraryTier: String?
    public var source: [String: JSONValue]?
    public var extraFields: [String: JSONValue]

    public init(
        id: String,
        manufacturer: String,
        model: String,
        symbol: String,
        category: String,
        radiusMm: Int,
        dmxFootprint: Int,
        color: String? = nil,
        defaultMode: String = "Default",
        modes: [FixtureMode] = [],
        info: FixtureProfileInfo? = nil,
        libraryTier: String? = nil,
        source: [String: JSONValue]? = nil,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.manufacturer = manufacturer
        self.model = model
        self.symbol = symbol
        self.category = category
        self.radiusMm = radiusMm
        self.dmxFootprint = dmxFootprint
        self.color = color
        self.defaultMode = defaultMode
        self.modes = modes
        self.info = info
        self.libraryTier = libraryTier
        self.source = source
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case manufacturer
        case model
        case symbol
        case category
        case radiusMm
        case dmxFootprint
        case color
        case defaultMode
        case modes
        case info
        case libraryTier
        case source
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        manufacturer = try container.decodeIfPresent(String.self, forKey: .manufacturer) ?? ""
        model = try container.decodeIfPresent(String.self, forKey: .model) ?? "Unknown"
        symbol = try container.decodeIfPresent(String.self, forKey: .symbol) ?? "generic"
        category = try container.decodeIfPresent(String.self, forKey: .category) ?? "fixture"
        radiusMm = try container.decodeIfPresent(Int.self, forKey: .radiusMm) ?? 180
        dmxFootprint = try container.decodeIfPresent(Int.self, forKey: .dmxFootprint) ?? 1
        color = try container.decodeIfPresent(String.self, forKey: .color)
        defaultMode = try container.decodeIfPresent(String.self, forKey: .defaultMode) ?? "Default"
        modes = try container.decodeIfPresent([FixtureMode].self, forKey: .modes) ?? []
        info = try container.decodeIfPresent(FixtureProfileInfo.self, forKey: .info)
        libraryTier = try container.decodeIfPresent(String.self, forKey: .libraryTier)
        source = try container.decodeIfPresent([String: JSONValue].self, forKey: .source)
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(manufacturer, forKey: .manufacturer)
        try container.encode(model, forKey: .model)
        try container.encode(symbol, forKey: .symbol)
        try container.encode(category, forKey: .category)
        try container.encode(radiusMm, forKey: .radiusMm)
        try container.encode(dmxFootprint, forKey: .dmxFootprint)
        try container.encodeIfPresent(color, forKey: .color)
        try container.encode(defaultMode, forKey: .defaultMode)
        try container.encode(modes, forKey: .modes)
        try container.encodeIfPresent(info, forKey: .info)
        try container.encodeIfPresent(libraryTier, forKey: .libraryTier)
        try container.encodeIfPresent(source, forKey: .source)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct FixtureMode: Codable, Equatable, Sendable {
    public var name: String
    public var dmxFootprint: Int
    public var extraFields: [String: JSONValue]

    public init(name: String, dmxFootprint: Int, extraFields: [String: JSONValue] = [:]) {
        self.name = name
        self.dmxFootprint = dmxFootprint
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case name
        case dmxFootprint
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Default"
        dmxFootprint = try container.decodeIfPresent(Int.self, forKey: .dmxFootprint) ?? 1
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(dmxFootprint, forKey: .dmxFootprint)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct FixtureProfileInfo: Codable, Equatable, Sendable {
    public var summary: String
    public var bestFor: [String]
    public var capabilities: [String]
    public var notes: [String]
    public var extraFields: [String: JSONValue]

    public init(
        summary: String = "",
        bestFor: [String] = [],
        capabilities: [String] = [],
        notes: [String] = [],
        extraFields: [String: JSONValue] = [:]
    ) {
        self.summary = summary
        self.bestFor = bestFor
        self.capabilities = capabilities
        self.notes = notes
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case summary
        case bestFor
        case capabilities
        case notes
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        summary = try container.decodeIfPresent(String.self, forKey: .summary) ?? ""
        bestFor = try container.decodeIfPresent([String].self, forKey: .bestFor) ?? []
        capabilities = try container.decodeIfPresent([String].self, forKey: .capabilities) ?? []
        notes = try container.decodeIfPresent([String].self, forKey: .notes) ?? []
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(summary, forKey: .summary)
        try container.encode(bestFor, forKey: .bestFor)
        try container.encode(capabilities, forKey: .capabilities)
        try container.encode(notes, forKey: .notes)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct Revision: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var note: String
    public var createdAt: Int64
    public var extraFields: [String: JSONValue]

    public init(
        id: String,
        name: String,
        note: String = "",
        createdAt: Int64,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.name = name
        self.note = note
        self.createdAt = createdAt
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case name
        case note
        case createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Revision"
        note = try container.decodeIfPresent(String.self, forKey: .note) ?? ""
        createdAt = try container.decodeIfPresent(Int64.self, forKey: .createdAt) ?? 0
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(note, forKey: .note)
        try container.encode(createdAt, forKey: .createdAt)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct CommentPin: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var xMm: Int
    public var yMm: Int
    public var text: String
    public var createdAt: Int64
    public var extraFields: [String: JSONValue]

    public init(
        id: String,
        xMm: Int,
        yMm: Int,
        text: String,
        createdAt: Int64,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.id = id
        self.xMm = xMm
        self.yMm = yMm
        self.text = text
        self.createdAt = createdAt
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case id
        case xMm
        case yMm
        case text
        case createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        xMm = try container.decodeIfPresent(Int.self, forKey: .xMm) ?? 0
        yMm = try container.decodeIfPresent(Int.self, forKey: .yMm) ?? 0
        text = try container.decodeIfPresent(String.self, forKey: .text) ?? ""
        createdAt = try container.decodeIfPresent(Int64.self, forKey: .createdAt) ?? 0
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(xMm, forKey: .xMm)
        try container.encode(yMm, forKey: .yMm)
        try container.encode(text, forKey: .text)
        try container.encode(createdAt, forKey: .createdAt)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct OscBridgeSettings: Codable, Equatable, Sendable {
    public var version: Int
    public var namespace: String
    public var relayUrl: String
    public var targetHost: String
    public var targetPort: Int
    public var consoleProfile: String
    public var extraFields: [String: JSONValue]

    public init(
        version: Int = 1,
        namespace: String = "/plotforge",
        relayUrl: String = "ws://127.0.0.1:8765",
        targetHost: String = "127.0.0.1",
        targetPort: Int = 8000,
        consoleProfile: String = "generic",
        extraFields: [String: JSONValue] = [:]
    ) {
        self.version = version
        self.namespace = namespace
        self.relayUrl = relayUrl
        self.targetHost = targetHost
        self.targetPort = targetPort
        self.consoleProfile = consoleProfile
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case version
        case namespace
        case relayUrl
        case targetHost
        case targetPort
        case consoleProfile
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(Int.self, forKey: .version) ?? 1
        namespace = try container.decodeIfPresent(String.self, forKey: .namespace) ?? "/plotforge"
        relayUrl = try container.decodeIfPresent(String.self, forKey: .relayUrl) ?? "ws://127.0.0.1:8765"
        targetHost = try container.decodeIfPresent(String.self, forKey: .targetHost) ?? "127.0.0.1"
        targetPort = try container.decodeIfPresent(Int.self, forKey: .targetPort) ?? 8000
        consoleProfile = try container.decodeIfPresent(String.self, forKey: .consoleProfile) ?? "generic"
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(version, forKey: .version)
        try container.encode(namespace, forKey: .namespace)
        try container.encode(relayUrl, forKey: .relayUrl)
        try container.encode(targetHost, forKey: .targetHost)
        try container.encode(targetPort, forKey: .targetPort)
        try container.encode(consoleProfile, forKey: .consoleProfile)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}

public struct LabelSettings: Codable, Equatable, Sendable {
    public var fixtureUnitSize: Int
    public var fixtureChannelSize: Int
    public var positionLabelSize: Int
    public var commentLabelSize: Int
    public var focusLabelSize: Int
    public var showFixtureUnit: Bool
    public var showFixtureChannel: Bool
    public var showPositionLabels: Bool
    public var showCommentText: Bool
    public var showFocusLabels: Bool
    public var extraFields: [String: JSONValue]

    public init(
        fixtureUnitSize: Int = 120,
        fixtureChannelSize: Int = 88,
        positionLabelSize: Int = 120,
        commentLabelSize: Int = 105,
        focusLabelSize: Int = 110,
        showFixtureUnit: Bool = true,
        showFixtureChannel: Bool = false,
        showPositionLabels: Bool = true,
        showCommentText: Bool = true,
        showFocusLabels: Bool = true,
        extraFields: [String: JSONValue] = [:]
    ) {
        self.fixtureUnitSize = fixtureUnitSize
        self.fixtureChannelSize = fixtureChannelSize
        self.positionLabelSize = positionLabelSize
        self.commentLabelSize = commentLabelSize
        self.focusLabelSize = focusLabelSize
        self.showFixtureUnit = showFixtureUnit
        self.showFixtureChannel = showFixtureChannel
        self.showPositionLabels = showPositionLabels
        self.showCommentText = showCommentText
        self.showFocusLabels = showFocusLabels
        self.extraFields = extraFields
    }

    private enum CodingKeys: String, CodingKey, CaseIterable {
        case fixtureUnitSize
        case fixtureChannelSize
        case positionLabelSize
        case commentLabelSize
        case focusLabelSize
        case showFixtureUnit
        case showFixtureChannel
        case showPositionLabels
        case showCommentText
        case showFocusLabels
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        fixtureUnitSize = try container.decodeIfPresent(Int.self, forKey: .fixtureUnitSize) ?? 120
        fixtureChannelSize = try container.decodeIfPresent(Int.self, forKey: .fixtureChannelSize) ?? 88
        positionLabelSize = try container.decodeIfPresent(Int.self, forKey: .positionLabelSize) ?? 120
        commentLabelSize = try container.decodeIfPresent(Int.self, forKey: .commentLabelSize) ?? 105
        focusLabelSize = try container.decodeIfPresent(Int.self, forKey: .focusLabelSize) ?? 110
        showFixtureUnit = try container.decodeIfPresent(Bool.self, forKey: .showFixtureUnit) ?? true
        showFixtureChannel = try container.decodeIfPresent(Bool.self, forKey: .showFixtureChannel) ?? false
        showPositionLabels = try container.decodeIfPresent(Bool.self, forKey: .showPositionLabels) ?? true
        showCommentText = try container.decodeIfPresent(Bool.self, forKey: .showCommentText) ?? true
        showFocusLabels = try container.decodeIfPresent(Bool.self, forKey: .showFocusLabels) ?? true
        extraFields = try JSONExtraFields.decode(from: decoder, excluding: CodingKeys.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(fixtureUnitSize, forKey: .fixtureUnitSize)
        try container.encode(fixtureChannelSize, forKey: .fixtureChannelSize)
        try container.encode(positionLabelSize, forKey: .positionLabelSize)
        try container.encode(commentLabelSize, forKey: .commentLabelSize)
        try container.encode(focusLabelSize, forKey: .focusLabelSize)
        try container.encode(showFixtureUnit, forKey: .showFixtureUnit)
        try container.encode(showFixtureChannel, forKey: .showFixtureChannel)
        try container.encode(showPositionLabels, forKey: .showPositionLabels)
        try container.encode(showCommentText, forKey: .showCommentText)
        try container.encode(showFocusLabels, forKey: .showFocusLabels)
        try JSONExtraFields.encode(extraFields, to: encoder, excluding: CodingKeys.self)
    }
}
