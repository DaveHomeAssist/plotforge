@testable import PlotForgeAppShell
import XCTest

final class DmxOutputToolPanelTests: XCTestCase {
    func testSidebarIncludesNativeOutputTool() {
        XCTAssertTrue(PlotTool.allCases.contains(.output))
        XCTAssertEqual(PlotTool.output.rawValue, "Output")
        XCTAssertEqual(PlotTool.output.systemImage, "antenna.radiowaves.left.and.right")
    }
}
