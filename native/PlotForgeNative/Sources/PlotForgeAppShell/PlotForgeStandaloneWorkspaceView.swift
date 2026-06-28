import Foundation
import PlotForgeCore
import PlotForgeDocumentUI
import SwiftUI

public struct PlotForgeStandaloneWorkspaceView: View {
    @State private var session: PlotForgeStandaloneDocumentSession
    @State private var screen: PlotForgeStandaloneScreen = .start
    @State private var isImporterPresented = false
    @State private var isExporterPresented = false
    @State private var alert: PlotForgeWorkspaceAlert?

    public init(document: PlotForgeFileDocument = PlotForgeFileDocument()) {
        _session = State(initialValue: PlotForgeStandaloneDocumentSession(document: document))
    }

    public var body: some View {
        Group {
            switch screen {
            case .start:
                PlotForgeStartScreen(
                    onNew: startNewDocument,
                    onOpen: { isImporterPresented = true }
                )
            case .workspace:
                workspace
            }
        }
            .fileImporter(
                isPresented: $isImporterPresented,
                allowedContentTypes: PlotForgeFileDocument.readableContentTypes,
                allowsMultipleSelection: false,
                onCompletion: handleImport
            )
            .fileExporter(
                isPresented: $isExporterPresented,
                document: session.document,
                contentType: .plotForgeDocument,
                defaultFilename: session.exportFilename,
                onCompletion: handleExport
            )
            .onOpenURL { url in
                openDocument(at: url)
            }
            .alert(item: $alert) { alert in
                Alert(
                    title: Text(alert.title),
                    message: Text(alert.message),
                    dismissButton: .default(Text("OK"))
                )
            }
    }

    private var workspace: some View {
        PlotForgeShellView(document: documentBinding)
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        startNewDocument()
                    } label: {
                        Label("New", systemImage: "doc.badge.plus")
                    }

                    Button {
                        isImporterPresented = true
                    } label: {
                        Label("Open", systemImage: "folder")
                    }

                    Button {
                        isExporterPresented = true
                    } label: {
                        Label("Save", systemImage: "square.and.arrow.down")
                    }
                }

                ToolbarItem(placement: .status) {
                    Text(session.fileStatus)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
    }

    private var documentBinding: Binding<PlotForgeFileDocument> {
        Binding {
            session.document
        } set: { nextDocument in
            session.updateDocument(nextDocument)
        }
    }

    private func startNewDocument() {
        session.newDocument()
        screen = .workspace
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else {
                return
            }
            openDocument(at: url)
        case .failure(let error):
            presentFileError("Open failed", error)
        }
    }

    private func handleExport(_ result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            session.noteSaved(filename: url.lastPathComponent)
        case .failure(let error):
            presentFileError("Save failed", error)
        }
    }

    private func openDocument(at url: URL) {
        do {
            try session.openDocument(data: readFileData(at: url), filename: url.lastPathComponent)
            screen = .workspace
        } catch {
            presentFileError("Open failed", error)
        }
    }

    private func readFileData(at url: URL) throws -> Data {
        let isScoped = url.startAccessingSecurityScopedResource()
        defer {
            if isScoped {
                url.stopAccessingSecurityScopedResource()
            }
        }
        return try Data(contentsOf: url)
    }

    private func presentFileError(_ title: String, _ error: Error) {
        alert = PlotForgeWorkspaceAlert(title: title, message: error.localizedDescription)
    }
}

private enum PlotForgeStandaloneScreen {
    case start
    case workspace
}

private struct PlotForgeStartScreen: View {
    let onNew: () -> Void
    let onOpen: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.94, green: 0.96, blue: 0.96),
                    Color(red: 0.86, green: 0.91, blue: 0.91),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("PlotForge")
                        .font(.system(size: 56, weight: .bold, design: .rounded))
                    Text("Native lighting plot workspace")
                        .font(.title3.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 14) {
                    Button(action: onNew) {
                        LaunchActionContent(
                            title: "New Plot",
                            detail: "Start in the canvas",
                            symbol: "doc.badge.plus"
                        )
                    }
                    .buttonStyle(LaunchActionButtonStyle(prominent: true))

                    Button(action: onOpen) {
                        LaunchActionContent(
                            title: "Open .plot",
                            detail: "Choose a file",
                            symbol: "folder"
                        )
                    }
                    .buttonStyle(LaunchActionButtonStyle(prominent: false))
                }

                HStack(spacing: 12) {
                    LaunchSignal(title: "Canvas", symbol: "rectangle.dashed")
                    LaunchSignal(title: "Inspector", symbol: "sidebar.right")
                    LaunchSignal(title: "Exports", symbol: "square.and.arrow.down")
                }
            }
            .frame(maxWidth: 760, alignment: .leading)
            .padding(48)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }
}

private struct LaunchActionContent: View {
    let title: String
    let detail: String
    let symbol: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.title2.weight(.semibold))
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct LaunchActionButtonStyle: ButtonStyle {
    let prominent: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(16)
            .frame(width: 210)
            .background(prominent ? Color.black : Color.white.opacity(0.82))
            .foregroundStyle(prominent ? Color.white : Color.primary)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Color.black.opacity(prominent ? 0 : 0.12), lineWidth: 1)
            }
            .opacity(configuration.isPressed ? 0.78 : 1)
    }
}

private struct LaunchSignal: View {
    let title: String
    let symbol: String

    var body: some View {
        Label(title, systemImage: symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.58))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct PlotForgeWorkspaceAlert: Identifiable {
    let id = UUID()
    let title: String
    let message: String
}
