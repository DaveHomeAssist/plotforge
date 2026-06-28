// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "PlotForgeNative",
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
    ],
    products: [
        .library(
            name: "PlotForgeCore",
            targets: ["PlotForgeCore"]
        ),
        .library(
            name: "PlotForgeDocumentUI",
            targets: ["PlotForgeDocumentUI"]
        ),
        .library(
            name: "PlotForgeAppShell",
            targets: ["PlotForgeAppShell"]
        ),
        .executable(
            name: "PlotForgeNative",
            targets: ["PlotForgeApp"]
        ),
        .executable(
            name: "PlotForgeExportSmoke",
            targets: ["PlotForgeExportSmoke"]
        ),
    ],
    targets: [
        .target(
            name: "PlotForgeCore"
        ),
        .target(
            name: "PlotForgeDocumentUI",
            dependencies: ["PlotForgeCore"]
        ),
        .target(
            name: "PlotForgeAppShell",
            dependencies: [
                "PlotForgeCore",
                "PlotForgeDocumentUI",
            ]
        ),
        .executableTarget(
            name: "PlotForgeApp",
            dependencies: [
                "PlotForgeAppShell",
                "PlotForgeDocumentUI",
            ]
        ),
        .executableTarget(
            name: "PlotForgeExportSmoke",
            dependencies: ["PlotForgeCore"]
        ),
        .testTarget(
            name: "PlotForgeCoreTests",
            dependencies: ["PlotForgeCore"],
            resources: [
                .copy("Fixtures")
            ]
        ),
        .testTarget(
            name: "PlotForgeDocumentUITests",
            dependencies: [
                "PlotForgeCore",
                "PlotForgeDocumentUI",
            ]
        ),
        .testTarget(
            name: "PlotForgeAppShellTests",
            dependencies: [
                "PlotForgeAppShell",
                "PlotForgeCore",
            ]
        ),
    ]
)
