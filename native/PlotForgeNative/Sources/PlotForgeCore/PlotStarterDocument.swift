import Foundation

public extension PlotShowDocument {
    static func starterDocument(
        timestamp: Int64 = Int64(Date().timeIntervalSince1970 * 1000)
    ) -> PlotShowDocument {
        let firstElectricId = "pos_1"
        let fohTrussId = "pos_2"
        let sourceFourId = "s4_26"
        let moverId = "robe_megapointe"

        return PlotShowDocument(
            id: "show_native",
            name: "Untitled Show",
            metadata: ProjectMetadata(
                drawingTitle: "Lighting Plot",
                venueName: "Studio A",
                scaleLabel: "1/4\" = 1'-0\""
            ),
            createdAt: timestamp,
            updatedAt: timestamp,
            venue: Venue(
                stageWidthMm: 10_973,
                stageDepthMm: 6_706,
                proscWidthMm: 9_144
            ),
            positions: [
                firstElectricId: Position(
                    id: firstElectricId,
                    name: "1ST ELEC",
                    kind: "pipe",
                    yMm: 1_524,
                    lengthMm: 9_754,
                    trimMm: 6_096
                ),
                fohTrussId: Position(
                    id: fohTrussId,
                    name: "FOH TRUSS",
                    kind: "truss",
                    yMm: -1_829,
                    lengthMm: 8_534,
                    trimMm: 7_620
                ),
            ],
            positionOrder: [firstElectricId, fohTrussId],
            fixtures: [
                "fx_1": Fixture(
                    id: "fx_1",
                    positionId: firstElectricId,
                    profileId: sourceFourId,
                    xMm: -2_438,
                    focus: FocusPoint(xMm: -1_524, yMm: 3_658),
                    unitNumber: 1,
                    channel: 101,
                    dmx: DmxAddress(universe: 1, address: 1),
                    color: "R02",
                    note: "Check shutter cut",
                    notes: FixtureNotes(
                        color: "R02",
                        focus: "Downstage special",
                        crew: "Check shutter cut"
                    ),
                    circuit: "A1",
                    dimmer: "D1"
                ),
                "fx_2": Fixture(
                    id: "fx_2",
                    positionId: fohTrussId,
                    profileId: moverId,
                    xMm: 1_219,
                    unitNumber: 1,
                    channel: 201,
                    dmx: DmxAddress(universe: 2, address: 101),
                    status: "patched",
                    circuit: "B4",
                    dimmer: "R1"
                ),
            ],
            fixtureOrder: ["fx_1", "fx_2"],
            fixtureProfiles: [
                sourceFourId: FixtureProfile(
                    id: sourceFourId,
                    manufacturer: "ETC",
                    model: "Source Four 26deg",
                    symbol: "ellipsoidal",
                    category: "ellipsoidal",
                    radiusMm: 180,
                    dmxFootprint: 1,
                    color: "#ffb547",
                    modes: [
                        FixtureMode(name: "Default", dmxFootprint: 1),
                    ],
                    info: FixtureProfileInfo(
                        summary: "Fixed ellipsoidal profile for specials and front light.",
                        bestFor: ["front wash", "specials"],
                        capabilities: ["single dimmer"],
                        notes: ["Confirm lens tube before final paperwork."]
                    ),
                    libraryTier: "legacy",
                    source: ["type": .string("native-starter")]
                ),
                moverId: FixtureProfile(
                    id: moverId,
                    manufacturer: "Robe",
                    model: "MegaPointe",
                    symbol: "moving",
                    category: "moving",
                    radiusMm: 210,
                    dmxFootprint: 34,
                    color: "#7bb5ff",
                    defaultMode: "Mode 1",
                    modes: [
                        FixtureMode(name: "Mode 1", dmxFootprint: 34),
                    ],
                    info: FixtureProfileInfo(
                        summary: "Hybrid moving fixture starter profile.",
                        bestFor: ["aerial effects", "beam looks"],
                        capabilities: ["pan/tilt", "color wheel", "gobo wheel", "prism"],
                        notes: ["Replace with show-specific profile before final patch."]
                    ),
                    libraryTier: "starter",
                    source: ["type": .string("native-starter")]
                ),
            ],
            revisions: [
                "rev_1": Revision(
                    id: "rev_1",
                    name: "Draft",
                    note: "Native starter document",
                    createdAt: timestamp
                ),
            ],
            revisionOrder: ["rev_1"],
            activeRevisionId: "rev_1",
            commentPins: [
                "pin_1": CommentPin(
                    id: "pin_1",
                    xMm: 0,
                    yMm: 3_048,
                    text: "Confirm masking",
                    createdAt: timestamp
                ),
            ],
            commentPinOrder: ["pin_1"],
            oscBridge: OscBridgeSettings(),
            labelSettings: LabelSettings()
        )
    }
}
