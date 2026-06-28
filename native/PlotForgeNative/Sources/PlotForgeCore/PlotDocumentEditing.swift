import Foundation

public struct PlotCanvasSelection: Equatable, Sendable {
    public var fixtureIds: [String]

    public init(fixtureIds: [String] = []) {
        self.fixtureIds = fixtureIds
    }

    public var primaryFixtureId: String? {
        fixtureIds.first
    }

    public var isEmpty: Bool {
        fixtureIds.isEmpty
    }

    public mutating func selectFixture(_ fixtureId: String, additive: Bool = false) {
        if additive {
            if fixtureIds.contains(fixtureId) {
                fixtureIds.removeAll { $0 == fixtureId }
            } else {
                fixtureIds.append(fixtureId)
            }
        } else {
            fixtureIds = [fixtureId]
        }
    }

    public mutating func selectAllFixtures(in orderedFixtureIds: [String]) {
        fixtureIds = orderedFixtureIds
    }

    public mutating func selectAdjacentFixture(
        in orderedFixtureIds: [String],
        direction: Int,
        extending: Bool = false
    ) {
        guard !orderedFixtureIds.isEmpty,
              direction != 0
        else {
            return
        }

        guard let primaryFixtureId,
              let currentIndex = orderedFixtureIds.firstIndex(of: primaryFixtureId)
        else {
            fixtureIds = [direction > 0 ? orderedFixtureIds[0] : orderedFixtureIds[orderedFixtureIds.count - 1]]
            return
        }

        let offset = direction > 0 ? 1 : -1
        let nextIndex = (currentIndex + offset + orderedFixtureIds.count) % orderedFixtureIds.count
        let nextFixtureId = orderedFixtureIds[nextIndex]

        if extending {
            selectFixture(nextFixtureId, additive: true)
        } else {
            fixtureIds = [nextFixtureId]
        }
    }

    public mutating func clear() {
        fixtureIds = []
    }

    public mutating func prune(toAvailable availableFixtureIds: Set<String>) {
        fixtureIds = fixtureIds.filter { availableFixtureIds.contains($0) }
    }
}

public struct PlotDocumentHistory: Equatable, Sendable {
    public private(set) var past: [PlotShowDocument]
    public private(set) var future: [PlotShowDocument]
    public var limit: Int

    public init(
        past: [PlotShowDocument] = [],
        future: [PlotShowDocument] = [],
        limit: Int = 80
    ) {
        self.past = past
        self.future = future
        self.limit = max(1, limit)
    }

    public var canUndo: Bool {
        !past.isEmpty
    }

    public var canRedo: Bool {
        !future.isEmpty
    }

    public mutating func record(previous: PlotShowDocument, next: PlotShowDocument) {
        guard previous != next else { return }
        past.append(previous)
        if past.count > limit {
            past.removeFirst(past.count - limit)
        }
        future = []
    }

    public mutating func undo(current: PlotShowDocument) -> PlotShowDocument? {
        guard let previous = past.popLast() else { return nil }
        future.append(current)
        return previous
    }

    public mutating func redo(current: PlotShowDocument) -> PlotShowDocument? {
        guard let next = future.popLast() else { return nil }
        past.append(current)
        if past.count > limit {
            past.removeFirst(past.count - limit)
        }
        return next
    }
}

public enum PlotDocumentEditing {
    public static let fixtureSnapMm = 25.4

    public static func snappedMillimeters(_ value: Double, snapMm: Double = fixtureSnapMm) -> Int {
        guard snapMm > 0 else { return Int(value.rounded()) }
        return ((value / snapMm).rounded() * snapMm).roundedToNearestInteger()
    }

    public static func clampedFixtureX(_ xMm: Int, on position: Position) -> Int {
        let halfLength = Double(position.lengthMm) / 2
        return min(max(Double(xMm), -halfLength), halfLength).roundedToNearestInteger()
    }

    public static func moveFixture(
        in document: PlotShowDocument,
        fixtureId: String,
        rawXMm: Double,
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        guard var fixture = document.fixtures[fixtureId],
              let position = document.positions[fixture.positionId]
        else {
            return document
        }

        let snappedX = snappedMillimeters(rawXMm)
        let clampedX = clampedFixtureX(snappedX, on: position)
        guard fixture.xMm != clampedX else { return document }

        fixture.xMm = clampedX
        var next = document
        next.updatedAt = updatedAt ?? currentTimestampMilliseconds()
        next.fixtures[fixtureId] = fixture
        return renumberPosition(in: next, positionId: fixture.positionId)
    }

    public static func nudgeFixture(
        in document: PlotShowDocument,
        fixtureId: String,
        steps: Int,
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        guard let fixture = document.fixtures[fixtureId],
              steps != 0
        else {
            return document
        }

        let rawX = Double(fixture.xMm) + Double(steps) * fixtureSnapMm
        return moveFixture(
            in: document,
            fixtureId: fixtureId,
            rawXMm: rawX,
            updatedAt: updatedAt
        )
    }

    public static func removeFixture(
        from document: PlotShowDocument,
        fixtureId: String,
        updatedAt: Int64? = nil
    ) -> PlotShowDocument {
        guard let fixture = document.fixtures[fixtureId] else { return document }

        var next = document
        next.updatedAt = updatedAt ?? currentTimestampMilliseconds()
        next.fixtures.removeValue(forKey: fixtureId)
        next.fixtureOrder.removeAll { $0 == fixtureId }
        return renumberPosition(in: next, positionId: fixture.positionId)
    }

    public static func renumberPosition(
        in document: PlotShowDocument,
        positionId: String
    ) -> PlotShowDocument {
        let orderIndex = Dictionary(uniqueKeysWithValues: document.fixtureOrder.enumerated().map { ($0.element, $0.offset) })
        let fixturesOnPosition = document.fixtureOrder
            .compactMap { document.fixtures[$0] }
            .filter { $0.positionId == positionId }
            .sorted {
                if $0.xMm != $1.xMm {
                    return $0.xMm < $1.xMm
                }
                return (orderIndex[$0.id] ?? 0) < (orderIndex[$1.id] ?? 0)
            }

        guard !fixturesOnPosition.isEmpty else { return document }

        var next = document
        for (index, fixture) in fixturesOnPosition.enumerated() {
            let unitNumber = index + 1
            if var updatedFixture = next.fixtures[fixture.id],
               updatedFixture.unitNumber != unitNumber {
                updatedFixture.unitNumber = unitNumber
                next.fixtures[fixture.id] = updatedFixture
            }
        }
        return next
    }

    private static func currentTimestampMilliseconds() -> Int64 {
        Int64(Date().timeIntervalSince1970 * 1000)
    }
}

private extension Double {
    func roundedToNearestInteger() -> Int {
        Int(rounded())
    }
}
