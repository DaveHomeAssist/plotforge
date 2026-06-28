import Foundation

public enum PlotDocumentCodec {
    public static let mimeType = "application/x-plotforge+json"
    public static let fileExtension = "plot"

    public static func decode(_ data: Data) throws -> PlotShowDocument {
        let decoder = JSONDecoder()
        return try decoder.decode(PlotShowDocument.self, from: data)
    }

    public static func decode(_ text: String) throws -> PlotShowDocument {
        guard let data = text.data(using: .utf8) else {
            throw PlotDocumentCodecError.invalidUTF8
        }
        return try decode(data)
    }

    public static func encode(_ document: PlotShowDocument) throws -> Data {
        var document = document
        document.version = plotDocumentVersion

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(document)
    }

    public static func encodeString(_ document: PlotShowDocument) throws -> String {
        let data = try encode(document)
        guard let text = String(data: data, encoding: .utf8) else {
            throw PlotDocumentCodecError.invalidUTF8
        }
        return text
    }
}

public enum PlotDocumentCodecError: Error, Equatable {
    case invalidUTF8
}
