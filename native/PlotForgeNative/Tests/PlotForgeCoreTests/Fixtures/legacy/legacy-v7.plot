{
  "version": 7,
  "id": "show_legacy_v7",
  "name": "Legacy Corpus V7",
  "metadata": {
    "drawingTitle": "Legacy Drawing V7",
    "venueName": "Legacy Venue",
    "company": "PlotForge",
    "designer": "Dave",
    "draftsperson": "Codex",
    "showDate": "2026-06-25",
    "revision": "Draft",
    "scaleLabel": "1/4\" = 1'-0\""
  },
  "createdAt": 1700000007000,
  "updatedAt": 1700000007000,
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
      "lengthMm": 9144
    }
  },
  "positionOrder": ["pos_main"],
  "fixtures": {
    "fx_legacy": {
      "id": "fx_legacy",
      "positionId": "pos_main",
      "profileId": "s4_26",
      "xMm": -519,
      "unitNumber": 1,
      "channel": 101,
      "dmx": {
        "universe": 1,
        "address": 71
      },
      "color": "R09",
      "gobo": "Breakup",
      "note": "Layered crew note v7",
      "notes": {
        "color": "R09",
        "gobo": "Breakup",
        "focus": "Drum riser",
        "crew": "Layered crew note v7"
      },
      "status": "focused",
      "circuit": "A7",
      "dimmer": "D7"
    }
  },
  "fixtureOrder": ["fx_legacy"],
  "fixtureProfiles": {
    "s4_26": {
      "id": "s4_26",
      "manufacturer": "ETC",
      "model": "Source Four 26deg",
      "symbol": "ellipsoidal",
      "category": "ellipsoidal",
      "radiusMm": 180,
      "dmxFootprint": 1,
      "defaultMode": "Default",
      "modes": [
        {
          "name": "Default",
          "dmxFootprint": 1
        }
      ],
      "info": {
        "summary": "Legacy profile fixture"
      },
      "libraryTier": "legacy",
      "source": {
        "type": "legacy-corpus",
        "version": 7
      }
    }
  },
  "revisions": {
    "rev_legacy": {
      "id": "rev_legacy",
      "name": "Legacy Rev V7",
      "note": "Comment pin coverage",
      "createdAt": 1700000007000
    }
  },
  "revisionOrder": ["rev_legacy"],
  "activeRevisionId": "rev_legacy",
  "commentPins": {
    "pin_legacy": {
      "id": "pin_legacy",
      "xMm": 0,
      "yMm": 3048,
      "text": "Legacy comment",
      "createdAt": 1700000007000
    }
  },
  "commentPinOrder": ["pin_legacy"]
}
