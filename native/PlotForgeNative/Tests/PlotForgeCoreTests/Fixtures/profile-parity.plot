{
  "version": 9,
  "id": "show_profile_parity",
  "name": "Fixture Profile Parity",
  "metadata": {
    "drawingTitle": "Profile Parity",
    "venueName": "Studio A",
    "company": "PlotForge",
    "designer": "Dave",
    "draftsperson": "Codex",
    "showDate": "2026-06-25",
    "revision": "Draft",
    "scaleLabel": "1/4\" = 1'-0\""
  },
  "createdAt": 1700000010000,
  "updatedAt": 1700000010000,
  "venue": {
    "stageWidthMm": 10973,
    "stageDepthMm": 6706,
    "proscWidthMm": 9144
  },
  "positions": {
    "pos_main": {
      "id": "pos_main",
      "name": "1ST ELEC",
      "kind": "pipe",
      "yMm": 1524,
      "lengthMm": 9144,
      "trimMm": 6096
    }
  },
  "positionOrder": ["pos_main"],
  "fixtures": {
    "fx_gdtf": {
      "id": "fx_gdtf",
      "positionId": "pos_main",
      "profileId": "robe_megapointe",
      "xMm": -1219,
      "rotation": 0,
      "unitNumber": 1,
      "channel": 101,
      "dmx": {
        "universe": 1,
        "address": 1
      },
      "color": "",
      "gobo": "",
      "note": "",
      "notes": {
        "color": "",
        "gobo": "",
        "focus": "",
        "crew": ""
      },
      "status": "planned",
      "circuit": "A1",
      "dimmer": "D1"
    },
    "fx_ofl": {
      "id": "fx_ofl",
      "positionId": "pos_main",
      "profileId": "ofl_demo_maker_tiny_wash",
      "xMm": 0,
      "rotation": 0,
      "unitNumber": 2,
      "channel": 102,
      "dmx": {
        "universe": 1,
        "address": 41
      },
      "color": "",
      "gobo": "",
      "note": "",
      "notes": {
        "color": "",
        "gobo": "",
        "focus": "",
        "crew": ""
      },
      "status": "planned",
      "circuit": "A2",
      "dimmer": "D2"
    },
    "fx_legacy": {
      "id": "fx_legacy",
      "positionId": "pos_main",
      "profileId": "s4_26",
      "xMm": 1219,
      "rotation": 0,
      "unitNumber": 3,
      "channel": 103,
      "dmx": {
        "universe": 1,
        "address": 81
      },
      "color": "R02",
      "gobo": "",
      "note": "",
      "notes": {
        "color": "R02",
        "gobo": "",
        "focus": "",
        "crew": ""
      },
      "status": "planned",
      "circuit": "A3",
      "dimmer": "D3"
    }
  },
  "fixtureOrder": ["fx_gdtf", "fx_ofl", "fx_legacy"],
  "fixtureProfiles": {
    "robe_megapointe": {
      "id": "robe_megapointe",
      "manufacturer": "Robe Lighting",
      "model": "Robin MegaPointe",
      "symbol": "spot",
      "category": "moving-spot",
      "radiusMm": 260,
      "dmxFootprint": 39,
      "color": "#4cc9ff",
      "defaultMode": "Mode 1 - Standard 16 - bit",
      "modes": [
        {
          "name": "Mode 1 - Standard 16 - bit",
          "dmxFootprint": 39
        },
        {
          "name": "Mode 2 - Reduced 8 - bit",
          "dmxFootprint": 34
        }
      ],
      "libraryTier": "curated-gdtf",
      "source": {
        "type": "gdtf-share",
        "fixtureId": 661,
        "revisionId": 138392,
        "revision": "2026-04-13 Shutter channel sets revision",
        "revisionDate": "2026-04-13 10:14:23",
        "gdtfVersion": "1.2",
        "fixtureListUrl": "https://gdtf-share.com/userPage.php?name=Robe%20Lighting%20s.r.o.&page=fixtures",
        "apiUrl": "https://gdtf-share.com/apis/getFixtureFileListByUser.php?name=Robe+Lighting+s.r.o.&fixture=661"
      }
    },
    "ofl_demo_maker_tiny_wash": {
      "id": "ofl_demo_maker_tiny_wash",
      "manufacturer": "demo-maker",
      "model": "Tiny Wash",
      "symbol": "par",
      "category": "led-wash",
      "radiusMm": 235,
      "dmxFootprint": 4,
      "color": "#58e896",
      "defaultMode": "RGBW",
      "modes": [
        {
          "name": "RGBW",
          "dmxFootprint": 4
        }
      ],
      "libraryTier": "ofl-import",
      "source": {
        "type": "open-fixture-library",
        "manufacturerKey": "demo-maker",
        "fixtureKey": "tiny-wash",
        "fileName": null,
        "importedAt": 123
      }
    },
    "s4_26": {
      "id": "s4_26",
      "manufacturer": "ETC",
      "model": "Source Four 26\u00b0",
      "symbol": "ellipsoidal",
      "category": "ellipsoidal",
      "radiusMm": 200,
      "dmxFootprint": 1,
      "color": "#ffb547",
      "defaultMode": "Default",
      "modes": [
        {
          "name": "Default",
          "dmxFootprint": 1
        }
      ],
      "libraryTier": "legacy",
      "source": {
        "type": "legacy-seed"
      }
    }
  },
  "revisions": {},
  "revisionOrder": [],
  "activeRevisionId": null,
  "commentPins": {},
  "commentPinOrder": [],
  "oscBridge": {
    "version": 1,
    "namespace": "/plotforge",
    "relayUrl": "ws://127.0.0.1:8765",
    "targetHost": "127.0.0.1",
    "targetPort": 8000,
    "consoleProfile": "generic"
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
    "showFocusLabels": true
  }
}
