import PlotForgeCore
import XCTest

final class PlotDmxOutputTests: XCTestCase {
    func testSelectedLedFixtureMatchesWebGoldenSlots() throws {
        let document = dmxGoldenDocument()
        let result = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(
            selectedFixtureId: "fx_led_one",
            values: [
                "intensity": 200,
                "red": 255,
                "green": 128,
                "blue": 64,
                "white": 32,
            ]
        ))
        let universe = try XCTUnwrap(result.universes.first)

        XCTAssertFalse(result.blocked)
        XCTAssertEqual(universe.slots.count, PlotDmxOutput.slotCount)
        XCTAssertEqual(universe.slots[9], 200)
        XCTAssertEqual(universe.slots[10], 255)
        XCTAssertEqual(universe.slots[11], 128)
        XCTAssertEqual(universe.slots[12], 64)
        XCTAssertEqual(universe.slots[13], 32)
        XCTAssertEqual(universe.slots[0], 0)
        XCTAssertEqual(universe.slots[14], 0)
        XCTAssertEqual(universe.slots[15], 0)
        XCTAssertEqual(universe.slots[16], 0)
        XCTAssertEqual(universe.slots[39], 0)
        XCTAssertEqual(universe.nonZeroSlots.map(\.address), [10, 11, 12, 13, 14])
        XCTAssertEqual(universe.nonZeroSlots.map { Int($0.value) }, [200, 255, 128, 64, 32])
        XCTAssertEqual(universe.nonZeroSlots.map(\.type), ["intensity", "red", "green", "blue", "white"])
        XCTAssertEqual(
            universe.nonZeroSlots.first?.explanation,
            "Generic RGBW 8ch with dimmer slot 1 writes intensity (Dimmer)"
        )
    }

    func testBlackoutKeepsEveryActiveUniverseAtZero() throws {
        let result = PlotDmxOutput.compile(dmxGoldenDocument(), options: DmxOutputCompileOptions(intent: .blackout))
        let universe = try XCTUnwrap(result.universes.first)

        XCTAssertFalse(result.blocked)
        XCTAssertTrue(universe.slots.allSatisfy { $0 == 0 })
        XCTAssertEqual(universe.nonZeroSlots, [])
    }

    func testInvalidRangeAndOverlapBlockOutput() throws {
        var invalid = dmxGoldenDocument()
        invalid.fixtures["fx_mover_one"]?.dmx = DmxAddress(universe: 1, address: 500)

        let invalidResult = PlotDmxOutput.compile(invalid, options: DmxOutputCompileOptions(selectedFixtureId: "fx_led_one"))
        XCTAssertTrue(invalidResult.blocked)
        XCTAssertTrue(invalidResult.errors.contains { $0.code == "invalid-range" && $0.fixtureId == "fx_mover_one" })
        XCTAssertTrue(try XCTUnwrap(invalidResult.universes.first).slots.allSatisfy { $0 == 0 })

        var overlap = dmxGoldenDocument()
        overlap.fixtures["fx_s4_one"]?.dmx = DmxAddress(universe: 1, address: 12)

        let overlapResult = PlotDmxOutput.compile(overlap, options: DmxOutputCompileOptions(selectedFixtureId: "fx_led_one"))
        XCTAssertTrue(overlapResult.blocked)
        XCTAssertTrue(overlapResult.errors.contains { $0.code == "overlap" })
        XCTAssertTrue(try XCTUnwrap(overlapResult.universes.first).slots.allSatisfy { $0 == 0 })
    }

    func testSimpleMovingFixtureMapsOnlySafeIntensity() throws {
        let result = PlotDmxOutput.compile(dmxGoldenDocument(), options: DmxOutputCompileOptions(
            selectedFixtureId: "fx_mover_one",
            values: [
                "intensity": 255,
                "panCoarse": 255,
                "panFine": 255,
                "tiltCoarse": 255,
                "tiltFine": 255,
                "reset": 255,
            ]
        ))
        let universe = try XCTUnwrap(result.universes.first)

        XCTAssertFalse(result.blocked)
        XCTAssertEqual(result.warnings, [])
        XCTAssertEqual(universe.slots[39], 255)
        for address in 41...49 {
            XCTAssertEqual(universe.slots[address - 1], 0)
        }
        XCTAssertEqual(universe.nonZeroSlots.map(\.explanation), [
            "Generic simple moving spot 24ch slot 1 writes intensity (Dimmer)",
        ])
    }

    func testApprovedCustomOutputMapCanDriveNativeCompiler() throws {
        var document = dmxGoldenDocument()
        document.fixtureProfiles["ofl_demo_tiny_wash"] = FixtureProfile(
            id: "ofl_demo_tiny_wash",
            manufacturer: "Demo",
            model: "Tiny Wash",
            symbol: "par",
            category: "led-wash",
            radiusMm: 235,
            dmxFootprint: 3,
            defaultMode: "RGB",
            modes: [FixtureMode(name: "RGB", dmxFootprint: 3)],
            libraryTier: "ofl-import",
            extraFields: [
                "outputMap": .object([
                    "id": .string("ofl_demo_tiny_wash-output-map"),
                    "label": .string("Tiny Wash approved map"),
                    "footprint": .number(3),
                    "source": .object(["approved": .bool(true)]),
                    "channels": .array([
                        .object(["slot": .number(1), "label": .string("Red"), "type": .string("red")]),
                        .object(["slot": .number(2), "label": .string("Green"), "type": .string("green")]),
                        .object(["slot": .number(3), "label": .string("Blue"), "type": .string("blue")]),
                    ]),
                ]),
            ]
        )
        document.fixtures["fx_ofl"] = Fixture(
            id: "fx_ofl",
            positionId: "pos_stage",
            profileId: "ofl_demo_tiny_wash",
            xMm: 2438,
            unitNumber: 4,
            dmx: DmxAddress(universe: 1, address: 100)
        )
        document.fixtureOrder.append("fx_ofl")

        let result = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(
            selectedFixtureId: "fx_ofl",
            values: ["red": 11, "green": 22, "blue": 33]
        ))
        let universe = try XCTUnwrap(result.universes.first)

        XCTAssertFalse(result.blocked)
        XCTAssertEqual(universe.slots[99], 11)
        XCTAssertEqual(universe.slots[100], 22)
        XCTAssertEqual(universe.slots[101], 33)
    }

    func testApprovedOutputMapFootprintMismatchWarns() throws {
        var document = dmxGoldenDocument()
        document.fixtureProfiles["ofl_mismatch"] = FixtureProfile(
            id: "ofl_mismatch",
            manufacturer: "Demo",
            model: "Mismatch Wash",
            symbol: "par",
            category: "led-wash",
            radiusMm: 235,
            dmxFootprint: 8,
            defaultMode: "RGBAWUV",
            modes: [FixtureMode(name: "RGBAWUV", dmxFootprint: 8)],
            libraryTier: "ofl-import",
            extraFields: [
                "outputMap": .object([
                    "id": .string("ofl_mismatch-output-map"),
                    "label": .string("Mismatch approved map"),
                    "footprint": .number(4),
                    "source": .object(["approved": .bool(true)]),
                    "channels": .array([
                        .object(["slot": .number(1), "label": .string("Red"), "type": .string("red")]),
                        .object(["slot": .number(2), "label": .string("Green"), "type": .string("green")]),
                        .object(["slot": .number(3), "label": .string("Blue"), "type": .string("blue")]),
                        .object(["slot": .number(4), "label": .string("White"), "type": .string("white")]),
                    ]),
                ]),
            ]
        )
        document.fixtures["fx_mismatch"] = Fixture(
            id: "fx_mismatch",
            positionId: "pos_stage",
            profileId: "ofl_mismatch",
            xMm: 2_438,
            unitNumber: 4,
            dmx: DmxAddress(universe: 1, address: 100)
        )
        document.fixtureOrder.append("fx_mismatch")

        let result = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(selectedFixtureId: "fx_mismatch"))
        let warning = try XCTUnwrap(result.warnings.first { $0.code == "footprint-mismatch" && $0.fixtureId == "fx_mismatch" })

        XCTAssertFalse(result.blocked)
        XCTAssertEqual(warning.universe, 1)
        XCTAssertTrue(warning.message.contains("8ch footprint"))
        XCTAssertTrue(warning.message.contains("expects 4ch"))
    }

    func testCycStripRgbwStaysPaperworkOnlyUntilSharedMapExists() throws {
        var document = dmxGoldenDocument()
        document.fixtures["fx_cyc"] = Fixture(
            id: "fx_cyc",
            positionId: "pos_stage",
            profileId: "cyc_strip_rgbw",
            xMm: 2_438,
            unitNumber: 4,
            dmx: DmxAddress(universe: 1, address: 100)
        )
        document.fixtureOrder.append("fx_cyc")

        let result = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(selectedFixtureId: "fx_cyc"))
        let warning = try XCTUnwrap(result.warnings.first { $0.code == "unmapped-personality" && $0.fixtureId == "fx_cyc" })

        XCTAssertFalse(result.blocked)
        XCTAssertEqual(warning.universe, 1)
        XCTAssertTrue(warning.message.contains("no DMX output map"))
    }

    func testNativeArtNetPacketMatchesExpectedHeaderAndPayload() throws {
        let document = dmxGoldenDocument()
        let result = PlotDmxOutput.compile(document, options: DmxOutputCompileOptions(
            selectedFixtureId: "fx_led_one",
            values: ["intensity": 200, "red": 255, "green": 128, "blue": 64, "white": 32]
        ))
        let universe = try XCTUnwrap(result.universes.first)

        let packet = try PlotDmxOutput.artNetDmxPacket(
            slots: universe.slots,
            portAddress: DmxArtNetPortAddress(net: 1, subNet: 2, universe: 3),
            sequence: 7
        )

        XCTAssertEqual(packet.count, 530)
        XCTAssertEqual(Array(packet.prefix(18)), [
            0x41, 0x72, 0x74, 0x2D, 0x4E, 0x65, 0x74, 0x00,
            0x00, 0x50,
            0x00, 0x0E,
            0x07,
            0x00,
            0x23,
            0x01,
            0x02, 0x00,
        ])
        XCTAssertEqual(packet[18 + 9], 200)
        XCTAssertEqual(packet[18 + 10], 255)
        XCTAssertEqual(packet[18 + 11], 128)
        XCTAssertEqual(packet[18 + 12], 64)
        XCTAssertEqual(packet[18 + 13], 32)
    }

    func testArtNetPacketValidationRejectsBadAddressAndPayload() {
        XCTAssertThrowsError(try PlotDmxOutput.artNetDmxPacket(
            slots: [0, 0],
            portAddress: DmxArtNetPortAddress(net: 128, subNet: 0, universe: 0)
        )) { error in
            XCTAssertEqual(error as? DmxOutputTransportError, .invalidPortAddress)
        }

        XCTAssertThrowsError(try PlotDmxOutput.artNetDmxPacket(
            slots: [0],
            portAddress: DmxArtNetPortAddress()
        )) { error in
            XCTAssertEqual(error as? DmxOutputTransportError, .invalidPayloadLength(1))
        }
    }

    private func dmxGoldenDocument() -> PlotShowDocument {
        let position = Position(id: "pos_stage", name: "1ST ELEC", yMm: -2_438, lengthMm: 8_534)
        let profiles = Dictionary(uniqueKeysWithValues: PlotToolModules.seededFixtureProfiles
            .filter { ["s4_26", "led_par_rgbw", "spot_mh"].contains($0.id) }
            .map { ($0.id, $0) })
        let fixtures = [
            "fx_s4_one": Fixture(
                id: "fx_s4_one",
                positionId: "pos_stage",
                profileId: "s4_26",
                xMm: -1_829,
                unitNumber: 1,
                dmx: DmxAddress(universe: 1, address: 1)
            ),
            "fx_led_one": Fixture(
                id: "fx_led_one",
                positionId: "pos_stage",
                profileId: "led_par_rgbw",
                xMm: 0,
                unitNumber: 2,
                dmx: DmxAddress(universe: 1, address: 10)
            ),
            "fx_mover_one": Fixture(
                id: "fx_mover_one",
                positionId: "pos_stage",
                profileId: "spot_mh",
                xMm: 1_829,
                unitNumber: 3,
                dmx: DmxAddress(universe: 1, address: 40)
            ),
        ]

        return PlotShowDocument(
            id: "show_dmx_golden",
            name: "DMX Golden Test Plot",
            positions: ["pos_stage": position],
            positionOrder: ["pos_stage"],
            fixtures: fixtures,
            fixtureOrder: ["fx_s4_one", "fx_led_one", "fx_mover_one"],
            fixtureProfiles: profiles
        )
    }
}
