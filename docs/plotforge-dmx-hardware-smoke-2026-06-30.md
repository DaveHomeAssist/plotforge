# PlotForge D3 DMX Hardware Smoke Protocol

Date: 2026-06-30

Status: protocol and evidence scaffold prepared; physical hardware smoke not yet run

## Scope

This protocol is the D3 gate for PlotForge DMX output. It proves the path from PlotForge web UI to local DMX relay, Art-Net UDP packet, Ethernet node, DMX output, and one known fixture or dimmer channel.

Passing this protocol upgrades D3 from local simulator/relay proof to hardware verified. Relay logs alone do not satisfy D3.

## Hardware Target

Primary target class: low-cost Ethernet Art-Net/sACN node.

Current candidate check, 2026-06-30:

- Primary: [DMXKing eDMX1 MAX](https://shop.dmxking.com/eDMX1-MAX_p_59.html) — shop listing reviewed; one-universe Art-Net/sACN node, USD 240.00, listed in stock.
- Alternate: [ENTTEC ODE Mk3](https://www.enttec.com/product/dmx-ethernet/ode-mk3-dmx-ethernet-converter/) — manufacturer listing reviewed; two-universe Ethernet-to-DMX node with Art-Net/sACN support, web UI, PoE/DC power, and 44 FPS max refresh. [B&H listing](https://www.bhphotovideo.com/c/product/1767487-REG/enttec_70407_ode_mk3_ethernet_dmx.html) reviewed for US retail availability: USD 319.00, listed in stock.
- Purchasing note: verify final price, stock, shipping date, and return policy immediately before buying. Do not treat this protocol as purchase approval.

## Required Equipment

- Mac running the PlotForge checkout.
- Ethernet connection to the Art-Net node, preferably wired and isolated from production networks.
- One Art-Net/sACN Ethernet node configured for Art-Net unicast.
- One dimmer channel or fixture with a known safe intensity channel.
- DMX cable and terminator as needed.
- Screenshot tool for the node UI.
- Packet capture tool: Wireshark or `tcpdump`.
- Optional camera for fixture video.

## Safety Preconditions

- Test on a bench or isolated rig, not a live show network.
- Use a known safe dimmer or static fixture first. Do not start with a moving light, strobe, reset, macro, or hazardous effect.
- Patch one fixture to universe 1, address 1 where possible.
- Confirm node output is not connected to production fixtures.
- Keep a physical way to remove fixture power or DMX.
- Confirm the relay token is visible only in the local terminal and is not written into `.plot`.

## Setup

1. Install dependencies with Node 22 if needed.
2. Run the local pre-hardware smoke before connecting a real node:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dmx:local-smoke
```

Expected result: `docs/dmx-smoke-evidence/local/local-smoke-latest.json` shows pass results for relay health, origin rejection, no-output-before-frame, bad target rejection, UDP-listener ArtDmx frame, Art-Net blackout burst, UDP-listener sACN frame, sACN blackout burst, heartbeat timeout blackout, client disconnect blackout, and relay shutdown blackout. This is useful setup proof, but it does **not** satisfy D3 or D4 hardware verification.

3. Confirm the hardware evidence folder is still failing closed before the run:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dmx:evidence-check -- --protocol artnet
```

Expected pre-run result: the command fails and lists missing hardware artifacts. After a real hardware run, the same command must pass before D3 is marked verified.
4. Start PlotForge:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dev -- --host 127.0.0.1 --port 5173
```

5. Start the DMX relay:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH \
  PLOTFORGE_DMX_TARGET_HOST=<node-ip> \
  PLOTFORGE_DMX_TARGET_PORT=6454 \
  PLOTFORGE_DMX_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
  npm run dmx:relay 2>&1 | tee docs/dmx-smoke-evidence/2026-06-30/relay.log
```

6. Copy the relay token from the relay terminal into the Output panel.
7. Configure the node for Art-Net unicast, Net 0, Sub-Net 0, Universe 0.
8. Open the node UI and capture `node-ui.png`.
9. Start packet capture before sending any frames.

Example `tcpdump` command:

```bash
sudo tcpdump -i <interface> udp port 6454 -w docs/dmx-smoke-evidence/2026-06-30/capture.pcap
```

## Test Matrix

### 1. No Output Without Arming

Steps:

- Open PlotForge Output.
- Leave output idle.
- Confirm Send Test Frame and Blackout are disabled.
- Confirm no Art-Net packets appear in capture.

Pass:

- No UDP packets emitted before arm.
- UI state is idle.

### 2. Arm

Steps:

- Enter relay URL, token, target host, target port, and Art-Net Net/Sub-Net/Universe.
- Click Arm output.

Pass:

- UI state changes to armed.
- Relay logs authenticated session.
- No nonzero frame is sent just by arming.

### 3. Selected Intensity Test

Steps:

- Select the safe fixture/dimmer.
- Set Dimmer to 255 and RGBW values to 0 unless the test fixture is RGBW.
- Click Send test frame.

Pass:

- Relay logs `frame.ok`.
- Packet capture shows ArtDmx to UDP port 6454 with `Art-Net\0`, OpDmx `0x5000`, Net 0, Sub-Net 0, Universe 0, length 512.
- Node UI reports receive activity.
- Fixture/dimmer visibly turns on.

### 4. Blackout

Steps:

- Click Blackout.

Pass:

- Relay logs `blackout.ok`.
- Packet capture shows the configured burst of all-zero ArtDmx frames.
- Fixture/dimmer returns to zero.

### 5. Bad Target

Steps:

- Change target host to a non-existent private address.
- Try Send test frame.

Pass:

- UI surfaces a fault or visible failure state.
- No operator could confuse the failure for verified output.

### 6. Network Disconnect

Steps:

- Restore the real node target and send one selected fixture test.
- Disconnect the node network path or DMX node power.
- Try Send test frame or observe relay/node fault behavior.

Pass:

- UI or relay evidence shows a visible failure path.
- The node/fixture state is not recorded as verified while disconnected.

### 7. Relay Crash Or Tab Failure

Steps:

- Arm and send one test frame.
- Kill the relay or stop heartbeats by closing the tab.

Pass:

- Relay watchdog emits blackout before fault where relay is still alive.
- UI moves to fault when the relay connection drops.
- Fixture/dimmer does not remain at a stale nonzero value after the watchdog path.

### 8. Blackout Recovery

Steps:

- Restart the relay if needed.
- Re-arm output.
- Send one selected fixture test.
- Click Blackout.

Pass:

- Fixture/dimmer returns to zero after the recovery send.
- UI remains recoverable and can disarm cleanly.

## Evidence Requirements

Minimum D3 verified evidence:

- `relay.log`
- `capture.pcap` or `capture.pcapng`
- `node-ui.png`
- Completed `docs/dmx-smoke-evidence/2026-06-30/README.md`
- Passing `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dmx:evidence-check -- --protocol artnet`

Fixture verified upgrade:

- Add `fixture-video.mov` or `fixture-video.mp4` showing selected test and blackout.
- Pass `PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dmx:evidence-check -- --protocol artnet --fixture-verified`

## Current D3 Status

Protocol and evidence scaffold are ready. D3 is not complete until a real Art-Net node and fixture/dimmer channel are run through this protocol and the evidence files are retained.
