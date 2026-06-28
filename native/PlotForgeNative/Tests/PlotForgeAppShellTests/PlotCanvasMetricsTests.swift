import CoreGraphics
@testable import PlotForgeAppShell
import PlotForgeCore
import XCTest

final class PlotCanvasMetricsTests: XCTestCase {
    func testViewportZoomClampsAndResetRestoresFitView() {
        var viewport = PlotCanvasViewport()

        viewport.setZoom(20)
        XCTAssertEqual(viewport.zoom, 8)

        viewport.setZoom(0.01)
        XCTAssertEqual(viewport.zoom, 0.25)

        viewport.offset = CGSize(width: 40, height: -25)
        viewport.reset()

        XCTAssertEqual(viewport.zoom, 1)
        XCTAssertEqual(viewport.offset, .zero)
    }

    func testMetricsMapAndWorldXRespectPanAndZoom() {
        let document = PlotShowDocument(
            venue: Venue(stageWidthMm: 1_000, stageDepthMm: 500, proscWidthMm: 800)
        )
        let viewport = PlotCanvasViewport(
            zoom: 2,
            offset: CGSize(width: 50, height: -25)
        )
        let metrics = PlotCanvasMetrics(
            document: document,
            size: CGSize(width: 1_200, height: 800),
            viewport: viewport
        )

        let center = metrics.map(xMm: 0, yMm: 0)
        let right = metrics.map(xMm: 100, yMm: 0)
        let plotted = metrics.map(xMm: 127, yMm: 80)

        XCTAssertEqual(center.x, 650, accuracy: 0.001)
        XCTAssertEqual(right.x - center.x, 214.4, accuracy: 0.001)
        XCTAssertEqual(metrics.worldX(from: plotted), 127, accuracy: 0.001)
    }
}
