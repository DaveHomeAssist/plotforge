import Foundation
import PlotForgeCore
import SwiftUI
import UniformTypeIdentifiers

public extension UTType {
    static let plotForgeDocument = UTType(
        exportedAs: "com.davehomeassist.plotforge.plot",
        conformingTo: .json
    )
}

public struct PlotForgeFileDocument: FileDocument, Equatable {
    public static var readableContentTypes: [UTType] {
        [.plotForgeDocument, .json]
    }

    public static var writableContentTypes: [UTType] {
        [.plotForgeDocument]
    }

    public var show: PlotShowDocument

    public init(show: PlotShowDocument = PlotShowDocument.starterDocument()) {
        self.show = show
    }

    public init(data: Data) throws {
        show = try PlotDocumentCodec.decode(data)
    }

    public init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        try self.init(data: data)
    }

    public func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        return FileWrapper(regularFileWithContents: try fileData())
    }

    public func fileData() throws -> Data {
        try PlotDocumentCodec.encode(show)
    }
}
