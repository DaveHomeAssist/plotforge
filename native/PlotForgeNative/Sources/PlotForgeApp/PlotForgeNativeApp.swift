import PlotForgeAppShell
import PlotForgeDocumentUI
import SwiftUI

@main
struct PlotForgeNativeApp: App {
    @SceneBuilder
    var body: some Scene {
        #if os(iOS)
        WindowGroup {
            PlotForgeStandaloneWorkspaceView()
        }
        #else
        DocumentGroup(newDocument: PlotForgeFileDocument()) { file in
            PlotForgeShellView(document: file.$document)
        }
        #endif
    }
}
