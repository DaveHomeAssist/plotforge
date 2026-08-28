@testable import PlotForgeAppShell
import XCTest

final class DmxOutputToolPanelTests: XCTestCase {
    func testSidebarIncludesNativeOutputTool() {
        XCTAssertTrue(PlotTool.allCases.contains(.output))
        XCTAssertEqual(PlotTool.output.rawValue, "Output")
        XCTAssertEqual(PlotTool.output.systemImage, "antenna.radiowaves.left.and.right")
    }

    func testDisarmRequiresBlackoutAfterNonzeroOutput() {
        var state = DmxOutputSafetyState()

        state.arm()
        XCTAssertFalse(state.requiresBlackoutBeforeDisarm)

        state.recordOutput(hasNonzeroValues: true)
        XCTAssertTrue(state.requiresBlackoutBeforeDisarm)

        state.recordBlackout()
        XCTAssertFalse(state.requiresBlackoutBeforeDisarm)

        state.completeDisarm()
        XCTAssertFalse(state.isArmed)
        XCTAssertFalse(state.hasActiveOutput)
    }

    func testZeroOnlyOutputDoesNotCreateAFalseBlackoutRequirement() {
        var state = DmxOutputSafetyState()
        state.arm()
        state.recordOutput(hasNonzeroValues: false)

        XCTAssertFalse(state.requiresBlackoutBeforeDisarm)
    }
}
