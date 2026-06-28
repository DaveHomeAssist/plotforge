import Foundation
import PlotForgeCore
import XCTest

final class PlotDocumentCodableTests: XCTestCase {
    func testDecodesCurrentPlotFile() throws {
        let document = try loadSample()

        XCTAssertEqual(document.version, 9)
        XCTAssertEqual(document.name, "Native Port Sample")
        XCTAssertEqual(document.metadata.drawingTitle, "Native Shell Smoke")
        XCTAssertEqual(document.venue.stageWidthMm, 10_973)
        XCTAssertEqual(document.positionOrder, ["pos_1", "pos_2"])
        XCTAssertEqual(document.fixtureOrder.count, 2)
        XCTAssertEqual(document.fixtures["fx_1"]?.notes.focus, "Downstage special")
        XCTAssertEqual(document.fixtures["fx_2"]?.dmx?.address, 101)
        XCTAssertEqual(document.fixtureProfiles["s4_26"]?.source?["type"], .string("legacy-seed"))
        XCTAssertTrue(document.labelSettings.showPositionLabels)
    }

    func testEncodeWritesVersionNine() throws {
        var document = try loadSample()
        document.version = 4
        document.name = "Encoded Native Sample"

        let encoded = try PlotDocumentCodec.encode(document)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        XCTAssertEqual(json["version"] as? Int, 9)
        XCTAssertEqual(json["name"] as? String, "Encoded Native Sample")
    }

    func testRoundTripKeepsCoreDocumentFields() throws {
        let document = try loadSample()
        let encoded = try PlotDocumentCodec.encode(document)
        let decoded = try PlotDocumentCodec.decode(encoded)

        XCTAssertEqual(decoded.name, document.name)
        XCTAssertEqual(decoded.metadata, document.metadata)
        XCTAssertEqual(decoded.venue, document.venue)
        XCTAssertEqual(decoded.positions, document.positions)
        XCTAssertEqual(decoded.fixtures, document.fixtures)
        XCTAssertEqual(decoded.commentPins, document.commentPins)
        XCTAssertEqual(decoded.labelSettings, document.labelSettings)
    }

    func testRoundTripPreservesUnknownDocumentFixtureAndProfileFields() throws {
        let json = """
        {
          "version": 9,
          "id": "show_future",
          "name": "Future Fields",
          "futureRoot": {
            "nativeShouldKeep": true,
            "nested": ["alpha", 3]
          },
          "metadata": {
            "drawingTitle": "Future Field Test",
            "venueName": "Studio A"
          },
          "createdAt": 1,
          "updatedAt": 1,
          "venue": {
            "stageWidthMm": 10973,
            "stageDepthMm": 6706,
            "proscWidthMm": 9144
          },
          "positions": {
            "pos_1": {
              "id": "pos_1",
              "name": "1ST ELEC",
              "kind": "pipe",
              "yMm": 0,
              "lengthMm": 9144
            }
          },
          "positionOrder": ["pos_1"],
          "fixtures": {
            "fx_1": {
              "id": "fx_1",
              "positionId": "pos_1",
              "profileId": "future_profile",
              "xMm": 0,
              "futureFixture": {
                "vendorData": "keep me"
              }
            }
          },
          "fixtureOrder": ["fx_1"],
          "fixtureProfiles": {
            "future_profile": {
              "id": "future_profile",
              "manufacturer": "FutureCo",
              "model": "Profile 1",
              "symbol": "moving",
              "category": "moving",
              "radiusMm": 200,
              "dmxFootprint": 16,
              "info": {
                "summary": "Profile summary",
                "futureInfo": "keep info"
              },
              "futureProfile": {
                "wikiUrl": "https://example.test/profile"
              }
            }
          },
          "revisions": {},
          "revisionOrder": [],
          "commentPins": {},
          "commentPinOrder": []
        }
        """

        let document = try PlotDocumentCodec.decode(json)
        let encoded = try PlotDocumentCodec.encode(document)
        let root = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        let futureRoot = try XCTUnwrap(root["futureRoot"] as? [String: Any])
        let fixtures = try XCTUnwrap(root["fixtures"] as? [String: Any])
        let fixture = try XCTUnwrap(fixtures["fx_1"] as? [String: Any])
        let futureFixture = try XCTUnwrap(fixture["futureFixture"] as? [String: Any])
        let profiles = try XCTUnwrap(root["fixtureProfiles"] as? [String: Any])
        let profile = try XCTUnwrap(profiles["future_profile"] as? [String: Any])
        let futureProfile = try XCTUnwrap(profile["futureProfile"] as? [String: Any])
        let info = try XCTUnwrap(profile["info"] as? [String: Any])

        XCTAssertEqual(futureRoot["nativeShouldKeep"] as? Bool, true)
        XCTAssertEqual(futureFixture["vendorData"] as? String, "keep me")
        XCTAssertEqual(futureProfile["wikiUrl"] as? String, "https://example.test/profile")
        XCTAssertEqual(info["futureInfo"] as? String, "keep info")
        XCTAssertEqual(fixture["status"] as? String, "planned")
        XCTAssertEqual(fixture["note"] as? String, "")
    }

    func testRoundTripPreservesUnknownNestedObjectFields() throws {
        let json = """
        {
          "version": 9,
          "id": "show_nested_future",
          "name": "Nested Future Fields",
          "metadata": {
            "drawingTitle": "Nested Future",
            "futureMetadata": "keep metadata"
          },
          "createdAt": 1,
          "updatedAt": 1,
          "venue": {
            "stageWidthMm": 10973,
            "stageDepthMm": 6706,
            "proscWidthMm": 9144,
            "futureVenue": "keep venue"
          },
          "positions": {
            "pos_1": {
              "id": "pos_1",
              "name": "1ST ELEC",
              "kind": "pipe",
              "yMm": 0,
              "lengthMm": 9144,
              "futurePosition": "keep position"
            }
          },
          "positionOrder": ["pos_1"],
          "fixtures": {
            "fx_1": {
              "id": "fx_1",
              "positionId": "pos_1",
              "profileId": "profile_1",
              "xMm": 0,
              "focus": {
                "xMm": 100,
                "yMm": 200,
                "futureFocus": "keep focus"
              },
              "dmx": {
                "universe": 1,
                "address": 10,
                "futureDmx": "keep dmx"
              },
              "notes": {
                "color": "R02",
                "gobo": "",
                "focus": "Special",
                "crew": "Legacy",
                "futureNotes": "keep notes"
              }
            }
          },
          "fixtureOrder": ["fx_1"],
          "fixtureProfiles": {
            "profile_1": {
              "id": "profile_1",
              "manufacturer": "FutureCo",
              "model": "Profile 1",
              "symbol": "moving",
              "category": "moving",
              "radiusMm": 200,
              "dmxFootprint": 16,
              "modes": [
                {
                  "name": "Standard",
                  "dmxFootprint": 16,
                  "futureMode": "keep mode"
                }
              ]
            }
          },
          "revisions": {
            "rev_1": {
              "id": "rev_1",
              "name": "Draft",
              "note": "Note",
              "createdAt": 1,
              "futureRevision": "keep revision"
            }
          },
          "revisionOrder": ["rev_1"],
          "activeRevisionId": "rev_1",
          "commentPins": {
            "pin_1": {
              "id": "pin_1",
              "xMm": 0,
              "yMm": 0,
              "text": "Comment",
              "createdAt": 1,
              "futurePin": "keep pin"
            }
          },
          "commentPinOrder": ["pin_1"],
          "oscBridge": {
            "version": 1,
            "namespace": "/plotforge",
            "relayUrl": "ws://127.0.0.1:8765",
            "targetHost": "127.0.0.1",
            "targetPort": 8000,
            "consoleProfile": "generic",
            "futureOsc": "keep osc"
          },
          "labelSettings": {
            "fixtureUnitSize": 120,
            "fixtureChannelSize": 88,
            "positionLabelSize": 120,
            "commentLabelSize": 105,
            "focusLabelSize": 110,
            "showFixtureUnit": true,
            "showFixtureChannel": false,
            "showPositionLabels": true,
            "showCommentText": true,
            "showFocusLabels": true,
            "futureLabels": "keep labels"
          }
        }
        """

        let document = try PlotDocumentCodec.decode(json)
        let encoded = try PlotDocumentCodec.encode(document)
        let root = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        let metadata = try XCTUnwrap(root["metadata"] as? [String: Any])
        let venue = try XCTUnwrap(root["venue"] as? [String: Any])
        let positions = try XCTUnwrap(root["positions"] as? [String: Any])
        let position = try XCTUnwrap(positions["pos_1"] as? [String: Any])
        let fixtures = try XCTUnwrap(root["fixtures"] as? [String: Any])
        let fixture = try XCTUnwrap(fixtures["fx_1"] as? [String: Any])
        let focus = try XCTUnwrap(fixture["focus"] as? [String: Any])
        let dmx = try XCTUnwrap(fixture["dmx"] as? [String: Any])
        let notes = try XCTUnwrap(fixture["notes"] as? [String: Any])
        let profiles = try XCTUnwrap(root["fixtureProfiles"] as? [String: Any])
        let profile = try XCTUnwrap(profiles["profile_1"] as? [String: Any])
        let modes = try XCTUnwrap(profile["modes"] as? [[String: Any]])
        let revisions = try XCTUnwrap(root["revisions"] as? [String: Any])
        let revision = try XCTUnwrap(revisions["rev_1"] as? [String: Any])
        let commentPins = try XCTUnwrap(root["commentPins"] as? [String: Any])
        let commentPin = try XCTUnwrap(commentPins["pin_1"] as? [String: Any])
        let oscBridge = try XCTUnwrap(root["oscBridge"] as? [String: Any])
        let labelSettings = try XCTUnwrap(root["labelSettings"] as? [String: Any])

        XCTAssertEqual(metadata["futureMetadata"] as? String, "keep metadata")
        XCTAssertEqual(venue["futureVenue"] as? String, "keep venue")
        XCTAssertEqual(position["futurePosition"] as? String, "keep position")
        XCTAssertEqual(focus["futureFocus"] as? String, "keep focus")
        XCTAssertEqual(dmx["futureDmx"] as? String, "keep dmx")
        XCTAssertEqual(notes["futureNotes"] as? String, "keep notes")
        XCTAssertEqual(modes.first?["futureMode"] as? String, "keep mode")
        XCTAssertEqual(revision["futureRevision"] as? String, "keep revision")
        XCTAssertEqual(commentPin["futurePin"] as? String, "keep pin")
        XCTAssertEqual(oscBridge["futureOsc"] as? String, "keep osc")
        XCTAssertEqual(labelSettings["futureLabels"] as? String, "keep labels")
    }

    func testRoundTripPreservesBlankDmxAddress() throws {
        let json = """
        {
          "version": 9,
          "id": "show_blank_dmx",
          "name": "Blank DMX",
          "createdAt": 1,
          "updatedAt": 1,
          "venue": {
            "stageWidthMm": 10973,
            "stageDepthMm": 6706,
            "proscWidthMm": 9144
          },
          "positions": {
            "pos_1": {
              "id": "pos_1",
              "name": "1ST ELEC",
              "kind": "pipe",
              "yMm": 0,
              "lengthMm": 9144
            }
          },
          "positionOrder": ["pos_1"],
          "fixtures": {
            "fx_1": {
              "id": "fx_1",
              "positionId": "pos_1",
              "profileId": "profile_1",
              "xMm": 0,
              "dmx": {
                "universe": 2,
                "address": null
              }
            }
          },
          "fixtureOrder": ["fx_1"],
          "fixtureProfiles": {
            "profile_1": {
              "id": "profile_1",
              "manufacturer": "FutureCo",
              "model": "Profile 1",
              "symbol": "moving",
              "category": "moving",
              "radiusMm": 200,
              "dmxFootprint": 16
            }
          },
          "revisions": {},
          "revisionOrder": [],
          "commentPins": {},
          "commentPinOrder": []
        }
        """

        let document = try PlotDocumentCodec.decode(json)
        XCTAssertEqual(document.fixtures["fx_1"]?.dmx?.universe, 2)
        XCTAssertNil(document.fixtures["fx_1"]?.dmx?.address)

        let encoded = try PlotDocumentCodec.encode(document)
        let root = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        let fixtures = try XCTUnwrap(root["fixtures"] as? [String: Any])
        let fixture = try XCTUnwrap(fixtures["fx_1"] as? [String: Any])
        let dmx = try XCTUnwrap(fixture["dmx"] as? [String: Any])

        XCTAssertEqual(dmx["universe"] as? Int, 2)
        XCTAssertTrue(dmx["address"] is NSNull)
    }

    func testMissingVersionNineFieldsReceiveDefaults() throws {
        let oldJSON = """
        {
          "version": 8,
          "id": "show_v8",
          "name": "Version 8",
          "createdAt": 1,
          "updatedAt": 1,
          "venue": {
            "stageWidthMm": 10973,
            "stageDepthMm": 6706,
            "proscWidthMm": 9144
          },
          "positions": {},
          "positionOrder": [],
          "fixtures": {},
          "fixtureOrder": []
        }
        """

        let document = try PlotDocumentCodec.decode(oldJSON)

        XCTAssertEqual(document.version, 9)
        XCTAssertEqual(document.metadata.drawingTitle, "Lighting Plot")
        XCTAssertEqual(document.oscBridge.namespace, "/plotforge")
        XCTAssertEqual(document.labelSettings.fixtureUnitSize, 120)
        XCTAssertTrue(document.labelSettings.showFixtureUnit)
    }

    func testLegacyFixtureReceivesDefaultsAndMigratesToVersionNine() throws {
        let oldJSON = """
        {
          "version": 4,
          "id": "show_v4",
          "name": "Version 4",
          "createdAt": 1,
          "updatedAt": 1,
          "venue": {
            "stageWidthMm": 10973,
            "stageDepthMm": 6706,
            "proscWidthMm": 9144
          },
          "positions": {
            "pos_1": {
              "id": "pos_1",
              "name": "1ST ELEC",
              "kind": "pipe",
              "yMm": 0,
              "lengthMm": 9144
            }
          },
          "positionOrder": ["pos_1"],
          "fixtures": {
            "fx_1": {
              "id": "fx_1",
              "positionId": "pos_1",
              "profileId": "s4_26",
              "xMm": 0,
              "note": "Legacy note"
            }
          },
          "fixtureOrder": ["fx_1"]
        }
        """

        let document = try PlotDocumentCodec.decode(oldJSON)
        let fixture = try XCTUnwrap(document.fixtures["fx_1"])

        XCTAssertEqual(document.version, plotDocumentVersion)
        XCTAssertEqual(fixture.rotation, 0)
        XCTAssertNil(fixture.focus)
        XCTAssertEqual(fixture.status, "planned")
        XCTAssertEqual(fixture.circuit, "")
        XCTAssertEqual(fixture.dimmer, "")
        XCTAssertEqual(fixture.notes.crew, "Legacy note")
        XCTAssertEqual(fixture.note, "Legacy note")
    }

    func testVersionsZeroThroughEightDecodeFromLegacyFixtureCorpus() throws {
        for schemaVersion in 0...8 {
            let document = try loadLegacyFixture(version: schemaVersion)
            let position = try XCTUnwrap(document.positions["pos_main"])
            let fixture = try XCTUnwrap(document.fixtures["fx_legacy"])
            let expectedCrewNote = schemaVersion >= 5 ? "Layered crew note v\(schemaVersion)" : "Legacy crew note v\(schemaVersion)"

            XCTAssertEqual(document.version, plotDocumentVersion)
            XCTAssertEqual(document.id, "show_legacy_v\(schemaVersion)")
            XCTAssertEqual(document.name, "Legacy Corpus V\(schemaVersion)")
            XCTAssertEqual(position.name, "1ST ELEC")
            XCTAssertEqual(document.positionOrder, ["pos_main"])
            XCTAssertEqual(document.fixtureOrder, ["fx_legacy"])
            XCTAssertEqual(fixture.profileId, "s4_26")
            XCTAssertEqual(fixture.rotation, 0)
            XCTAssertNil(fixture.focus)
            XCTAssertEqual(fixture.dmx?.universe, 1)
            XCTAssertEqual(fixture.dmx?.address, schemaVersion * 10 + 1)
            XCTAssertEqual(fixture.note, expectedCrewNote)
            XCTAssertEqual(fixture.notes.crew, expectedCrewNote)

            if schemaVersion >= 2 {
                let profile = try XCTUnwrap(document.fixtureProfiles["s4_26"])
                XCTAssertEqual(profile.manufacturer, "ETC")
                XCTAssertEqual(profile.model, "Source Four 26deg")
                XCTAssertEqual(profile.source?["type"], .string("legacy-corpus"))
                XCTAssertEqual(profile.source?["version"], .number(Double(schemaVersion)))
            } else {
                XCTAssertEqual(document.fixtureProfiles, [:])
            }

            if schemaVersion >= 3 {
                XCTAssertEqual(document.activeRevisionId, "rev_legacy")
                XCTAssertEqual(document.revisionOrder, ["rev_legacy"])
                XCTAssertEqual(document.revisions["rev_legacy"]?.name, "Legacy Rev V\(schemaVersion)")
            } else {
                XCTAssertNil(document.activeRevisionId)
                XCTAssertEqual(document.revisions, [:])
                XCTAssertEqual(document.revisionOrder, [])
            }

            if schemaVersion >= 4 {
                XCTAssertEqual(fixture.status, schemaVersion == 4 ? "hung" : "focused")
            } else {
                XCTAssertEqual(fixture.status, "planned")
            }

            if schemaVersion >= 5 {
                XCTAssertEqual(fixture.notes.gobo, "Breakup")
                XCTAssertFalse(fixture.notes.focus.isEmpty)
            } else {
                XCTAssertEqual(fixture.notes.gobo, "")
                XCTAssertEqual(fixture.notes.focus, "")
            }

            if schemaVersion >= 6 {
                XCTAssertEqual(fixture.circuit, "A\(schemaVersion)")
                XCTAssertEqual(fixture.dimmer, "D\(schemaVersion)")
            } else {
                XCTAssertEqual(fixture.circuit, "")
                XCTAssertEqual(fixture.dimmer, "")
            }

            if schemaVersion >= 7 {
                XCTAssertEqual(document.commentPinOrder, ["pin_legacy"])
                XCTAssertEqual(document.commentPins["pin_legacy"]?.text, "Legacy comment")
            } else {
                XCTAssertEqual(document.commentPins, [:])
                XCTAssertEqual(document.commentPinOrder, [])
            }

            if schemaVersion >= 8 {
                XCTAssertEqual(document.oscBridge.namespace, "/legacy-v8")
            } else {
                XCTAssertEqual(document.oscBridge.namespace, "/plotforge")
            }

            XCTAssertEqual(document.metadata.scaleLabel, "1/4\" = 1'-0\"")
            XCTAssertTrue(document.labelSettings.showFixtureUnit)

            let encoded = try PlotDocumentCodec.encode(document)
            let encodedRoot = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
            XCTAssertEqual(encodedRoot["version"] as? Int, plotDocumentVersion)
            XCTAssertNotNil(encodedRoot["labelSettings"])

            let decodedAgain = try PlotDocumentCodec.decode(encoded)
            XCTAssertEqual(decodedAgain.fixtures["fx_legacy"]?.notes.crew, expectedCrewNote)
        }
    }

    func testFixtureProfileParityPreservesWebProfileMetadata() throws {
        let document = try loadProfileParityFixture()

        let gdtf = try XCTUnwrap(document.fixtureProfiles["robe_megapointe"])
        XCTAssertEqual(gdtf.manufacturer, "Robe Lighting")
        XCTAssertEqual(gdtf.model, "Robin MegaPointe")
        XCTAssertEqual(gdtf.symbol, "spot")
        XCTAssertEqual(gdtf.category, "moving-spot")
        XCTAssertEqual(gdtf.radiusMm, 260)
        XCTAssertEqual(gdtf.dmxFootprint, 39)
        XCTAssertEqual(gdtf.color, "#4cc9ff")
        XCTAssertEqual(gdtf.defaultMode, "Mode 1 - Standard 16 - bit")
        XCTAssertEqual(gdtf.modes.map(\.name), ["Mode 1 - Standard 16 - bit", "Mode 2 - Reduced 8 - bit"])
        XCTAssertEqual(gdtf.modes.map(\.dmxFootprint), [39, 34])
        XCTAssertEqual(gdtf.libraryTier, "curated-gdtf")
        XCTAssertEqual(gdtf.source?["type"], .string("gdtf-share"))
        XCTAssertEqual(gdtf.source?["fixtureId"], .number(661))
        XCTAssertEqual(gdtf.source?["revisionId"], .number(138_392))
        XCTAssertEqual(gdtf.source?["revision"], .string("2026-04-13 Shutter channel sets revision"))
        XCTAssertEqual(gdtf.source?["revisionDate"], .string("2026-04-13 10:14:23"))
        XCTAssertEqual(gdtf.source?["gdtfVersion"], .string("1.2"))
        XCTAssertEqual(gdtf.source?["fixtureListUrl"], .string("https://gdtf-share.com/userPage.php?name=Robe%20Lighting%20s.r.o.&page=fixtures"))
        XCTAssertEqual(gdtf.source?["apiUrl"], .string("https://gdtf-share.com/apis/getFixtureFileListByUser.php?name=Robe+Lighting+s.r.o.&fixture=661"))

        let ofl = try XCTUnwrap(document.fixtureProfiles["ofl_demo_maker_tiny_wash"])
        XCTAssertEqual(ofl.manufacturer, "demo-maker")
        XCTAssertEqual(ofl.model, "Tiny Wash")
        XCTAssertEqual(ofl.symbol, "par")
        XCTAssertEqual(ofl.category, "led-wash")
        XCTAssertEqual(ofl.radiusMm, 235)
        XCTAssertEqual(ofl.dmxFootprint, 4)
        XCTAssertEqual(ofl.color, "#58e896")
        XCTAssertEqual(ofl.defaultMode, "RGBW")
        XCTAssertEqual(ofl.modes, [FixtureMode(name: "RGBW", dmxFootprint: 4)])
        XCTAssertEqual(ofl.libraryTier, "ofl-import")
        XCTAssertEqual(ofl.source?["type"], .string("open-fixture-library"))
        XCTAssertEqual(ofl.source?["manufacturerKey"], .string("demo-maker"))
        XCTAssertEqual(ofl.source?["fixtureKey"], .string("tiny-wash"))
        XCTAssertEqual(ofl.source?["fileName"], .null)
        XCTAssertEqual(ofl.source?["importedAt"], .number(123))

        let legacy = try XCTUnwrap(document.fixtureProfiles["s4_26"])
        XCTAssertEqual(legacy.manufacturer, "ETC")
        XCTAssertEqual(legacy.model, "Source Four 26\u{00B0}")
        XCTAssertEqual(legacy.symbol, "ellipsoidal")
        XCTAssertEqual(legacy.category, "ellipsoidal")
        XCTAssertEqual(legacy.radiusMm, 200)
        XCTAssertEqual(legacy.dmxFootprint, 1)
        XCTAssertEqual(legacy.color, "#ffb547")
        XCTAssertEqual(legacy.defaultMode, "Default")
        XCTAssertEqual(legacy.modes, [FixtureMode(name: "Default", dmxFootprint: 1)])
        XCTAssertEqual(legacy.libraryTier, "legacy")
        XCTAssertEqual(legacy.source?["type"], .string("legacy-seed"))

        let encoded = try PlotDocumentCodec.encode(document)
        let decodedAgain = try PlotDocumentCodec.decode(encoded)

        XCTAssertEqual(decodedAgain.fixtureProfiles, document.fixtureProfiles)
        XCTAssertEqual(decodedAgain.fixtures["fx_gdtf"]?.profileId, "robe_megapointe")
        XCTAssertEqual(decodedAgain.fixtures["fx_ofl"]?.profileId, "ofl_demo_maker_tiny_wash")
        XCTAssertEqual(decodedAgain.fixtures["fx_legacy"]?.profileId, "s4_26")
    }

    private func loadSample() throws -> PlotShowDocument {
        let url = try XCTUnwrap(
            Bundle.module.url(
                forResource: "sample-v9",
                withExtension: "plot",
                subdirectory: "Fixtures"
            )
        )
        let data = try Data(contentsOf: url)
        return try PlotDocumentCodec.decode(data)
    }

    private func loadProfileParityFixture() throws -> PlotShowDocument {
        let url = try XCTUnwrap(
            Bundle.module.url(
                forResource: "profile-parity",
                withExtension: "plot",
                subdirectory: "Fixtures"
            )
        )
        let data = try Data(contentsOf: url)
        return try PlotDocumentCodec.decode(data)
    }

    private func loadLegacyFixture(version: Int) throws -> PlotShowDocument {
        let url = try XCTUnwrap(
            Bundle.module.url(
                forResource: "legacy-v\(version)",
                withExtension: "plot",
                subdirectory: "Fixtures/legacy"
            )
        )
        let data = try Data(contentsOf: url)
        return try PlotDocumentCodec.decode(data)
    }
}
