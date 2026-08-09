import Foundation
import PlotForgeCore
import PlotForgeDocumentUI

struct PlotForgeStandaloneDocumentSession: Equatable {
    private(set) var document: PlotForgeFileDocument
    private(set) var fileState: PlotForgeWorkspaceFileState

    init(
        document: PlotForgeFileDocument = PlotForgeFileDocument(),
        fileState: PlotForgeWorkspaceFileState = .new
    ) {
        self.document = document
        self.fileState = fileState
    }

    var fileStatus: String {
        fileState.message
    }

    var hasUnsavedChanges: Bool {
        if case .edited = fileState { return true }
        return false
    }

    var exportFilename: String {
        PlotNativeExports.plotDocumentFilename(for: document.show)
    }

    mutating func updateDocument(_ nextDocument: PlotForgeFileDocument) {
        guard nextDocument != document else { return }
        document = nextDocument
        fileState = fileState.editedState
    }

    mutating func newDocument() {
        document = PlotForgeFileDocument()
        fileState = .new
    }

    mutating func openDocument(data: Data, filename: String) throws {
        document = try PlotForgeFileDocument(data: data)
        fileState = .opened(filename: filename)
    }

    mutating func noteSaved(filename: String) {
        fileState = .saved(filename: filename)
    }

    func exportData() throws -> Data {
        try document.fileData()
    }
}

enum PlotForgePendingDocumentAction: Equatable {
    case newDocument
    case openDocument
}

enum PlotForgeDirtyDocumentChoice: Equatable {
    case save
    case discard
    case cancel
}

enum PlotForgeDocumentTransitionEffect: Equatable {
    case none
    case confirmDiscard
    case requestSave
    case proceed(PlotForgePendingDocumentAction)
}

struct PlotForgeDirtyDocumentTransitionCoordinator: Equatable {
    private(set) var pendingAction: PlotForgePendingDocumentAction?

    mutating func request(
        _ action: PlotForgePendingDocumentAction,
        hasUnsavedChanges: Bool
    ) -> PlotForgeDocumentTransitionEffect {
        guard hasUnsavedChanges else { return .proceed(action) }
        pendingAction = action
        return .confirmDiscard
    }

    mutating func resolve(_ choice: PlotForgeDirtyDocumentChoice) -> PlotForgeDocumentTransitionEffect {
        guard let pendingAction else { return .none }
        switch choice {
        case .save:
            return .requestSave
        case .discard:
            self.pendingAction = nil
            return .proceed(pendingAction)
        case .cancel:
            self.pendingAction = nil
            return .none
        }
    }

    mutating func finishSave(succeeded: Bool) -> PlotForgeDocumentTransitionEffect {
        guard let pendingAction else { return .none }
        self.pendingAction = nil
        return succeeded ? .proceed(pendingAction) : .none
    }
}

enum PlotForgeWorkspaceFileState: Equatable {
    case new
    case opened(filename: String)
    case edited(filename: String?)
    case saved(filename: String)

    var message: String {
        switch self {
        case .new:
            "New plot"
        case .opened(let filename):
            "Opened \(filename)"
        case .edited(let filename):
            if let filename {
                "Unsaved changes to \(filename)"
            } else {
                "Unsaved new plot"
            }
        case .saved(let filename):
            "Saved \(filename)"
        }
    }

    var editedState: PlotForgeWorkspaceFileState {
        switch self {
        case .new:
            .edited(filename: nil)
        case .opened(let filename), .saved(let filename):
            .edited(filename: filename)
        case .edited:
            self
        }
    }
}
