{
  "version": 8,
  "id": "show_legacy_v8",
  "name": "Legacy Corpus V8",
  "metadata": {
    "drawingTitle": "Legacy Drawing V8",
    "venueName": "Legacy Venue",
    "company": "PlotForge",
    "designer": "Dave",
    "draftsperson": "Codex",
    "showDate": "2026-06-25",
    "revision": "Draft",
    "scaleLabel": "1/4\" = 1'-0\""
  },
  "createdAt": 1700000008000,
  "updatedAt": 1700000008000,
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
      "xMm": -419,
      "unitNumber": 1,
      "channel": 101,
      "dmx": {
        "universe": 1,
        "address": 81
      },
      "color": "R10",
      "gobo": "Breakup",
      "note": "Layered crew note v8",
      "notes": {
        "color": "R10",
        "gobo": "Breakup",
        "focus": "Guitar",
        "crew": "Layered crew note v8"
      },
      "status": "focused",
      "circuit": "A8",
      "dimmer": "D8"
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
        "summary": "Legacy profile fixture",
        "bestFor": ["front light"],
        "capabilities": ["single dimmer"],
        "notes": ["Confirm lens tube"]
      },
      "libraryTier": "legacy",
      "source": {
        "type": "legacy-corpus",
        "version": 8
      }
    }
  },
  "revisions": {
    "rev_legacy": {
      "id": "rev_legacy",
      "name": "Legacy Rev V8",
      "note": "OSC bridge coverage",
      "createdAt": 1700000008000
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
      "createdAt": 1700000008000
    }
  },
  "commentPinOrder": ["pin_legacy"],
  "oscBridge": {
    "version": 1,
    "namespace": "/legacy-v8",
    "relayUrl": "ws://127.0.0.1:8765",
    "targetHost": "127.0.0.1",
    "targetPort": 8000,
    "consoleProfile": "generic"
  }
}
