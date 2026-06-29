import CoreGraphics
import SwiftUI
@testable import PlotForgeAppShell
import XCTest

final class FixtureGlyphTests: XCTestCase {
    func testSymbolStringsMapToGlyphFamilies() {
        XCTAssertEqual(FixtureGlyphKind(symbol: "ellipsoidal"), .ellipsoidal)
        XCTAssertEqual(FixtureGlyphKind(symbol: "ERS"), .ellipsoidal)
        XCTAssertEqual(FixtureGlyphKind(symbol: "par"), .par)
        XCTAssertEqual(FixtureGlyphKind(symbol: "fresnel"), .fresnel)
        XCTAssertEqual(FixtureGlyphKind(symbol: "spot"), .movingHead)
        XCTAssertEqual(FixtureGlyphKind(symbol: "moving"), .movingHead)
        XCTAssertEqual(FixtureGlyphKind(symbol: "strip"), .strip)
        XCTAssertEqual(FixtureGlyphKind(symbol: "bar"), .strip)
        XCTAssertEqual(FixtureGlyphKind(symbol: "followspot"), .followspot)
        XCTAssertEqual(FixtureGlyphKind(symbol: "blinder"), .blinder)
        XCTAssertEqual(FixtureGlyphKind(symbol: "scoop"), .scoop)
    }

    func testUnknownSymbolFallsBackToGeneric() {
        XCTAssertEqual(FixtureGlyphKind(symbol: ""), .generic)
        XCTAssertEqual(FixtureGlyphKind(symbol: "definitely-not-a-fixture"), .generic)
    }

    func testEveryFamilyDrawsANonEmptyBody() {
        let families: [FixtureGlyphKind] = [
            .ellipsoidal, .par, .fresnel, .movingHead,
            .strip, .followspot, .blinder, .scoop, .generic,
        ]
        for kind in families {
            let paths = FixtureGlyph.paths(for: kind, radius: 10)
            XCTAssertFalse(paths.body.isEmpty, "\(kind) should draw a body silhouette")
        }
    }

    func testDistinctFamiliesProduceDistinctSilhouettes() {
        // A regression guard against the old behaviour where every fixture
        // rendered as the same circle: bounding boxes must differ by family.
        let par = FixtureGlyph.paths(for: .par, radius: 10).body.boundingRect
        let strip = FixtureGlyph.paths(for: .strip, radius: 10).body.boundingRect
        let fresnel = FixtureGlyph.paths(for: .fresnel, radius: 10).body.boundingRect
        let ers = FixtureGlyph.paths(for: .ellipsoidal, radius: 10).body.boundingRect

        XCTAssertNotEqual(par, strip)
        XCTAssertNotEqual(par, fresnel)
        XCTAssertNotEqual(par, ers)
        // The striplight is wider than it is tall; the PAR is square.
        XCTAssertGreaterThan(strip.width, strip.height)
        XCTAssertEqual(par.width, par.height, accuracy: 0.001)
    }

    func testRadiusScalesGeometry() {
        let small = FixtureGlyph.paths(for: .par, radius: 5).body.boundingRect
        let large = FixtureGlyph.paths(for: .par, radius: 20).body.boundingRect
        XCTAssertGreaterThan(large.width, small.width)
    }
}
