{
  "version": 9,
  "id": "show_sample",
  "name": "Native Port Sample",
  "metadata": {
    "drawingTitle": "Native Shell Smoke",
    "venueName": "Studio A",
    "company": "PlotForge",
    "designer": "Dave",
    "draftsperson": "Codex",
    "showDate": "2026-06-25",
    "revision": "Draft",
    "scaleLabel": "1/4\" = 1'-0\""
  },
  "createdAt": 1782345600000,
  "updatedAt": 1782345600000,
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
      "yMm": 1524,
      "lengthMm": 9754,
      "trimMm": 6096
    },
    "pos_2": {
      "id": "pos_2",
      "name": "FOH TRUSS",
      "kind": "truss",
      "yMm": -1829,
      "lengthMm": 8534,
      "trimMm": 7620
    }
  },
  "positionOrder": ["pos_1", "pos_2"],
  "fixtures": {
    "fx_1": {
      "id": "fx_1",
      "positionId": "pos_1",
      "profileId": "s4_26",
      "xMm": -2438,
      "rotation": 0,
      "focus": {
        "xMm": -1524,
        "yMm": 3658
      },
      "unitNumber": 1,
      "channel": 101,
      "dmx": {
        "universe": 1,
        "address": 1
      },
      "color": "R02",
      "gobo": "",
      "note": "Check shutter cut",
      "notes": {
        "color": "R02",
        "gobo": "",
        "focus": "Downstage special",
        "crew": "Check shutter cut"
      },
      "status": "planned",
      "circuit": "A1",
      "dimmer": "D1"
    },
    "fx_2": {
      "id": "fx_2",
      "positionId": "pos_2",
      "profileId": "robe_megapointe",
      "xMm": 1219,
      "rotation": 0,
      "focus": null,
      "unitNumber": 1,
      "channel": 201,
      "dmx": {
        "universe": 2,
        "address": 101
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
      "status": "patched",
      "circuit": "B4",
      "dimmer": "R1"
    }
  },
  "fixtureOrder": ["fx_1", "fx_2"],
  "fixtureProfiles": {
    "s4_26": {
      "id": "s4_26",
      "manufacturer": "ETC",
      "model": "Source Four 26deg",
      "symbol": "ellipsoidal",
      "category": "ellipsoidal",
      "radiusMm": 180,
      "dmxFootprint": 1,
      "color": "#ffb547",
      "defaultMode": "Default",
      "modes": [
        {
          "name": "Default",
          "dmxFootprint": 1
        }
      ],
      "info": {
        "summary": "Fixed ellipsoidal profile for specials and front light.",
        "bestFor": ["front wash", "specials"],
        "capabilities": ["single dimmer"],
        "notes": ["Confirm lens tube before final paperwork."]
      },
      "libraryTier": "legacy",
      "source": {
        "type": "legacy-seed"
      }
    }
  },
  "revisions": {
    "rev_1": {
      "id": "rev_1",
      "name": "Draft",
      "note": "Native shell sample",
      "createdAt": 1782345600000
    }
  },
  "revisionOrder": ["rev_1"],
  "activeRevisionId": "rev_1",
  "commentPins": {
    "pin_1": {
      "id": "pin_1",
      "xMm": 0,
      "yMm": 3048,
      "text": "Confirm masking",
      "createdAt": 1782345600000
    }
  },
  "commentPinOrder": ["pin_1"],
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
