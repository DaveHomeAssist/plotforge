import PlotForgeCore
import SwiftUI

struct FixtureProfileDetailView: View {
    let detail: FixtureProfileDetailSummary
    let insetPadding: CGFloat

    init(detail: FixtureProfileDetailSummary, insetPadding: CGFloat = 10) {
        self.detail = detail
        self.insetPadding = insetPadding
    }

    init(entry: FixtureProfileLibraryEntry, insetPadding: CGFloat = 10) {
        detail = PlotToolModules.fixtureProfileDetail(entry.profile, sourceLabel: entry.sourceLabel)
        self.insetPadding = insetPadding
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(detail.displayName)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Text(detail.sourceLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                if !detail.summary.isEmpty {
                    Text(detail.summary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }

            FixtureProfileDetailRows(rows: detail.rows)

            if !detail.bestFor.isEmpty {
                FixtureProfileDetailChipSection(title: "Best for", values: detail.bestFor)
            }

            if !detail.capabilities.isEmpty {
                FixtureProfileDetailChipSection(title: "Capabilities", values: detail.capabilities)
            }

            if !detail.modes.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Modes")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    ForEach(detail.modes) { mode in
                        HStack(alignment: .firstTextBaseline) {
                            Text(mode.name)
                                .font(.caption)
                                .lineLimit(1)
                            Spacer(minLength: 8)
                            Text(mode.footprintLabel)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }

            if !detail.notes.isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Notes")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    ForEach(detail.notes, id: \.self) { note in
                        Text(note)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                }
            }
        }
        .padding(insetPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct FixtureProfileDetailRows: View {
    let rows: [FixtureProfileDetailRow]

    var body: some View {
        VStack(spacing: 7) {
            ForEach(rows) { row in
                HStack(alignment: .firstTextBaseline) {
                    Text(row.label)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer(minLength: 8)
                    Text(row.value)
                        .font(.caption.weight(.medium))
                        .multilineTextAlignment(.trailing)
                        .lineLimit(2)
                }
            }
        }
    }
}

private struct FixtureProfileDetailChipSection: View {
    let title: String
    let values: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 82), spacing: 6)], alignment: .leading, spacing: 6) {
                ForEach(values, id: \.self) { value in
                    Text(value)
                        .font(.caption2.weight(.medium))
                        .lineLimit(2)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.quaternary)
                        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                }
            }
        }
    }
}
