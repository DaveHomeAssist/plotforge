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
