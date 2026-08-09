import XCTest

final class PlotForgeNativeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testDirtyNewCancelDiscardAndFailedOpenPreservation() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing-failed-open"]
        app.launch()

        XCTAssertTrue(app.descendants(matching: .any)["plotforge-start-screen"].waitForExistence(timeout: 8))
        app.buttons["start-new-plot"].tap()

        XCTAssertTrue(app.descendants(matching: .any)["plotforge-workspace"].waitForExistence(timeout: 5))
        addFixture(in: app)
        XCTAssertTrue(fixtureCount(in: app).label.contains("3"))

        app.buttons["workspace-new"].tap()
        XCTAssertTrue(app.buttons["dirty-cancel"].waitForExistence(timeout: 3))
        app.buttons["dirty-cancel"].tap()
        XCTAssertTrue(fixtureCount(in: app).label.contains("3"), "Cancel must preserve the dirty plot")

        app.buttons["workspace-new"].tap()
        XCTAssertTrue(app.buttons["dirty-discard"].waitForExistence(timeout: 3))
        app.buttons["dirty-discard"].tap()
        XCTAssertTrue(fixtureCount(in: app).label.contains("2"), "Discard must continue to a fresh starter plot")

        addFixture(in: app)
        XCTAssertTrue(fixtureCount(in: app).label.contains("3"))
        app.buttons["workspace-open"].tap()
        XCTAssertTrue(app.buttons["dirty-discard"].waitForExistence(timeout: 3))
        app.buttons["dirty-discard"].tap()

        XCTAssertTrue(app.alerts["Open failed"].waitForExistence(timeout: 5))
        app.alerts["Open failed"].buttons["OK"].tap()
        XCTAssertTrue(fixtureCount(in: app).label.contains("3"), "A failed open must preserve the current dirty plot")
    }

    private func addFixture(in app: XCUIApplication) {
        let fixturesTool = app.buttons["tool-fixtures"]
        XCTAssertTrue(fixturesTool.waitForExistence(timeout: 5))
        fixturesTool.tap()

        let addFixture = app.buttons["fixture-add-s4_26"]
        XCTAssertTrue(addFixture.waitForExistence(timeout: 5))
        addFixture.tap()
    }

    private func fixtureCount(in app: XCUIApplication) -> XCUIElement {
        let count = app.descendants(matching: .any)["fixture-count"]
        XCTAssertTrue(count.waitForExistence(timeout: 5))
        return count
    }
}
