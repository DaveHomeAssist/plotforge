# PlotForge Local DMX Smoke Evidence

Status: local pre-hardware proof only

Run:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dmx:local-smoke
```

The script starts a loopback DMX relay, opens an authenticated WebSocket session, sends Art-Net and sACN unicast frames to a local UDP listener, and writes `local-smoke-latest.json`.

This proves:

- Relay `/health`.
- Origin rejection.
- No UDP before an authenticated frame command.
- Bad target rejection without UDP.
- 512-slot ArtDmx frame emission to a UDP listener.
- Art-Net blackout burst all-zero frames.
- 512-slot sACN frame emission to a UDP listener.
- sACN blackout burst all-zero frames.
- Heartbeat watchdog fault plus blackout.
- Active client disconnect blackout.
- Relay shutdown blackout.

Controlled sACN multicast target derivation is covered by automated relay tests, not by this loopback smoke. Real multicast behavior still belongs in D4 hardware/network smoke.

This does **not** satisfy D3 or D4 hardware verification. D3 still requires relay log, packet capture, node UI screenshot, and a real Art-Net fixture or dimmer result in `docs/dmx-smoke-evidence/2026-06-30/`. D4 still requires the same class of proof on a sACN-capable node.
