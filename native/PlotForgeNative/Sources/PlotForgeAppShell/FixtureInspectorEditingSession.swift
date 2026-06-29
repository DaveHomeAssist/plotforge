import PlotForgeCore

struct FixtureInspectorEditingSession: Equatable {
    let fixture: Fixture
    let dmxFootprint: Int
    var draft: FixtureInspectorDraft
    var errors: [FixtureInspectorField: String]
    var lastCommittedPatch: FixtureInspectorPatch?

    init(fixture: Fixture, dmxFootprint: Int = 1) {
        self.fixture = fixture
        self.dmxFootprint = max(1, dmxFootprint)
        self.draft = PlotInspectorValidation.draft(from: fixture)
        self.errors = [:]
        self.lastCommittedPatch = nil
    }

    func value(for field: FixtureInspectorField) -> String {
        PlotInspectorValidation.value(for: field, in: draft)
    }

    mutating func setValue(_ value: String, for field: FixtureInspectorField) {
        lastCommittedPatch = nil
        draft = PlotInspectorValidation.updating(
            draft,
            field: field,
            value: value
        )
        errors = pending.errors
    }

    @discardableResult
    mutating func commitPending(
        revertingInvalidField field: FixtureInspectorField? = nil,
        onCommit: (_ patch: FixtureInspectorPatch) -> Void
    ) -> Bool {
        let current = pending
        errors = current.errors

        var didCommit = false
        if let patch = current.patch,
           patch != lastCommittedPatch {
            onCommit(patch)
            lastCommittedPatch = patch
            didCommit = true
        }

        if let field,
           current.errors[field] != nil {
            revertField(field)
        }

        return didCommit
    }

    mutating func revertField(_ field: FixtureInspectorField) {
        let committed = PlotInspectorValidation.draft(from: fixture)
        draft = PlotInspectorValidation.updating(
            draft,
            field: field,
            value: PlotInspectorValidation.value(for: field, in: committed)
        )
        errors.removeValue(forKey: field)
    }

    func nextField(after field: FixtureInspectorField) -> FixtureInspectorField? {
        guard let currentIndex = PlotInspectorValidation.fieldOrder.firstIndex(of: field) else {
            return nil
        }
        let nextIndex = PlotInspectorValidation.fieldOrder.index(after: currentIndex)
        guard PlotInspectorValidation.fieldOrder.indices.contains(nextIndex) else {
            return nil
        }
        return PlotInspectorValidation.fieldOrder[nextIndex]
    }

    func isNumericField(_ field: FixtureInspectorField?) -> Bool {
        guard let field else { return false }
        return field == .channel || field == .universe || field == .address
    }

    @discardableResult
    mutating func bumpNumericField(
        _ field: FixtureInspectorField,
        direction: Int,
        onCommit: (_ patch: FixtureInspectorPatch) -> Void
    ) -> Bool {
        guard isNumericField(field) else { return false }
        lastCommittedPatch = nil
        draft = PlotInspectorValidation.bumpedNumericField(
            field,
            direction: direction,
            dmxFootprint: dmxFootprint,
            draft: draft,
            committed: PlotInspectorValidation.draft(from: fixture)
        )
        return commitPending(onCommit: onCommit)
    }

    private var pending: FixtureInspectorPendingPatch {
        PlotInspectorValidation.buildPendingPatch(
            fixture: fixture,
            draft: draft,
            dmxFootprint: dmxFootprint
        )
    }
}
