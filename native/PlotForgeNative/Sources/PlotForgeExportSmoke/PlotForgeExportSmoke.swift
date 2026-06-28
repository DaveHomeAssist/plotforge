import Foundation
import PlotForgeCore

@main
struct PlotForgeExportSmoke {
    static func main() throws {
        let options = try ExportSmokeOptions(arguments: CommandLine.arguments)
        let document = try loadDocument(from: options.inputPath)
        let outputURL = URL(fileURLWithPath: options.outputPath, isDirectory: true)
        try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

        let artifacts = try PlotNativeExports.smokeExportArtifacts(
            document,
            generatedAt: options.generatedAt
        )

        for artifact in artifacts {
            let url = outputURL.appendingPathComponent(artifact.filename)
            try artifact.data.write(to: url, options: [.atomic])
            print("\(artifact.label): \(url.path)")
        }
    }

    private static func loadDocument(from inputPath: String?) throws -> PlotShowDocument {
        guard let inputPath else {
            return PlotShowDocument.starterDocument(timestamp: 1_782_345_600_000)
        }
        let data = try Data(contentsOf: URL(fileURLWithPath: inputPath))
        return try PlotDocumentCodec.decode(data)
    }
}

struct ExportSmokeOptions {
    var inputPath: String?
    var outputPath: String
    var generatedAt: String

    init(arguments: [String]) throws {
        var inputPath: String?
        var outputPath = "/private/tmp/plotforge-native-export-smoke"
        var generatedAt = "2026-06-26T00:00:00Z"

        var index = 1
        while index < arguments.count {
            let argument = arguments[index]
            switch argument {
            case "--input":
                inputPath = try Self.value(after: argument, in: arguments, index: &index)
            case "--output":
                outputPath = try Self.value(after: argument, in: arguments, index: &index)
            case "--generated-at":
                generatedAt = try Self.value(after: argument, in: arguments, index: &index)
            case "--help", "-h":
                throw ExportSmokeError.help
            default:
                throw ExportSmokeError.unknownArgument(argument)
            }
            index += 1
        }

        self.inputPath = inputPath
        self.outputPath = outputPath
        self.generatedAt = generatedAt
    }

    private static func value(after option: String, in arguments: [String], index: inout Int) throws -> String {
        let valueIndex = index + 1
        guard valueIndex < arguments.count else {
            throw ExportSmokeError.missingValue(option)
        }
        index = valueIndex
        return arguments[valueIndex]
    }
}

enum ExportSmokeError: Error, CustomStringConvertible {
    case help
    case missingValue(String)
    case unknownArgument(String)

    var description: String {
        switch self {
        case .help:
            return "Usage: PlotForgeExportSmoke [--input path/to/show.plot] [--output /path/to/evidence] [--generated-at ISO8601]"
        case .missingValue(let option):
            return "Missing value for \(option)"
        case .unknownArgument(let argument):
            return "Unknown argument: \(argument)"
        }
    }
}
