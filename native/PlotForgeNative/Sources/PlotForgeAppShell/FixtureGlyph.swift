import SwiftUI

/// Schematic 2D fixture glyphs approximating USITT lighting-symbol conventions.
///
/// Each glyph is drawn in local points centred on the hanging point (a fixture's
/// canvas origin), with the luminaire *front*/lens pointing toward -y (downstage,
/// toward the audience) before the instance rotation is applied. Geometry is
/// parameterised by a single `radius`, so a profile's real-world `radiusMm`
/// drives the on-plot size.
///
/// This keeps the model forward-compatible with GDTF/MVR and a future 3D view:
/// the *symbol* is a reusable definition keyed off `FixtureProfile.symbol`, while
/// placement and rotation stay on the placed instance. Swapping in GDTF-imported
/// SVG/3D later is additive — no instance or patch data has to change.
enum FixtureGlyphKind: Equatable {
    case ellipsoidal
    case par
    case fresnel
    case movingHead
    case strip
    case followspot
    case blinder
    case scoop
    case generic

    /// Maps a profile `symbol` string (and common synonyms) to a glyph family.
    init(symbol: String) {
        switch symbol.lowercased() {
        case "ellipsoidal", "ers", "leko", "profile", "profile-spot":
            self = .ellipsoidal
        case "par", "parcan", "par-can", "led-par":
            self = .par
        case "fresnel":
            self = .fresnel
        case "spot", "moving", "moving-spot", "moving-head", "wash", "moving-wash", "beam":
            self = .movingHead
        case "strip", "bar", "striplight", "cyc", "batten", "border":
            self = .strip
        case "followspot", "follow-spot", "follow":
            self = .followspot
        case "blinder", "audience-blinder":
            self = .blinder
        case "scoop", "flood", "floodlight":
            self = .scoop
        default:
            self = .generic
        }
    }
}

/// The paths that compose one glyph, split so the renderer can give the
/// luminaire *front* a heavier line (USITT convention) and fill solid marks.
struct FixtureGlyphPaths {
    var body = Path()    // primary silhouette: light fill + normal stroke
    var detail = Path()  // secondary thin lines (yoke arms, cell dividers, tails)
    var front = Path()   // the lens / front edge — drawn with a heavier line
    var solid = Path()   // filled marks (moving-head centre dot, beam axis)
}

enum FixtureGlyph {
    /// Builds the glyph paths for `kind` at the given on-screen `radius` (points).
    static func paths(for kind: FixtureGlyphKind, radius r: CGFloat) -> FixtureGlyphPaths {
        switch kind {
        case .ellipsoidal: return ellipsoidal(r: r, scale: 1.0)
        case .followspot:  return ellipsoidal(r: r, scale: 1.35)
        case .par:         return par(r: r)
        case .fresnel:     return fresnel(r: r)
        case .movingHead:  return movingHead(r: r)
        case .strip:       return strip(r: r)
        case .blinder:     return blinder(r: r)
        case .scoop:       return scoop(r: r)
        case .generic:     return generic(r: r)
        }
    }

    /// A readable stroke colour per symbol family (the canvas sits on a light
    /// surface). Mirrors the convention that colour tracks the symbol family.
    static func defaultColor(for kind: FixtureGlyphKind) -> Color {
        switch kind {
        case .ellipsoidal, .followspot:
            return Color(red: 0.74, green: 0.46, blue: 0.0)   // amber
        case .fresnel:
            return Color(red: 0.80, green: 0.36, blue: 0.0)   // burnt orange
        case .par:
            return Color(red: 0.09, green: 0.53, blue: 0.36)  // green
        case .movingHead:
            return Color(red: 0.03, green: 0.45, blue: 0.72)  // blue
        case .strip, .blinder:
            return Color(red: 0.52, green: 0.28, blue: 0.62)  // violet
        case .scoop:
            return Color(red: 0.46, green: 0.42, blue: 0.10)  // olive
        case .generic:
            return Color(red: 0.34, green: 0.39, blue: 0.45)  // slate
        }
    }

    // ERS "keyhole": reflector can at the back + lens barrel toward the front.
    private static func ellipsoidal(r: CGFloat, scale: CGFloat) -> FixtureGlyphPaths {
        let s = r * scale
        var p = FixtureGlyphPaths()
        p.body.addRoundedRect(
            in: CGRect(x: -0.42 * s, y: -1.5 * s, width: 0.84 * s, height: 1.8 * s),
            cornerSize: CGSize(width: 0.12 * s, height: 0.12 * s)
        )
        p.body.addEllipse(in: CGRect(x: -0.9 * s, y: -0.1 * s, width: 1.8 * s, height: 1.4 * s))
        p.front.move(to: CGPoint(x: -0.42 * s, y: -1.5 * s))
        p.front.addLine(to: CGPoint(x: 0.42 * s, y: -1.5 * s))
        return p
    }

    // PAR can: circle + rear tail + double-headed beam-axis arrow across the lens.
    private static func par(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        p.body.addEllipse(in: CGRect(x: -r, y: -r, width: 2 * r, height: 2 * r))
        p.detail.move(to: CGPoint(x: 0, y: r))
        p.detail.addLine(to: CGPoint(x: 0, y: 1.35 * r))
        let ax = 0.62 * r
        let h = 0.22 * r
        p.front.move(to: CGPoint(x: -ax, y: 0))
        p.front.addLine(to: CGPoint(x: ax, y: 0))
        p.front.move(to: CGPoint(x: -ax + h, y: -h))
        p.front.addLine(to: CGPoint(x: -ax, y: 0))
        p.front.addLine(to: CGPoint(x: -ax + h, y: h))
        p.front.move(to: CGPoint(x: ax - h, y: -h))
        p.front.addLine(to: CGPoint(x: ax, y: 0))
        p.front.addLine(to: CGPoint(x: ax - h, y: h))
        return p
    }

    // Fresnel: funnel/trapezoid body with a sawtooth (stepped-lens) front line.
    private static func fresnel(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        let frontY = -0.95 * r
        let backY = 0.85 * r
        p.body.move(to: CGPoint(x: -1.0 * r, y: frontY))
        p.body.addLine(to: CGPoint(x: 1.0 * r, y: frontY))
        p.body.addLine(to: CGPoint(x: 0.55 * r, y: backY))
        p.body.addLine(to: CGPoint(x: -0.55 * r, y: backY))
        p.body.closeSubpath()
        let teeth = 4
        let step = 2.0 * r / CGFloat(teeth)
        let toothH = 0.22 * r
        p.front.move(to: CGPoint(x: -1.0 * r, y: frontY))
        for i in 0..<teeth {
            let x0 = -1.0 * r + CGFloat(i) * step
            p.front.addLine(to: CGPoint(x: x0 + step * 0.5, y: frontY + toothH))
            p.front.addLine(to: CGPoint(x: x0 + step, y: frontY))
        }
        return p
    }

    // Moving head: head circle held in a squared U-yoke; centre dot marks the head.
    private static func movingHead(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        let head = 0.78 * r
        p.body.addEllipse(in: CGRect(x: -head, y: -head, width: 2 * head, height: 2 * head))
        let arm = 1.12 * r
        p.detail.move(to: CGPoint(x: -arm, y: -head))
        p.detail.addLine(to: CGPoint(x: -arm, y: 0.55 * r))
        p.detail.addLine(to: CGPoint(x: arm, y: 0.55 * r))
        p.detail.addLine(to: CGPoint(x: arm, y: -head))
        p.solid.addEllipse(in: CGRect(x: -0.18 * r, y: -0.18 * r, width: 0.36 * r, height: 0.36 * r))
        return p
    }

    // Striplight / cyc batten: long segmented rectangle (cells lettered on plot).
    private static func strip(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        let halfW = 1.6 * r
        let halfH = 0.42 * r
        p.body.addRect(CGRect(x: -halfW, y: -halfH, width: 2 * halfW, height: 2 * halfH))
        let cells = 4
        let step = 2 * halfW / CGFloat(cells)
        for i in 1..<cells {
            let x = -halfW + CGFloat(i) * step
            p.detail.move(to: CGPoint(x: x, y: -halfH))
            p.detail.addLine(to: CGPoint(x: x, y: halfH))
        }
        return p
    }

    // Audience blinder: two-cell housing with two lamp faces.
    private static func blinder(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        let halfW = 1.1 * r
        let halfH = 0.62 * r
        p.body.addRoundedRect(
            in: CGRect(x: -halfW, y: -halfH, width: 2 * halfW, height: 2 * halfH),
            cornerSize: CGSize(width: 0.1 * r, height: 0.1 * r)
        )
        p.detail.move(to: CGPoint(x: 0, y: -halfH))
        p.detail.addLine(to: CGPoint(x: 0, y: halfH))
        let lamp = 0.34 * r
        p.detail.addEllipse(in: CGRect(x: -0.55 * r - lamp, y: -lamp, width: 2 * lamp, height: 2 * lamp))
        p.detail.addEllipse(in: CGRect(x: 0.55 * r - lamp, y: -lamp, width: 2 * lamp, height: 2 * lamp))
        return p
    }

    // Scoop / floodlight: open reflector dish, flat (open) side faces the front.
    private static func scoop(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        p.body.move(to: CGPoint(x: -r, y: 0))
        p.body.addArc(
            center: .zero,
            radius: r,
            startAngle: .degrees(180),
            endAngle: .degrees(360),
            clockwise: false
        )
        p.body.closeSubpath()
        p.front.move(to: CGPoint(x: -r, y: 0))
        p.front.addLine(to: CGPoint(x: r, y: 0))
        return p
    }

    // Generic fallback: circle with an inscribed cross.
    private static func generic(r: CGFloat) -> FixtureGlyphPaths {
        var p = FixtureGlyphPaths()
        p.body.addEllipse(in: CGRect(x: -r, y: -r, width: 2 * r, height: 2 * r))
        p.detail.move(to: CGPoint(x: -0.6 * r, y: 0))
        p.detail.addLine(to: CGPoint(x: 0.6 * r, y: 0))
        p.detail.move(to: CGPoint(x: 0, y: -0.6 * r))
        p.detail.addLine(to: CGPoint(x: 0, y: 0.6 * r))
        return p
    }
}
