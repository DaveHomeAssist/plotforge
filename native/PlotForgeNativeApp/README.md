# PlotForge Native App

Runnable Xcode app container for the native SwiftUI PlotForge shell.

## Run

```bash
open native/PlotForgeNativeApp/PlotForgeNative.xcodeproj
```

In Xcode, choose the `PlotForgeNative` scheme and run on an iPad simulator or `My Mac (Mac Catalyst)`.

The iPadOS and Mac Catalyst app target launches to a PlotForge start screen, not the system document browser. Use New Plot to enter the canvas or Open .plot to explicitly show Files; the underlying New/Open/Edit/Save session state is covered by AppShell tests.

## Package Wiring

The app target links the local Swift package at `../PlotForgeNative` and uses:

- `PlotForgeAppShell`
- `PlotForgeDocumentUI`

The Swift package still owns the shared document model, `FileDocument`, app-owned launch workspace, native canvas, inspector validation shell, and tested editing logic.
