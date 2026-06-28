import Foundation

public enum JSONValue: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            self = .number(Double(value))
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported JSON value"
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .number(let value):
            if value.rounded() == value,
               value >= Double(Int.min),
               value <= Double(Int.max) {
                try container.encode(Int(value))
            } else {
                try container.encode(value)
            }
        case .bool(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

struct JSONCodingKey: CodingKey, Hashable {
    let stringValue: String
    let intValue: Int?

    init(_ stringValue: String) {
        self.stringValue = stringValue
        intValue = nil
    }

    init?(stringValue: String) {
        self.init(stringValue)
    }

    init?(intValue: Int) {
        stringValue = String(intValue)
        self.intValue = intValue
    }
}

enum JSONExtraFields {
    static func decode<K>(
        from decoder: Decoder,
        excluding codingKeys: K.Type
    ) throws -> [String: JSONValue] where K: CodingKey & CaseIterable {
        let knownKeys = Set(codingKeys.allCases.map(\.stringValue))
        let container = try decoder.container(keyedBy: JSONCodingKey.self)
        var extraFields: [String: JSONValue] = [:]

        for key in container.allKeys where !knownKeys.contains(key.stringValue) {
            extraFields[key.stringValue] = try container.decode(JSONValue.self, forKey: key)
        }

        return extraFields
    }

    static func encode<K>(
        _ extraFields: [String: JSONValue],
        to encoder: Encoder,
        excluding codingKeys: K.Type
    ) throws where K: CodingKey & CaseIterable {
        let knownKeys = Set(codingKeys.allCases.map(\.stringValue))
        var container = encoder.container(keyedBy: JSONCodingKey.self)

        for key in extraFields.keys.sorted() where !knownKeys.contains(key) {
            try container.encode(extraFields[key], forKey: JSONCodingKey(key))
        }
    }
}
