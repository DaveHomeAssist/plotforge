{
  "version": 6,
  "id": "show_legacy_v6",
  "name": "Legacy Corpus V6",
  "metadata": {
    "drawingTitle": "Legacy Drawing V6",
    "venueName": "Legacy Venue",
    "company": "PlotForge",
    "designer": "Dave",
    "draftsperson": "Codex",
    "showDate": "2026-06-25",
    "revision": "Draft",
    "scaleLabel": "1/4\" = 1'-0\""
  },
  "createdAt": 1700000006000,
  "updatedAt": 1700000006000,
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
      "xMm": -619,
      "unitNumber": 1,
      "channel": 101,
      "dmx": {
        "universe": 1,
        "address": 61
      },
      "color": "R08",
      "gobo": "Breakup",
      "note": "Layered crew note v6",
      "notes": {
        "color": "R08",
        "gobo": "Breakup",
        "focus": "Band leader",
        "crew": "Layered crew note v6"
      },
      "status": "focused",
      "circuit": "A6",
      "dimmer": "D6"
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
        "version": 6
      }
    }
  },
  "revisions": {
    "rev_legacy": {
      "id": "rev_legacy",
      "name": "Legacy Rev V6",
      "note": "Circuit and dimmer coverage",
      "createdAt": 1700000006000
    }
  },
  "revisionOrder": ["rev_legacy"],
  "activeRevisionId": "rev_legacy"
}
