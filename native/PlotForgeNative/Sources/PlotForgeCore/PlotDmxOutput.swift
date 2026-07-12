import Foundation
@preconcurrency import Network

public enum DmxOutputIntent: String, Sendable {
    case selectedFixtureTest = "selected-fixture-test"
    case blackout
}

public struct DmxOutputCompileOptions: Equatable, Sendable {
    public var intent: DmxOutputIntent
    public var selectedFixtureId: String?
    public var values: [String: Int]

    public init(
        intent: DmxOutputIntent = .selectedFixtureTest,
        selectedFixtureId: String? = nil,
        values: [String: Int] = PlotDmxOutput.defaultTestValues
    ) {
        self.intent = intent
        self.selectedFixtureId = selectedFixtureId
        self.values = values
    }
}

public struct DmxOutputIssue: Equatable, Sendable {
    public var code: String
    public var severity: String
    public var fixtureId: String?
    public var universe: Int?
    public var message: String

    public init(code: String, severity: String, fixtureId: String? = nil, universe: Int? = nil, message: String) {
        self.code = code
        self.severity = severity
        self.fixtureId = fixtureId
        self.universe = universe
        self.message = message
    }
}

public struct DmxSlotWrite: Equatable, Sendable {
    public var address: Int
    public var value: UInt8
    public var fixtureId: String
    public var type: String
    public var label: String
    public var explanation: String
}

public struct DmxUniverseOutput: Equatable, Sendable {
    public var universe: Int
    public var blocked: Bool
    public var slots: [UInt8]
    public var nonZeroSlots: [DmxSlotWrite]
}

public struct DmxOutputCompilation: Equatable, Sendable {
    public var intent: DmxOutputIntent
    public var selectedFixtureId: String?
    public var blocked: Bool
    public var errors: [DmxOutputIssue]
    public var warnings: [DmxOutputIssue]
    public var universes: [DmxUniverseOutput]
}

public struct DmxArtNetPortAddress: Equatable, Sendable {
    public var net: Int
    public var subNet: Int
    public var universe: Int

    public init(net: Int = 0, subNet: Int = 0, universe: Int = 0) {
        self.net = net
        self.subNet = subNet
        self.universe = universe
    }
}

public struct DmxOutputTarget: Equatable, Sendable {
    public var host: String
    public var port: UInt16

    public init(host: String = "127.0.0.1", port: UInt16 = 6_454) {
        self.host = host
        self.port = port
    }
}

public enum DmxOutputTransportError: Error, Equatable, LocalizedError {
    case invalidPortAddress
    case invalidPayloadLength(Int)
    case invalidTarget
    case sendFailed(String)

    public var errorDescription: String? {
        switch self {
        case .invalidPortAddress:
            "Art-Net Port-Address must use Net 0-127, Sub-Net 0-15, and Universe 0-15."
        case .invalidPayloadLength(let length):
            "DMX payload length must be 2-512 slots; got \(length)."
        case .invalidTarget:
            "DMX target host and port are required."
        case .sendFailed(let message):
            "Local network DMX send failed: \(message)"
        }
    }
}

private struct DmxFixtureRange: Equatable {
    var fixture: Fixture
    var profile: FixtureProfile?
    var universe: Int?
    var startAddress: Int?
    var endAddress: Int?
    var footprint: Int
    var valid: Bool
    var reason: String
}

private struct DmxOutputChannel: Equatable {
    var slot: Int
    var label: String
    var type: String
    var defaultValue: Int
    var safeMin: Int
    var safeMax: Int
    var unsafe: Bool
}

private struct DmxOutputProfile: Equatable {
    var id: String
    var profileIds: [String]
    var label: String
    var footprint: Int
    var approved: Bool
    var channels: [DmxOutputChannel]
}

public enum PlotDmxOutput {
    public static let slotCount = 512
    public static let version = 1
    public static let defaultTestValues = [
        "intensity": 255,
        "red": 255,
        "green": 255,
        "blue": 255,
        "white": 0,
        "amber": 0,
        "uv": 0,
    ]

    public static func compile(
        _ document: PlotShowDocument,
        options: DmxOutputCompileOptions = DmxOutputCompileOptions()
    ) -> DmxOutputCompilation {
        let values = defaultTestValues.merging(options.values) { _, override in override }
        var warnings: [DmxOutputIssue] = []
        var errors: [DmxOutputIssue] = []
        var ranges: [DmxFixtureRange] = []

        for fixture in orderedFixtures(document) {
            guard hasAnyPatchField(fixture) else { continue }
            guard let dmx = fixture.dmx, dmx.universe != nil, dmx.address != nil else {
                errors.append(DmxOutputIssue(
                    code: "incomplete-range",
                    severity: "error",
                    fixtureId: fixture.id,
                    message: "\(fixture.id) has an incomplete DMX patch."
                ))
                continue
            }

            let range = buildRange(document, fixture: fixture)
            ranges.append(range)

            if !range.valid {
                errors.append(DmxOutputIssue(
                    code: "invalid-range",
                    severity: "error",
                    fixtureId: fixture.id,
                    universe: range.universe,
                    message: "\(fixture.id): \(range.reason)"
                ))
            }

            if let outputMap = outputProfile(for: fixture.profileId, in: document) {
                if outputMap.footprint != range.footprint {
                    warnings.append(DmxOutputIssue(
                        code: "footprint-mismatch",
                        severity: "warning",
                        fixtureId: fixture.id,
                        universe: range.universe,
                        message: "\(fixture.id) has a \(range.footprint)ch footprint, but the output map expects \(outputMap.footprint)ch."
                    ))
                }
            } else {
                warnings.append(DmxOutputIssue(
                    code: "unmapped-personality",
                    severity: "warning",
                    fixtureId: fixture.id,
                    universe: range.universe,
                    message: "\(fixture.id) uses \(range.profile?.model ?? fixture.profileId), which has no DMX output map. Slots stay at zero."
                ))
            }
        }

        errors.append(contentsOf: overlapErrors(ranges))
        let blocked = !errors.isEmpty
        let universes = Array(Set(ranges.compactMap(\.universe).filter { $0 >= 1 })).sorted()
        var universeOutputs = universes.map { universe in
            DmxUniverseOutput(
                universe: universe,
                blocked: blocked,
                slots: Array(repeating: 0, count: slotCount),
                nonZeroSlots: []
            )
        }

        if !blocked && options.intent != .blackout, let selectedFixtureId = options.selectedFixtureId {
            for range in ranges where range.valid && range.fixture.id == selectedFixtureId {
                guard let outputMap = outputProfile(for: range.fixture.profileId, in: document),
                      let universeIndex = universeOutputs.firstIndex(where: { $0.universe == range.universe }) else {
                    continue
                }

                for channel in outputMap.channels {
                    guard !channel.unsafe, channel.type != "raw", channel.slot >= 1, channel.slot <= range.footprint else {
                        continue
                    }
                    guard let startAddress = range.startAddress else { continue }
                    let address = startAddress + channel.slot - 1
                    guard address >= 1, address <= slotCount else { continue }
                    let value = UInt8(clamp(values[channel.type] ?? channel.defaultValue, min: channel.safeMin, max: channel.safeMax))
                    universeOutputs[universeIndex].slots[address - 1] = value
                    if value > 0 {
                        universeOutputs[universeIndex].nonZeroSlots.append(DmxSlotWrite(
                            address: address,
                            value: value,
                            fixtureId: range.fixture.id,
                            type: channel.type,
                            label: channel.label,
                            explanation: "\(outputMap.label) slot \(channel.slot) writes \(channel.type) (\(channel.label))"
                        ))
                    }
                }
            }
        }

        return DmxOutputCompilation(
            intent: options.intent,
            selectedFixtureId: options.selectedFixtureId,
            blocked: blocked,
            errors: errors,
            warnings: warnings,
            universes: universeOutputs
        )
    }

    public static func artNetDmxPacket(
        slots: [UInt8],
        portAddress: DmxArtNetPortAddress = DmxArtNetPortAddress(),
        sequence: UInt8 = 0
    ) throws -> Data {
        guard portAddress.net >= 0, portAddress.net <= 127,
              portAddress.subNet >= 0, portAddress.subNet <= 15,
              portAddress.universe >= 0, portAddress.universe <= 15 else {
            throw DmxOutputTransportError.invalidPortAddress
        }
        guard slots.count >= 2, slots.count <= slotCount else {
            throw DmxOutputTransportError.invalidPayloadLength(slots.count)
        }

        var payload = slots
        if payload.count % 2 == 1 {
            payload.append(0)
        }

        let subUni = UInt8((portAddress.subNet << 4) | portAddress.universe)
        var packet = Data()
        packet.append(contentsOf: [0x41, 0x72, 0x74, 0x2D, 0x4E, 0x65, 0x74, 0x00])
        packet.append(contentsOf: [0x00, 0x50])
        packet.append(contentsOf: [0x00, 0x0E])
        packet.append(sequence)
        packet.append(0x00)
        packet.append(subUni)
        packet.append(UInt8(portAddress.net))
        packet.append(UInt8(payload.count >> 8))
        packet.append(UInt8(payload.count & 0xFF))
        packet.append(contentsOf: payload)
        return packet
    }
}

public final class PlotDmxUdpSender: @unchecked Sendable {
    public init() {}

    public func send(_ packet: Data, to target: DmxOutputTarget) async throws -> Int {
        guard !target.host.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let port = NWEndpoint.Port(rawValue: target.port) else {
            throw DmxOutputTransportError.invalidTarget
        }

        let host = NWEndpoint.Host(target.host)
        let connection = NWConnection(host: host, port: port, using: .udp)
        let queue = DispatchQueue(label: "plotforge.dmx.udp-send", qos: .userInitiated)

        return try await withCheckedThrowingContinuation { continuation in
            let completion = DmxUdpSendCompletion(continuation: continuation, connection: connection)

            connection.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    connection.send(content: packet, completion: .contentProcessed { error in
                        if let error {
                            completion.finish(.failure(DmxOutputTransportError.sendFailed(error.localizedDescription)))
                        } else {
                            completion.finish(.success(packet.count))
                        }
                    })
                case .failed(let error):
                    completion.finish(.failure(DmxOutputTransportError.sendFailed(error.localizedDescription)))
                case .cancelled:
                    break
                default:
                    break
                }
            }
            connection.start(queue: queue)
            queue.asyncAfter(deadline: .now() + 2) {
                completion.finish(.failure(DmxOutputTransportError.sendFailed("UDP send timed out")))
            }
        }
    }
}

private final class DmxUdpSendCompletion: @unchecked Sendable {
    private let continuation: CheckedContinuation<Int, Error>
    private let connection: NWConnection
    private let lock = NSLock()
    private var didResume = false

    init(continuation: CheckedContinuation<Int, Error>, connection: NWConnection) {
        self.continuation = continuation
        self.connection = connection
    }

    func finish(_ result: Result<Int, Error>) {
        lock.lock()
        defer { lock.unlock() }
        guard !didResume else { return }
        didResume = true
        connection.cancel()
        switch result {
        case .success(let bytesSent):
            continuation.resume(returning: bytesSent)
        case .failure(let error):
            continuation.resume(throwing: error)
        }
    }
}

private func outputProfile(for profileId: String, in document: PlotShowDocument) -> DmxOutputProfile? {
    if let profile = document.fixtureProfiles[profileId],
       let custom = approvedOutputMap(from: profile.extraFields["outputMap"], profileId: profileId) {
        return custom
    }
    return genericOutputProfile(for: profileId)
}

private func genericOutputProfile(for profileId: String) -> DmxOutputProfile? {
    if ["s4_26", "s4_19", "s4_36", "s4_50", "fresnel", "par64", "followspot_1200"].contains(profileId) {
        return DmxOutputProfile(
            id: "generic-dimmer-1ch",
            profileIds: [profileId],
            label: "Generic 1ch dimmer",
            footprint: 1,
            approved: true,
            channels: [channel(slot: 1, label: "Dimmer", type: "intensity")]
        )
    }
    if profileId == "led_par_rgbw" {
        return DmxOutputProfile(
            id: "generic-rgbw-dimmer-8ch",
            profileIds: [profileId],
            label: "Generic RGBW 8ch with dimmer",
            footprint: 8,
            approved: true,
            channels: [
                channel(slot: 1, label: "Dimmer", type: "intensity"),
                channel(slot: 2, label: "Red", type: "red"),
                channel(slot: 3, label: "Green", type: "green"),
                channel(slot: 4, label: "Blue", type: "blue"),
                channel(slot: 5, label: "White", type: "white"),
                channel(slot: 6, label: "Strobe", type: "strobe", unsafe: true),
                channel(slot: 7, label: "Macro", type: "raw", unsafe: true),
                channel(slot: 8, label: "Control", type: "raw", unsafe: true),
            ]
        )
    }
    if profileId == "cyc_strip" {
        return DmxOutputProfile(
            id: "generic-rgbw-4ch",
            profileIds: ["cyc_strip"],
            label: "Generic RGBW 4ch",
            footprint: 4,
            approved: true,
            channels: [
                channel(slot: 1, label: "Red", type: "red"),
                channel(slot: 2, label: "Green", type: "green"),
                channel(slot: 3, label: "Blue", type: "blue"),
                channel(slot: 4, label: "White", type: "white"),
            ]
        )
    }
    if profileId == "spot_mh" {
        return DmxOutputProfile(
            id: "generic-moving-spot-24ch",
            profileIds: [profileId],
            label: "Generic simple moving spot 24ch",
            footprint: 24,
            approved: true,
            channels: [
                channel(slot: 1, label: "Dimmer", type: "intensity"),
                channel(slot: 2, label: "Pan coarse", type: "panCoarse", unsafe: true),
                channel(slot: 3, label: "Pan fine", type: "panFine", unsafe: true),
                channel(slot: 4, label: "Tilt coarse", type: "tiltCoarse", unsafe: true),
                channel(slot: 5, label: "Tilt fine", type: "tiltFine", unsafe: true),
                channel(slot: 6, label: "Color wheel", type: "colorWheel", unsafe: true),
                channel(slot: 7, label: "Gobo wheel", type: "goboWheel", unsafe: true),
                channel(slot: 8, label: "Shutter", type: "shutter", unsafe: true),
                channel(slot: 9, label: "Strobe", type: "strobe", unsafe: true),
                channel(slot: 10, label: "Reset", type: "reset", unsafe: true),
            ]
        )
    }
    return nil
}

private func channel(
    slot: Int,
    label: String,
    type: String,
    defaultValue: Int = 0,
    safeMin: Int = 0,
    safeMax: Int = 255,
    unsafe: Bool = false
) -> DmxOutputChannel {
    DmxOutputChannel(
        slot: slot,
        label: label,
        type: type,
        defaultValue: unsafe ? 0 : defaultValue,
        safeMin: safeMin,
        safeMax: unsafe ? 0 : safeMax,
        unsafe: unsafe
    )
}

private func approvedOutputMap(from value: JSONValue?, profileId: String) -> DmxOutputProfile? {
    guard let object = value?.objectValue,
          object["source"]?.objectValue?["approved"]?.boolValue == true,
          let channels = object["channels"]?.arrayValue else {
        return nil
    }
    let parsedChannels = channels.enumerated().compactMap { index, item -> DmxOutputChannel? in
        guard let channelObject = item.objectValue else { return nil }
        let slot = channelObject["slot"]?.intValue ?? index + 1
        guard slot >= 1 else { return nil }
        return channel(
            slot: slot,
            label: channelObject["label"]?.stringValue ?? channelObject["name"]?.stringValue ?? "Slot \(slot)",
            type: channelObject["type"]?.stringValue ?? "raw",
            defaultValue: channelObject["default"]?.intValue ?? channelObject["defaultValue"]?.intValue ?? 0,
            safeMin: channelObject["safeMin"]?.intValue ?? 0,
            safeMax: channelObject["safeMax"]?.intValue ?? 255,
            unsafe: channelObject["unsafe"]?.boolValue ?? false
        )
    }
    guard !parsedChannels.isEmpty else { return nil }
    return DmxOutputProfile(
        id: object["id"]?.stringValue ?? "\(profileId)-output-map",
        profileIds: [profileId],
        label: object["label"]?.stringValue ?? "\(profileId) output map",
        footprint: object["footprint"]?.intValue ?? parsedChannels.map(\.slot).max() ?? 1,
        approved: true,
        channels: parsedChannels.sorted { $0.slot < $1.slot }
    )
}

private func orderedFixtures(_ document: PlotShowDocument) -> [Fixture] {
    var seen = Set<String>()
    var ordered: [Fixture] = []
    for id in document.fixtureOrder {
        if let fixture = document.fixtures[id] {
            ordered.append(fixture)
            seen.insert(id)
        }
    }
    let rest = document.fixtures.values
        .filter { !seen.contains($0.id) }
        .sorted { $0.id < $1.id }
    return ordered + rest
}

private func hasAnyPatchField(_ fixture: Fixture) -> Bool {
    guard let dmx = fixture.dmx else { return false }
    return dmx.universe != nil || dmx.address != nil
}

private func buildRange(_ document: PlotShowDocument, fixture: Fixture) -> DmxFixtureRange {
    let profile = fixtureProfile(fixture.profileId, in: document)
    let footprint = max(1, profile?.dmxFootprint ?? 1)
    let universe = fixture.dmx?.universe
    let startAddress = fixture.dmx?.address
    let endAddress = startAddress.map { $0 + footprint - 1 }
    let valid = universe.map { $0 >= 1 } == true
        && startAddress.map { $0 >= 1 } == true
        && endAddress.map { $0 <= PlotDmxOutput.slotCount } == true
    return DmxFixtureRange(
        fixture: fixture,
        profile: profile,
        universe: universe,
        startAddress: startAddress,
        endAddress: endAddress,
        footprint: footprint,
        valid: valid,
        reason: valid ? "" : invalidRangeReason(universe: universe, startAddress: startAddress, endAddress: endAddress)
    )
}

private func fixtureProfile(_ profileId: String, in document: PlotShowDocument) -> FixtureProfile? {
    if let profile = document.fixtureProfiles[profileId] { return profile }
    return PlotToolModules.seededFixtureProfiles.first { $0.id == profileId }
}

private func invalidRangeReason(universe: Int?, startAddress: Int?, endAddress: Int?) -> String {
    guard let universe, let startAddress, let endAddress else {
        return "DMX universe and address must be whole numbers."
    }
    if universe < 1 || startAddress < 1 {
        return "DMX universe and address must be positive."
    }
    if endAddress > PlotDmxOutput.slotCount {
        return "DMX range \(startAddress)-\(endAddress) exceeds slot \(PlotDmxOutput.slotCount)."
    }
    return "DMX range is invalid."
}

private func overlapErrors(_ ranges: [DmxFixtureRange]) -> [DmxOutputIssue] {
    let byUniverse = Dictionary(grouping: ranges.filter(\.valid), by: \.universe)
    var errors: [DmxOutputIssue] = []
    for (universe, universeRanges) in byUniverse {
        let sortedRanges = universeRanges.sorted {
            ($0.startAddress ?? 0, $0.fixture.id) < ($1.startAddress ?? 0, $1.fixture.id)
        }
        for index in sortedRanges.indices.dropFirst() {
            for previousIndex in sortedRanges.indices where previousIndex < index {
                let previous = sortedRanges[previousIndex]
                let current = sortedRanges[index]
                if (current.startAddress ?? 0) <= (previous.endAddress ?? 0) {
                    errors.append(DmxOutputIssue(
                        code: "overlap",
                        severity: "error",
                        fixtureId: current.fixture.id,
                        universe: universe,
                        message: "DMX U\(universe ?? 0) \(previous.startAddress ?? 0)-\(previous.endAddress ?? 0) overlaps \(current.startAddress ?? 0)-\(current.endAddress ?? 0)."
                    ))
                }
            }
        }
    }
    return errors
}

private func clamp(_ value: Int, min minValue: Int, max maxValue: Int) -> Int {
    max(minValue, min(maxValue, value))
}

private extension JSONValue {
    var objectValue: [String: JSONValue]? {
        if case .object(let value) = self { return value }
        return nil
    }

    var arrayValue: [JSONValue]? {
        if case .array(let value) = self { return value }
        return nil
    }

    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }

    var boolValue: Bool? {
        if case .bool(let value) = self { return value }
        return nil
    }

    var intValue: Int? {
        if case .number(let value) = self { return Int(value) }
        return nil
    }
}
