import Foundation

public struct FixtureProfileLibraryEntry: Equatable, Sendable, Identifiable {
    public var id: String { profile.id }
    public var profile: FixtureProfile
    public var sourceLabel: String
    public var searchText: String

    public init(profile: FixtureProfile, sourceLabel: String) {
        self.profile = profile
        self.sourceLabel = sourceLabel
        self.searchText = [
            profile.manufacturer,
            profile.model,
            profile.category,
            profile.defaultMode,
            sourceLabel,
        ]
        .filter { !$0.isEmpty }
        .joined(separator: " ")
        .lowercased()
    }
}

public struct FixtureProfileDetailRow: Equatable, Sendable, Identifiable {
    public var id: String { label }
    public var label: String
    public var value: String

    public init(label: String, value: String) {
        self.label = label
        self.value = value
    }
}

public struct FixtureProfileModeSummary: Equatable, Sendable, Identifiable {
    public var id: String { name }
    public var name: String
    public var footprintLabel: String

    public init(name: String, footprintLabel: String) {
        self.name = name
        self.footprintLabel = footprintLabel
    }
}

public struct FixtureProfileDetailSummary: Equatable, Sendable, Identifiable {
    public var id: String { profileId }
    public var profileId: String
    public var displayName: String
    public var sourceLabel: String
    public var summary: String
    public var rows: [FixtureProfileDetailRow]
    public var bestFor: [String]
    public var capabilities: [String]
    public var notes: [String]
    public var modes: [FixtureProfileModeSummary]

    public init(
        profileId: String,
        displayName: String,
        sourceLabel: String,
        summary: String,
        rows: [FixtureProfileDetailRow],
        bestFor: [String],
        capabilities: [String],
        notes: [String],
        modes: [FixtureProfileModeSummary]
    ) {
        self.profileId = profileId
        self.displayName = displayName
        self.sourceLabel = sourceLabel
        self.summary = summary
        self.rows = rows
        self.bestFor = bestFor
        self.capabilities = capabilities
        self.notes = notes
        self.modes = modes
    }
}

public struct PatchDmxRange: Equatable, Sendable {
    public var fixtureId: String
    public var unitNumber: Int?
    public var start: Int
    public var endExclusive: Int

    public var endAddress: Int {
        endExclusive - 1
    }
}

public struct PatchDmxConflict: Equatable, Sendable {
    public var universe: Int
    public var a: PatchDmxRange
    public var b: PatchDmxRange
}

public struct PatchChannelConflict: Equatable, Sendable {
    public var channel: Int
    public var aFixtureId: String
    public var bFixtureId: String
}

public struct PatchTableRow: Equatable, Sendable, Identifiable {
    public var id: String
    public var positionId: String
    public var positionName: String
    public var unitNumber: Int?
    public var profileName: String
    public var mode: String
    public var channel: Int?
    public var universe: Int?
    public var address: Int?
    public var endAddress: Int?
    public var dmxRangeLabel: String
    public var footprint: Int
    public var circuit: String
    public var dimmer: String
    public var circuitLabel: String
    public var color: String
    public var gobo: String
    public var notes: FixtureNotes
    public var notesLabel: String
    public var status: String
    public var statusLabel: String
    public var hasDmxConflict: Bool
    public var hasChannelConflict: Bool
    public var conflictLabel: String
}

public enum PlotCheckKind: String, Sendable {
    case channel
    case dmx
    case circuit
    case profile
}

public struct PlotCheckRow: Equatable, Sendable, Identifiable {
    public var id: String
    public var kind: PlotCheckKind
    public var title: String
    public var detail: String
    public var fixtureIds: [String]
    public var fixtureLabels: [String]
}

public struct LabelControlSummary: Equatable, Sendable {
    public var fixtureUnit: String
    public var fixtureChannel: String
    public var position: String
    public var comment: String
    public var focus: String
}

public struct PlotWizardPositionPlan: Equatable, Sendable, Identifiable {
    public var id: String { key }
    public var key: String
    public var name: String
    public var kind: String
    public var yMm: Int
    public var trimMm: Int
    public var lengthMm: Int
}

public struct PlotWizardFixtureGroupPlan: Equatable, Sendable, Identifiable {
    public var id: String { "\(positionKey)-\(role)" }
    public var positionKey: String
    public var role: String
    public var profileId: String
    public var count: Int
    public var color: String
    public var focus: String
    public var crew: String
    public var channelStart: Int
    public var dmxUniverse: Int
}

public struct PlotWizardPlan: Equatable, Sendable {
    public var version: Int
    public var source: String
    public var brief: String
    public var productionType: String
    public var productionLabel: String
    public var stageWidthMm: Int
    public var stageDepthMm: Int
    public var positions: [PlotWizardPositionPlan]
    public var fixtureGroups: [PlotWizardFixtureGroupPlan]
    public var notes: [String]
}

public struct PlotWizardApplyResult: Equatable, Sendable {
    public var document: PlotShowDocument
    public var addedPositionIds: [String]
    public var addedFixtureIds: [String]
}

public enum PlotToolModules {
    public static let plotStarterVersion = 1
    public static let defaultWizardBrief = "Small musical in a 36x22 proscenium theatre. Warm front wash, clean specials, saturated backlight for dance breaks."

    public static let seededFixtureProfiles: [FixtureProfile] = [
        FixtureProfile(
            id: "robe_megapointe",
            manufacturer: "Robe Lighting",
            model: "Robin MegaPointe",
            symbol: "spot",
            category: "moving-spot",
            radiusMm: 260,
            dmxFootprint: 39,
            color: "#4cc9ff",
            defaultMode: "Mode 1 - Standard 16 bit",
            modes: [
                FixtureMode(name: "Mode 1 - Standard 16 bit", dmxFootprint: 39),
                FixtureMode(name: "Mode 2 - Reduced 8 bit", dmxFootprint: 34),
            ],
            info: FixtureProfileInfo(
                summary: "Curated GDTF seed for moving spot work.",
                bestFor: ["aerial texture", "specials", "concert looks"],
                capabilities: ["shutters", "gobos", "prisms", "animation"],
                notes: ["Confirm show mode with console before final addressing."]
            ),
            libraryTier: "curated-gdtf",
            source: ["type": .string("gdtf-share")]
        ),
        FixtureProfile(
            id: "robe_spiider",
            manufacturer: "Robe Lighting",
            model: "Robin Spiider",
            symbol: "par",
            category: "moving-wash",
            radiusMm: 250,
            dmxFootprint: 27,
            color: "#58e896",
            defaultMode: "Mode 5 - Wash",
            modes: [
                FixtureMode(name: "Mode 5 - Wash", dmxFootprint: 27),
                FixtureMode(name: "Mode 7 - Pixel RGB", dmxFootprint: 34),
                FixtureMode(name: "Mode 8 - Pixel RGBW", dmxFootprint: 66),
            ],
            info: FixtureProfileInfo(
                summary: "Curated GDTF seed for moving wash coverage.",
                bestFor: ["wash", "pixel texture", "backlight"],
                capabilities: ["RGBW", "pixel control", "zoom"],
                notes: ["Use reduced modes when universe pressure matters."]
            ),
            libraryTier: "curated-gdtf",
            source: ["type": .string("gdtf-share")]
        ),
        FixtureProfile(
            id: "s4_26",
            manufacturer: "ETC",
            model: "Source Four 26 deg",
            symbol: "ellipsoidal",
            category: "ellipsoidal",
            radiusMm: 200,
            dmxFootprint: 1,
            color: "#ffb547",
            modes: [FixtureMode(name: "Default", dmxFootprint: 1)],
            info: FixtureProfileInfo(summary: "Legacy seed profile for conventional front light and specials."),
            libraryTier: "legacy",
            source: ["type": .string("legacy-seed")]
        ),
        FixtureProfile(
            id: "led_profile_rgbal",
            manufacturer: "Generic",
            model: "LED Profile RGBAL",
            symbol: "ellipsoidal",
            category: "led-profile",
            radiusMm: 210,
            dmxFootprint: 12,
            color: "#8bd3ff",
            defaultMode: "RGBAL 16 bit",
            modes: [
                FixtureMode(name: "Dimmer only", dmxFootprint: 1),
                FixtureMode(name: "RGBAL 8 bit", dmxFootprint: 7),
                FixtureMode(name: "RGBAL 16 bit", dmxFootprint: 12),
            ],
            info: FixtureProfileInfo(
                summary: "Generic LED profile starter for front light, specials, and color-mixing profile positions.",
                bestFor: ["front light", "specials", "color-mixing profile systems"],
                capabilities: ["RGBAL color mixing", "electronic dimming", "profile shutter cuts", "lens tube swap"],
                notes: ["Replace with the venue or rental vendor profile before final patch.", "Confirm fan mode and refresh rate for camera work."],
                extraFields: [
                    "controlIntent": .string("Profile conventionals with color mixing"),
                    "paperworkWarning": .string("Generic profile; verify mode and footprint before final address assignment."),
                ]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")],
            extraFields: [
                "powerClass": .string("LED profile"),
                "connector": .string("powerCON or Edison by vendor"),
            ]
        ),
        FixtureProfile(
            id: "led_par_rgbw",
            manufacturer: "Generic",
            model: "LED PAR RGBW",
            symbol: "par",
            category: "led-par",
            radiusMm: 235,
            dmxFootprint: 8,
            color: "#72f0a0",
            defaultMode: "RGBW 16 bit",
            modes: [
                FixtureMode(name: "RGBW 8 bit", dmxFootprint: 4),
                FixtureMode(name: "RGBW 16 bit", dmxFootprint: 8),
            ],
            info: FixtureProfileInfo(
                summary: "Generic LED PAR starter for saturated color, backlight, shin, and compact wash positions.",
                bestFor: ["backlight", "side light", "low trim color", "venue uplight"],
                capabilities: ["RGBW color mixing", "electronic dimming", "strobe", "simple wash"],
                notes: ["Use as a placeholder until the exact LED PAR profile is imported."]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")]
        ),
        FixtureProfile(
            id: "pixel_bar_1m",
            manufacturer: "Generic",
            model: "1m Pixel Bar",
            symbol: "bar",
            category: "pixel-bar",
            radiusMm: 320,
            dmxFootprint: 48,
            color: "#a98bff",
            defaultMode: "12 cell RGBW",
            modes: [
                FixtureMode(name: "Single cell RGBW", dmxFootprint: 4),
                FixtureMode(name: "12 cell RGBW", dmxFootprint: 48),
                FixtureMode(name: "12 cell RGBW 16 bit", dmxFootprint: 96),
            ],
            info: FixtureProfileInfo(
                summary: "Generic one-meter pixel bar starter for scenic edges, truss toning, and chase effects.",
                bestFor: ["scenic edge", "truss toner", "pixel effects", "dance breaks"],
                capabilities: ["cell control", "RGBW color mixing", "effects mapping"],
                notes: ["Universe usage grows quickly in pixel modes; check address ranges before export."]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")]
        ),
        FixtureProfile(
            id: "cyc_strip_rgbw",
            manufacturer: "Generic",
            model: "RGBW Cyc Strip",
            symbol: "strip",
            category: "cyc-strip",
            radiusMm: 340,
            dmxFootprint: 16,
            color: "#ff8fd6",
            defaultMode: "4 cell RGBW",
            modes: [
                FixtureMode(name: "Single zone RGBW", dmxFootprint: 4),
                FixtureMode(name: "4 cell RGBW", dmxFootprint: 16),
            ],
            info: FixtureProfileInfo(
                summary: "Generic cyc strip starter for backdrops, ground rows, and broad scenic color.",
                bestFor: ["cyc wash", "ground row", "scenic color"],
                capabilities: ["RGBW color mixing", "zoned control", "wide beam"],
                notes: ["Confirm lensing, spacing, and zones against the actual cyc product."]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")]
        ),
        FixtureProfile(
            id: "audience_blinder_2lite",
            manufacturer: "Generic",
            model: "2 Lite Audience Blinder",
            symbol: "blinder",
            category: "blinder",
            radiusMm: 260,
            dmxFootprint: 2,
            color: "#ffd166",
            defaultMode: "Two cell dimmer",
            modes: [
                FixtureMode(name: "Single dimmer", dmxFootprint: 1),
                FixtureMode(name: "Two cell dimmer", dmxFootprint: 2),
            ],
            info: FixtureProfileInfo(
                summary: "Generic audience blinder starter for hits, bumps, and downstage audience energy.",
                bestFor: ["audience hits", "concert bumps", "downstage accents"],
                capabilities: ["cell dimming", "warm source", "high intensity"],
                notes: ["Flag safety, sightline, and heat considerations during review."]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")]
        ),
        FixtureProfile(
            id: "followspot_1200",
            manufacturer: "Generic",
            model: "1200W Followspot",
            symbol: "followspot",
            category: "followspot",
            radiusMm: 300,
            dmxFootprint: 1,
            color: "#f7f1d1",
            modes: [
                FixtureMode(name: "Dimmer only", dmxFootprint: 1),
            ],
            info: FixtureProfileInfo(
                summary: "Generic followspot starter for operator positions and manual pickup documentation.",
                bestFor: ["principal pickup", "manual specials", "balcony or booth spot positions"],
                capabilities: ["manual iris", "manual color", "operator notes"],
                notes: ["Document operator location, headset, cue light, and color boomerang separately."]
            ),
            libraryTier: "starter-generic",
            source: ["type": .string("native-generic-seed")]
        ),
        FixtureProfile(
            id: "fresnel",
            manufacturer: "Generic",
            model: "Fresnel 6 in",
            symbol: "fresnel",
            category: "fresnel",
            radiusMm: 220,
            dmxFootprint: 1,
            color: "#ffb547",
            modes: [FixtureMode(name: "Default", dmxFootprint: 1)],
            info: FixtureProfileInfo(summary: "Legacy seed profile for soft washes."),
            libraryTier: "legacy",
            source: ["type": .string("legacy-seed")]
        ),
        FixtureProfile(
            id: "par64",
            manufacturer: "Generic",
            model: "PAR 64",
            symbol: "par",
            category: "par",
            radiusMm: 240,
            dmxFootprint: 1,
            color: "#ffb547",
            modes: [FixtureMode(name: "Default", dmxFootprint: 1)],
            info: FixtureProfileInfo(summary: "Legacy seed profile for saturated color and backlight."),
            libraryTier: "legacy",
            source: ["type": .string("legacy-seed")]
        ),
        FixtureProfile(
            id: "spot_mh",
            manufacturer: "Generic",
            model: "Moving Spot",
            symbol: "spot",
            category: "moving-spot",
            radiusMm: 260,
            dmxFootprint: 24,
            color: "#4cc9ff",
            modes: [FixtureMode(name: "Default", dmxFootprint: 24)],
            info: FixtureProfileInfo(summary: "Legacy moving spot placeholder for starter plots."),
            libraryTier: "legacy",
            source: ["type": .string("legacy-seed")]
        ),
    ]

    public static func getProfile(
        _ profileId: String,
        in documentProfiles: [String: FixtureProfile]
    ) -> FixtureProfile? {
        documentProfiles[profileId] ?? seededFixtureProfiles.first { $0.id == profileId }
    }

    public static func fixtureProfileLibrary(
        documentProfiles: [String: FixtureProfile],
        query: String = ""
    ) -> [FixtureProfileLibraryEntry] {
        let seededIds = Set(seededFixtureProfiles.map(\.id))
        let seeded = seededFixtureProfiles.map {
            FixtureProfileLibraryEntry(profile: $0, sourceLabel: $0.libraryTier ?? "seed")
        }
        let imported = documentProfiles.values
            .filter { !seededIds.contains($0.id) }
            .sorted { profileDisplayName($0) < profileDisplayName($1) }
            .map { FixtureProfileLibraryEntry(profile: $0, sourceLabel: $0.libraryTier ?? "document") }

        let all = seeded + imported
        let cleanQuery = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleanQuery.isEmpty else { return all }
        return all.filter { $0.searchText.contains(cleanQuery) }
    }

    public static func fixtureProfileDetail(
        _ profile: FixtureProfile,
        sourceLabel providedSourceLabel: String? = nil
    ) -> FixtureProfileDetailSummary {
        let displayName = profileDisplayName(profile)
        let sourceLabel = providedSourceLabel ?? profile.libraryTier ?? jsonString(profile.source?["type"]) ?? "document"
        let info = profile.info
        var rows = [
            FixtureProfileDetailRow(label: "Manufacturer", value: profile.manufacturer.isEmpty ? "Unknown" : profile.manufacturer),
            FixtureProfileDetailRow(label: "Model", value: profile.model.isEmpty ? "Unknown" : profile.model),
            FixtureProfileDetailRow(label: "Category", value: profile.category.isEmpty ? "fixture" : profile.category),
            FixtureProfileDetailRow(label: "Symbol", value: profile.symbol.isEmpty ? "generic" : profile.symbol),
            FixtureProfileDetailRow(label: "Default mode", value: profile.defaultMode.isEmpty ? "Default" : profile.defaultMode),
            FixtureProfileDetailRow(label: "DMX footprint", value: "\(max(1, profile.dmxFootprint)) channels"),
            FixtureProfileDetailRow(label: "Radius", value: "\(profile.radiusMm) mm"),
            FixtureProfileDetailRow(label: "Source", value: sourceLabel),
        ]

        rows.append(contentsOf: customRows(prefix: "Source", fields: profile.source ?? [:], excluding: ["type"]))
        rows.append(contentsOf: customRows(prefix: "Profile", fields: profile.extraFields))
        rows.append(contentsOf: customRows(prefix: "Info", fields: info?.extraFields ?? [:]))

        let modeRows = (profile.modes.isEmpty ? [FixtureMode(name: profile.defaultMode, dmxFootprint: profile.dmxFootprint)] : profile.modes)
            .map {
                FixtureProfileModeSummary(
                    name: $0.name.isEmpty ? "Default" : $0.name,
                    footprintLabel: "\(max(1, $0.dmxFootprint)) channels"
                )
            }

        return FixtureProfileDetailSummary(
            profileId: profile.id,
            displayName: displayName.isEmpty ? profile.id : displayName,
            sourceLabel: sourceLabel,
            summary: info?.summary ?? "",
            rows: rows,
            bestFor: info?.bestFor ?? [],
            capabilities: info?.capabilities ?? [],
            notes: info?.notes ?? [],
            modes: modeRows
        )
    }

    public static func addFixtureFromLibrary(
        profileId: String,
        to document: PlotShowDocument,
        positionId: String,
        xMm: Int = 0,
        channel: Int? = nil,
        dmx: DmxAddress? = nil,
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        guard let position = document.positions[positionId],
              getProfile(profileId, in: document.fixtureProfiles) != nil
        else {
            return document
        }

        let fixtureId = uniqueId(base: "fx", used: Set(document.fixtures.keys))
        let clampedX = PlotDocumentEditing.clampedFixtureX(
            PlotDocumentEditing.snappedMillimeters(Double(xMm)),
            on: position
        )
        let fixture = Fixture(
            id: fixtureId,
            positionId: positionId,
            profileId: profileId,
            xMm: clampedX,
            channel: channel,
            dmx: dmx,
            status: "planned"
        )

        var next = document
        next.updatedAt = updatedAt ?? currentTimestampMilliseconds()
        next.fixtures[fixtureId] = fixture
        next.fixtureOrder.append(fixtureId)
        return PlotDocumentEditing.renumberPosition(in: next, positionId: positionId)
    }

    public static func patchConflicts(in document: PlotShowDocument) -> [PatchDmxConflict] {
        var byUniverse: [Int: [PatchDmxRange]] = [:]

        for fixture in document.fixtures.values {
            guard let universe = fixture.dmx?.universe,
                  let start = fixture.dmx?.address
            else {
                continue
            }
            let footprint = dmxFootprint(for: fixture, in: document)
            let endExclusive = start + footprint
            guard start >= 1,
                  endExclusive <= 513
            else {
                continue
            }
            byUniverse[universe, default: []].append(
                PatchDmxRange(
                    fixtureId: fixture.id,
                    unitNumber: fixture.unitNumber,
                    start: start,
                    endExclusive: endExclusive
                )
            )
        }

        return byUniverse.keys.sorted().flatMap { universe -> [PatchDmxConflict] in
            let ranges = (byUniverse[universe] ?? []).sorted {
                if $0.start != $1.start {
                    return $0.start < $1.start
                }
                return $0.fixtureId < $1.fixtureId
            }
            guard ranges.count > 1 else { return [] }
            var conflicts: [PatchDmxConflict] = []
            for index in 1..<ranges.count where ranges[index].start < ranges[index - 1].endExclusive {
                conflicts.append(PatchDmxConflict(universe: universe, a: ranges[index - 1], b: ranges[index]))
            }
            return conflicts
        }
    }

    public static func channelConflicts(in document: PlotShowDocument) -> [PatchChannelConflict] {
        var seen: [Int: String] = [:]
        var conflicts: [PatchChannelConflict] = []
        for fixtureId in document.fixtureOrder {
            guard let fixture = document.fixtures[fixtureId],
                  let channel = fixture.channel
            else {
                continue
            }
            if let firstFixtureId = seen[channel] {
                conflicts.append(PatchChannelConflict(channel: channel, aFixtureId: firstFixtureId, bFixtureId: fixture.id))
            } else {
                seen[channel] = fixture.id
            }
        }
        return conflicts
    }

    public static func patchTableRows(in document: PlotShowDocument) -> [PatchTableRow] {
        let conflictMaps = buildConflictMaps(in: document)
        let positionOrder = Dictionary(uniqueKeysWithValues: document.positionOrder.enumerated().map { ($0.element, $0.offset) })

        return document.fixtureOrder
            .compactMap { document.fixtures[$0] }
            .map { fixture in
                let profile = getProfile(fixture.profileId, in: document.fixtureProfiles)
                let position = document.positions[fixture.positionId]
                let footprint = max(1, profile?.dmxFootprint ?? 1)
                let universe = fixture.dmx?.universe
                let address = fixture.dmx?.address
                let endAddress = address.map { $0 + footprint - 1 }
                let dmxLabels = conflictMaps.dmx[fixture.id] ?? []
                let channelLabels = conflictMaps.channels[fixture.id] ?? []
                let conflictLabels = dmxLabels + channelLabels
                let notes = normalizedNotes(fixture.notes, legacyNote: fixture.note)
                let circuit = normalizedCircuitValue(fixture.circuit)
                let dimmer = normalizedCircuitValue(fixture.dimmer)

                return PatchTableRow(
                    id: fixture.id,
                    positionId: fixture.positionId,
                    positionName: position?.name ?? "Unassigned",
                    unitNumber: fixture.unitNumber,
                    profileName: profileDisplayName(profile),
                    mode: profile?.defaultMode ?? "Default",
                    channel: fixture.channel,
                    universe: universe,
                    address: address,
                    endAddress: endAddress,
                    dmxRangeLabel: dmxRangeLabel(universe: universe, address: address, endAddress: endAddress),
                    footprint: footprint,
                    circuit: circuit,
                    dimmer: dimmer,
                    circuitLabel: circuitLabel(circuit: circuit, dimmer: dimmer),
                    color: fixture.color,
                    gobo: fixture.gobo,
                    notes: notes,
                    notesLabel: notesLabel(notes),
                    status: PlotInspectorValidation.normalizedFixtureStatus(fixture.status),
                    statusLabel: statusLabel(fixture.status),
                    hasDmxConflict: !dmxLabels.isEmpty,
                    hasChannelConflict: !channelLabels.isEmpty,
                    conflictLabel: conflictLabels.joined(separator: "; ")
                )
            }
            .sorted {
                let leftPosition = positionOrder[$0.positionId] ?? Int.max
                let rightPosition = positionOrder[$1.positionId] ?? Int.max
                if leftPosition != rightPosition {
                    return leftPosition < rightPosition
                }
                if ($0.unitNumber ?? Int.max) != ($1.unitNumber ?? Int.max) {
                    return ($0.unitNumber ?? Int.max) < ($1.unitNumber ?? Int.max)
                }
                if ($0.channel ?? Int.max) != ($1.channel ?? Int.max) {
                    return ($0.channel ?? Int.max) < ($1.channel ?? Int.max)
                }
                return $0.id < $1.id
            }
    }

    public static func checkRows(in document: PlotShowDocument) -> [PlotCheckRow] {
        let dmxRows = patchConflicts(in: document).map { conflict in
            PlotCheckRow(
                id: "dmx-\(conflict.universe)-\(conflict.a.fixtureId)-\(conflict.b.fixtureId)",
                kind: .dmx,
                title: "DMX U\(conflict.universe) overlap",
                detail: "\(conflict.a.start)-\(conflict.a.endAddress) overlaps \(conflict.b.start)-\(conflict.b.endAddress)",
                fixtureIds: [conflict.a.fixtureId, conflict.b.fixtureId],
                fixtureLabels: [fixtureLabel(document, conflict.a.fixtureId), fixtureLabel(document, conflict.b.fixtureId)]
            )
        }
        let channelRows = channelConflicts(in: document).map { conflict in
            PlotCheckRow(
                id: "channel-\(conflict.channel)-\(conflict.aFixtureId)-\(conflict.bFixtureId)",
                kind: .channel,
                title: "Channel \(conflict.channel) duplicate",
                detail: "Channel \(conflict.channel) is assigned twice",
                fixtureIds: [conflict.aFixtureId, conflict.bFixtureId],
                fixtureLabels: [fixtureLabel(document, conflict.aFixtureId), fixtureLabel(document, conflict.bFixtureId)]
            )
        }
        let circuitRows = document.fixtureOrder.compactMap { fixtureId -> PlotCheckRow? in
            guard let fixture = document.fixtures[fixtureId] else { return nil }
            let circuit = normalizedCircuitValue(fixture.circuit)
            let dimmer = normalizedCircuitValue(fixture.dimmer)
            guard circuit.isEmpty || dimmer.isEmpty else { return nil }
            return PlotCheckRow(
                id: "circuit-\(fixture.id)",
                kind: .circuit,
                title: circuit.isEmpty && dimmer.isEmpty ? "Circuit and dimmer missing" : "Circuit or dimmer incomplete",
                detail: circuitLabel(circuit: circuit, dimmer: dimmer),
                fixtureIds: [fixture.id],
                fixtureLabels: [fixtureLabel(document, fixture.id)]
            )
        }
        let profileRows = document.fixtureOrder.compactMap { fixtureId -> PlotCheckRow? in
            guard let fixture = document.fixtures[fixtureId],
                  getProfile(fixture.profileId, in: document.fixtureProfiles) == nil
            else {
                return nil
            }
            return PlotCheckRow(
                id: "profile-\(fixture.id)",
                kind: .profile,
                title: "Missing profile data",
                detail: "Fixture references profile \(fixture.profileId)",
                fixtureIds: [fixture.id],
                fixtureLabels: [fixtureLabel(document, fixture.id)]
            )
        }

        return (dmxRows + channelRows + circuitRows + profileRows)
            .sorted { $0.title == $1.title ? $0.id < $1.id : $0.title < $1.title }
    }

    public static func labelControlSummary(_ settings: LabelSettings) -> LabelControlSummary {
        LabelControlSummary(
            fixtureUnit: labelControlText(enabled: settings.showFixtureUnit, size: settings.fixtureUnitSize),
            fixtureChannel: labelControlText(enabled: settings.showFixtureChannel, size: settings.fixtureChannelSize),
            position: labelControlText(enabled: settings.showPositionLabels, size: settings.positionLabelSize),
            comment: labelControlText(enabled: settings.showCommentText, size: settings.commentLabelSize),
            focus: labelControlText(enabled: settings.showFocusLabels, size: settings.focusLabelSize)
        )
    }

    public static func buildWizardPlan(
        for document: PlotShowDocument,
        brief: String = defaultWizardBrief
    ) -> PlotWizardPlan {
        let cleanBrief = brief
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
        let normalizedBrief = cleanBrief.isEmpty ? defaultWizardBrief : cleanBrief
        let productionType = productionType(for: normalizedBrief)
        let settings = wizardSettings(for: productionType)
        let stage = stageSize(for: document, brief: normalizedBrief)
        let frontCount = scaledEvenCount(stage.widthFeet, divisor: 7, min: 4, max: 10)
        let midCount = productionType == "corporate" ? 2 : scaledEvenCount(stage.widthFeet, divisor: 10, min: 2, max: 6)
        let backCount = scaledEvenCount(stage.widthFeet, divisor: 8, min: 4, max: 10)
        let movingCount = productionType == "concert" ? scaledEvenCount(stage.widthFeet, divisor: 12, min: 2, max: 6) : 0
        let channelStart = max(301, maxExistingChannel(in: document) + 1)

        var positions = [
            PlotWizardPositionPlan(key: "foh", name: "AI FOH WASH", kind: "foh", yMm: feetToMillimeters(6), trimMm: feetToMillimeters(28), lengthMm: feetToMillimeters(stage.widthFeet)),
            PlotWizardPositionPlan(key: "mid", name: "AI MIDSTAGE WASH", kind: "pipe", yMm: -feetToMillimeters(max(6, Int((Double(stage.depthFeet) * 0.35).rounded()))), trimMm: feetToMillimeters(22), lengthMm: feetToMillimeters(max(12, stage.widthFeet - 6))),
            PlotWizardPositionPlan(key: "back", name: "AI BACKLIGHT", kind: "pipe", yMm: -feetToMillimeters(max(10, Int((Double(stage.depthFeet) * 0.72).rounded()))), trimMm: feetToMillimeters(24), lengthMm: feetToMillimeters(max(12, stage.widthFeet - 6))),
            PlotWizardPositionPlan(key: "specials", name: "AI SPECIALS", kind: "pipe", yMm: -feetToMillimeters(max(3, Int((Double(stage.depthFeet) * 0.18).rounded()))), trimMm: feetToMillimeters(22), lengthMm: feetToMillimeters(max(10, stage.widthFeet / 2))),
        ]

        if movingCount > 0 {
            positions.append(
                PlotWizardPositionPlan(key: "movers", name: "AI MOVERS", kind: "truss", yMm: -feetToMillimeters(max(4, stage.depthFeet / 2)), trimMm: feetToMillimeters(26), lengthMm: feetToMillimeters(max(12, stage.widthFeet - 4)))
            )
        }

        var groups = [
            PlotWizardFixtureGroupPlan(positionKey: "foh", role: "Front wash", profileId: settings.frontProfile, count: frontCount, color: settings.color, focus: settings.focus, crew: settings.crew, channelStart: channelStart, dmxUniverse: 3),
            PlotWizardFixtureGroupPlan(positionKey: "mid", role: "Mid wash", profileId: settings.midProfile, count: midCount, color: productionType == "corporate" ? "R3202" : "R60", focus: productionType == "dance" ? "side sculpting and soft diagonal texture" : "soft fill across the center acting area", crew: "Balance with front wash before focus specials.", channelStart: channelStart + frontCount, dmxUniverse: 3),
            PlotWizardFixtureGroupPlan(positionKey: "back", role: "Backlight", profileId: settings.backProfile, count: backCount, color: productionType == "concert" ? "R80" : "R119", focus: "separate performers from the cyc and rear masking", crew: "Patch as independent color lanes when dimmers allow.", channelStart: channelStart + frontCount + midCount, dmxUniverse: 3),
            PlotWizardFixtureGroupPlan(positionKey: "specials", role: "Specials", profileId: settings.specialsProfile, count: productionType == "comedy" ? 1 : 2, color: settings.color, focus: productionType == "corporate" ? "podium and panel table" : "center special plus one flexible downstage special", crew: "Refine these after blocking is known.", channelStart: channelStart + frontCount + midCount + backCount, dmxUniverse: 3),
        ]

        if movingCount > 0 {
            groups.append(
                PlotWizardFixtureGroupPlan(positionKey: "movers", role: "Moving looks", profileId: settings.movingProfile, count: movingCount, color: "", focus: "fan looks, aerial texture, and lead vocal pickup", crew: "Confirm console mode before addressing.", channelStart: channelStart + frontCount + midCount + backCount + 2, dmxUniverse: 4)
            )
        }

        return PlotWizardPlan(
            version: plotStarterVersion,
            source: "plotforge-native-starter",
            brief: normalizedBrief,
            productionType: productionType,
            productionLabel: settings.label,
            stageWidthMm: feetToMillimeters(stage.widthFeet),
            stageDepthMm: feetToMillimeters(stage.depthFeet),
            positions: positions,
            fixtureGroups: groups,
            notes: [
                "Assumption: \(settings.label) starter for a \(stage.widthFeet) ft by \(stage.depthFeet) ft stage.",
                "Local rules generate this first pass. A provider backed model can refine it later.",
            ]
        )
    }

    public static func applyWizardPlan(
        _ plan: PlotWizardPlan,
        to document: PlotShowDocument,
        updatedAt: Int64? = nil
    ) -> PlotWizardApplyResult {
        guard !plan.positions.isEmpty,
              !plan.fixtureGroups.isEmpty
        else {
            return PlotWizardApplyResult(document: document, addedPositionIds: [], addedFixtureIds: [])
        }

        var next = document
        var addedPositionIds: [String] = []
        var addedFixtureIds: [String] = []
        var positionIdsByKey: [String: String] = [:]
        var usedPositionIds = Set(next.positions.keys)
        var usedFixtureIds = Set(next.fixtures.keys)

        for positionPlan in plan.positions {
            let positionId = uniqueId(base: "ai_\(positionPlan.key)", used: usedPositionIds)
            usedPositionIds.insert(positionId)
            let position = Position(
                id: positionId,
                name: positionPlan.name,
                kind: positionPlan.kind,
                yMm: positionPlan.yMm,
                lengthMm: positionPlan.lengthMm,
                trimMm: positionPlan.trimMm
            )
            next.positions[positionId] = position
            next.positionOrder.append(positionId)
            positionIdsByKey[positionPlan.key] = positionId
            addedPositionIds.append(positionId)
        }

        var nextAddressByUniverse: [Int: Int] = [:]
        for group in plan.fixtureGroups {
            guard let positionId = positionIdsByKey[group.positionKey],
                  let position = next.positions[positionId],
                  getProfile(group.profileId, in: next.fixtureProfiles) != nil
            else {
                continue
            }
            let universe = group.dmxUniverse
            if nextAddressByUniverse[universe] == nil {
                nextAddressByUniverse[universe] = max(1, maxDmxEnd(in: next, universe: universe) + 1)
            }

            let points = fixturePoints(count: group.count, lengthMm: position.lengthMm)
            for (index, xMm) in points.enumerated() {
                guard let profile = getProfile(group.profileId, in: next.fixtureProfiles) else { continue }
                let address = nextAddressByUniverse[universe] ?? 1
                let fixtureId = uniqueId(base: "ai_fx", used: usedFixtureIds)
                usedFixtureIds.insert(fixtureId)
                let colorNote = group.color.isEmpty ? "" : "Starter gel \(group.color)"
                let fixture = Fixture(
                    id: fixtureId,
                    positionId: positionId,
                    profileId: group.profileId,
                    xMm: xMm,
                    channel: group.channelStart + index,
                    dmx: address <= 512 ? DmxAddress(universe: universe, address: address) : nil,
                    color: group.color,
                    notes: FixtureNotes(
                        color: colorNote,
                        focus: group.focus,
                        crew: "\(group.role). \(group.crew)"
                    ),
                    status: "planned",
                    circuit: "AI-\(slug(group.role))-\(index + 1)",
                    dimmer: ""
                )
                next.fixtures[fixtureId] = fixture
                next.fixtureOrder.append(fixtureId)
                next = PlotDocumentEditing.renumberPosition(in: next, positionId: positionId)
                addedFixtureIds.append(fixtureId)
                nextAddressByUniverse[universe] = address + max(1, profile.dmxFootprint)
            }
        }

        if !addedPositionIds.isEmpty || !addedFixtureIds.isEmpty {
            next.updatedAt = updatedAt ?? currentTimestampMilliseconds()
        }

        return PlotWizardApplyResult(
            document: next,
            addedPositionIds: addedPositionIds,
            addedFixtureIds: addedFixtureIds
        )
    }

    public static func patchSummary(in document: PlotShowDocument) -> (rows: Int, dmxConflicts: Int, channelConflicts: Int, checks: Int) {
        (
            rows: patchTableRows(in: document).count,
            dmxConflicts: patchConflicts(in: document).count,
            channelConflicts: channelConflicts(in: document).count,
            checks: checkRows(in: document).count
        )
    }

    private static func buildConflictMaps(in document: PlotShowDocument) -> (dmx: [String: [String]], channels: [String: [String]]) {
        var dmx: [String: [String]] = [:]
        var channels: [String: [String]] = [:]

        for conflict in patchConflicts(in: document) {
            let label = "DMX U\(conflict.universe)"
            dmx[conflict.a.fixtureId, default: []].append(label)
            dmx[conflict.b.fixtureId, default: []].append(label)
        }
        for conflict in channelConflicts(in: document) {
            let label = "channel \(conflict.channel)"
            channels[conflict.aFixtureId, default: []].append(label)
            channels[conflict.bFixtureId, default: []].append(label)
        }
        return (dmx, channels)
    }

    private static func dmxFootprint(for fixture: Fixture, in document: PlotShowDocument) -> Int {
        max(1, getProfile(fixture.profileId, in: document.fixtureProfiles)?.dmxFootprint ?? 1)
    }

    private static func dmxRangeLabel(universe: Int?, address: Int?, endAddress: Int?) -> String {
        guard let universe,
              let address,
              let endAddress
        else {
            return "Unpatched"
        }
        return "U\(universe) \(address)-\(endAddress)"
    }

    private static func profileDisplayName(_ profile: FixtureProfile?) -> String {
        guard let profile else { return "Unknown profile" }
        return profileDisplayName(profile)
    }

    private static func profileDisplayName(_ profile: FixtureProfile) -> String {
        [profile.manufacturer, profile.model]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    private static func normalizedCircuitValue(_ value: String) -> String {
        value
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
    }

    private static func circuitLabel(circuit: String, dimmer: String) -> String {
        if !circuit.isEmpty && !dimmer.isEmpty {
            return "Circuit \(circuit) / Dimmer \(dimmer)"
        }
        if !circuit.isEmpty {
            return "Circuit \(circuit)"
        }
        if !dimmer.isEmpty {
            return "Dimmer \(dimmer)"
        }
        return "Unassigned"
    }

    private static func normalizedNotes(_ notes: FixtureNotes, legacyNote: String) -> FixtureNotes {
        PlotInspectorValidation.normalizedNotes(notes, legacyNote: legacyNote)
    }

    private static func notesLabel(_ notes: FixtureNotes) -> String {
        [
            ("Color", notes.color),
            ("Gobo", notes.gobo),
            ("Focus", notes.focus),
            ("Crew", notes.crew),
        ]
        .filter { !$0.1.isEmpty }
        .map { "\($0.0): \($0.1)" }
        .joined(separator: " | ")
    }

    private static func statusLabel(_ status: String) -> String {
        switch PlotInspectorValidation.normalizedFixtureStatus(status) {
        case "hung":
            return "Hung"
        case "patched":
            return "Patched"
        case "focused":
            return "Focused"
        case "needs_work":
            return "Needs work"
        default:
            return "Planned"
        }
    }

    private static func fixtureLabel(_ document: PlotShowDocument, _ fixtureId: String) -> String {
        guard let fixture = document.fixtures[fixtureId] else { return "Missing fixture" }
        let position = document.positions[fixture.positionId]
        let profile = getProfile(fixture.profileId, in: document.fixtureProfiles)
        let unit = fixture.unitNumber.map { "\($0)" } ?? "?"
        return "\(position?.name ?? "Unassigned") \(unit) | \(profileDisplayName(profile))"
    }

    private static func labelControlText(enabled: Bool, size: Int) -> String {
        "\(enabled ? "On" : "Off") / \(size)%"
    }

    private static func customRows(
        prefix: String,
        fields: [String: JSONValue],
        excluding excludedKeys: Set<String> = []
    ) -> [FixtureProfileDetailRow] {
        fields.keys.sorted()
            .filter { !excludedKeys.contains($0) }
            .compactMap { key in
                guard let value = fields[key],
                      let summary = jsonValueSummary(value)
                else {
                    return nil
                }
                return FixtureProfileDetailRow(label: "\(prefix) \(humanizedKey(key))", value: summary)
            }
    }

    private static func jsonString(_ value: JSONValue?) -> String? {
        guard case .string(let string)? = value,
              !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        else {
            return nil
        }
        return string
    }

    private static func jsonValueSummary(_ value: JSONValue) -> String? {
        switch value {
        case .string(let string):
            let clean = string.trimmingCharacters(in: .whitespacesAndNewlines)
            return clean.isEmpty ? nil : clean
        case .number(let number):
            if number.rounded() == number {
                return String(Int(number))
            }
            return String(number)
        case .bool(let bool):
            return bool ? "Yes" : "No"
        case .array(let values):
            let parts = values.compactMap(jsonValueSummary)
            return parts.isEmpty ? nil : parts.joined(separator: ", ")
        case .object(let object):
            let parts = object.keys.sorted().compactMap { key -> String? in
                guard let value = object[key],
                      let summary = jsonValueSummary(value)
                else {
                    return nil
                }
                return "\(humanizedKey(key)): \(summary)"
            }
            return parts.isEmpty ? nil : parts.joined(separator: "; ")
        case .null:
            return nil
        }
    }

    private static func humanizedKey(_ key: String) -> String {
        key
            .replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "-", with: " ")
            .split(whereSeparator: { $0.isWhitespace })
            .map { part in
                part.prefix(1).uppercased() + String(part.dropFirst())
            }
            .joined(separator: " ")
    }

    private static func maxExistingChannel(in document: PlotShowDocument) -> Int {
        document.fixtures.values.compactMap(\.channel).max() ?? 0
    }

    private static func maxDmxEnd(in document: PlotShowDocument, universe: Int) -> Int {
        document.fixtures.values.reduce(0) { currentMax, fixture in
            guard fixture.dmx?.universe == universe,
                  let address = fixture.dmx?.address
            else {
                return currentMax
            }
            return max(currentMax, address + dmxFootprint(for: fixture, in: document) - 1)
        }
    }

    private static func fixturePoints(count: Int, lengthMm: Int) -> [Int] {
        guard count > 1 else { return [0] }
        let span = max(feetToMillimeters(4), lengthMm - feetToMillimeters(4))
        let start = -Double(span) / 2
        let step = Double(span) / Double(count - 1)
        return (0..<count).map { Int((start + step * Double($0)).rounded()) }
    }

    private static func stageSize(for document: PlotShowDocument, brief: String) -> (widthFeet: Int, depthFeet: Int) {
        if let parsed = parseStageSize(from: brief) {
            return parsed
        }
        return (
            widthFeet: Int((Double(document.venue.stageWidthMm) / 304.8).rounded()),
            depthFeet: Int((Double(document.venue.stageDepthMm) / 304.8).rounded())
        )
    }

    private static func parseStageSize(from brief: String) -> (widthFeet: Int, depthFeet: Int)? {
        let pattern = #"\b(\d{2,3})(?:\s*(?:'|ft|feet))?\s*(?:x|by)\s*(\d{2,3})(?:\s*(?:'|ft|feet))?\b"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
              let match = regex.firstMatch(in: brief, range: NSRange(brief.startIndex..<brief.endIndex, in: brief)),
              match.numberOfRanges == 3,
              let widthRange = Range(match.range(at: 1), in: brief),
              let depthRange = Range(match.range(at: 2), in: brief),
              let width = Int(brief[widthRange]),
              let depth = Int(brief[depthRange])
        else {
            return nil
        }
        return (
            widthFeet: min(max(width, 12), 120),
            depthFeet: min(max(depth, 8), 90)
        )
    }

    private static func productionType(for brief: String) -> String {
        let lower = brief.lowercased()
        if ["concert", "band", "music", "gig", "tour"].contains(where: lower.contains) {
            return "concert"
        }
        if ["dance", "ballet", "movement", "choreo"].contains(where: lower.contains) {
            return "dance"
        }
        if ["corporate", "keynote", "panel", "podium", "conference"].contains(where: lower.contains) {
            return "corporate"
        }
        if ["comedy", "standup", "stand up"].contains(where: lower.contains) {
            return "comedy"
        }
        return "musical"
    }

    private struct WizardSettings {
        var label: String
        var color: String
        var focus: String
        var crew: String
        var frontProfile: String
        var midProfile: String
        var backProfile: String
        var specialsProfile: String
        var movingProfile: String
    }

    private static func wizardSettings(for productionType: String) -> WizardSettings {
        switch productionType {
        case "concert":
            return WizardSettings(label: "Concert", color: "R119", focus: "bold backlight, aerial texture, and center vocal special", crew: "Build energy looks first, then clean a center vocal special.", frontProfile: "s4_26", midProfile: "par64", backProfile: "spot_mh", specialsProfile: "s4_26", movingProfile: "spot_mh")
        case "dance":
            return WizardSettings(label: "Dance", color: "R80", focus: "high side look and saturated backlight lanes", crew: "Prioritize sculpted bodies, side color, and open center specials.", frontProfile: "s4_26", midProfile: "par64", backProfile: "par64", specialsProfile: "fresnel", movingProfile: "spot_mh")
        case "corporate":
            return WizardSettings(label: "Corporate", color: "R3202", focus: "flat camera safe face wash and podium specials", crew: "Keep color neutral, avoid harsh backlight on presenters.", frontProfile: "s4_26", midProfile: "fresnel", backProfile: "par64", specialsProfile: "s4_26", movingProfile: "spot_mh")
        case "comedy":
            return WizardSettings(label: "Comedy", color: "R33", focus: "tight warm center special with low spill", crew: "Keep the plot simple and leave room for handheld mic movement.", frontProfile: "s4_26", midProfile: "fresnel", backProfile: "par64", specialsProfile: "s4_26", movingProfile: "spot_mh")
        default:
            return WizardSettings(label: "Musical theatre", color: "R02", focus: "warm face wash with clear acting area coverage", crew: "Start with even front wash, back color, and two downstage specials.", frontProfile: "s4_26", midProfile: "fresnel", backProfile: "par64", specialsProfile: "s4_26", movingProfile: "spot_mh")
        }
    }

    private static func scaledEvenCount(_ widthFeet: Int, divisor: Int, min minimum: Int, max maximum: Int) -> Int {
        let rounded = Int((Double(widthFeet) / Double(divisor)).rounded())
        let clamped = min(max(rounded, minimum), maximum)
        return clamped.isMultiple(of: 2) ? clamped : clamped + 1
    }

    private static func feetToMillimeters(_ feet: Int) -> Int {
        Int((Double(feet) * 304.8).rounded())
    }

    private static func uniqueId(base: String, used: Set<String>) -> String {
        if !used.contains(base) {
            return base
        }
        var index = 2
        while used.contains("\(base)_\(index)") {
            index += 1
        }
        return "\(base)_\(index)"
    }

    private static func slug(_ value: String) -> String {
        let clean = value
            .uppercased()
            .map { character -> Character in
                character.isLetter || character.isNumber ? character : "-"
            }
        return String(clean)
            .split(separator: "-")
            .joined(separator: "-")
    }

    private static func currentTimestampMilliseconds() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}
