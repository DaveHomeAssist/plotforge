# PlotForge Native

Native SwiftUI package for the PlotForge port.

## Scope

- macOS and iPadOS package target.
- SwiftUI app shell, no WebView wrapper.
- Codable `.plot` document model for current PlotForge schema version 9.
- DMX universe and address values preserve blank patch fields instead of defaulting missing values.
- `FileDocument` open and save for `.plot` JSON files.
- Interactive native canvas foundation with pan, zoom, fit/reset, fixture selection, fixture order navigation, select all, additive tap selection, fixture drag, nudge, delete, and undo/redo support.
- Inspector validation core, tested edit session, and editable SwiftUI rail for fixture drafts, field validation, valid sibling patch isolation, DMX dependency handling, status normalization, patch application, selection state routing, batch safe multi selection edits, and history backed fixture edits.
- Native tool module core for fixture library seeds, imported profile search, patch rows, conflict checks, label summaries, and Wizard starter plan/apply behavior.
- Native tool panel views for fixture library search and add, patch rows, checks, label toggles and variable text sizes, Wizard brief preview and apply, and report readiness.
- Native export core and Reports panel file exporter buttons for PDF, patch CSV, gel CSV, circuit CSV, fixture paperwork CSV, OSC bridge JSON, and interop manifest JSON.
- iPadOS and Mac Catalyst app-owned PlotForge start screen with New Plot and Open .plot actions, plus tested New, Open, Edit, and Save state handling so the runnable app does not start trapped inside the system document browser.
- Unit tests for Codable load and save, document editing, canvas metrics, inspector validation, native tool modules, export contracts, and export file wrapper smoke.
- MVR import is not implemented in this shell.

## Run

```bash
cd native/PlotForgeNative
swift test
swift build
open Package.swift
```

For Cmd-R in Xcode, open the real app project:

```bash
open ../PlotForgeNativeApp/PlotForgeNative.xcodeproj
```

Choose the `PlotForgeNative` scheme and run on an iPad simulator or `My Mac (Mac Catalyst)`.

## Layout

```text
Sources/PlotForgeCore
  PlotDocument.swift
  PlotDocumentCodec.swift
  PlotNativeExports.swift
  PlotToolModules.swift

Sources/PlotForgeDocumentUI
  PlotForgeFileDocument.swift

Sources/PlotForgeAppShell
  PlotForgeStandaloneDocumentSession.swift
  PlotForgeStandaloneWorkspaceView.swift
  PlotForgeShellView.swift
  ToolModulePanels.swift

Sources/PlotForgeApp
  PlotForgeNativeApp.swift
```
