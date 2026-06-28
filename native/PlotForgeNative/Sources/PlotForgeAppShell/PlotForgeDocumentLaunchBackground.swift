import SwiftUI

public struct PlotForgeDocumentLaunchBackground: View {
    public init() {}

    public var body: some View {
        ZStack {
            Color(uiToken: .surface)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("PlotForge")
                        .font(.largeTitle.weight(.bold))
                    Text("Create or open a lighting plot to enter the workspace.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                HStack(alignment: .top, spacing: 12) {
                    LaunchPreviewCard(
                        title: "Draft",
                        symbol: "pencil.and.ruler",
                        detail: "Start a clean plot document."
                    )
                    LaunchPreviewCard(
                        title: "Open",
                        symbol: "folder",
                        detail: "Load an existing .plot file."
                    )
                    LaunchPreviewCard(
                        title: "Work",
                        symbol: "rectangle.split.3x1",
                        detail: "Use tools, canvas, and inspector together."
                    )
                }
                .frame(maxWidth: 720)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .padding(44)
        }
    }
}

private struct LaunchPreviewCard: View {
    let title: String
    let symbol: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: symbol)
                .font(.title2.weight(.semibold))
                .foregroundStyle(.primary)

            Text(title)
                .font(.headline)

            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color(uiToken: .panel))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .stroke(Color(uiToken: .control), lineWidth: 1)
        }
    }
}
