import { useEffect, useMemo, useRef, useState } from "react";
import {
  compileDmxOutput,
  DEFAULT_DMX_TEST_VALUES,
  DMX_OUTPUT_INTENTS,
  summarizeDmxOutput,
} from "../domain/dmxOutput.js";
import { normalizeDmxOutputSettings } from "../domain/dmxOutputPreferences.js";
import { getProfile } from "../domain/profiles.js";
import { sacnMulticastAddress } from "../domain/sacn.js";

const VALUE_FIELDS = [
  ["intensity", "Dimmer"],
  ["red", "Red"],
  ["green", "Green"],
  ["blue", "Blue"],
  ["white", "White"],
];

const DEFAULT_RELAY = {
  protocol: "artnet",
  targetMode: "unicast",
  relayUrl: "ws://127.0.0.1:8766",
  token: "",
  targetHost: "127.0.0.1",
  targetPort: "6454",
  net: "0",
  subNet: "0",
  universe: "0",
};

function defaultTargetPort(protocol) {
  return protocol === "sacn" ? 5568 : 6454;
}

function relayDefaultsFromDoc(doc) {
  const settings = normalizeDmxOutputSettings(doc?.dmxOutput || {});
  const universeRoute = settings.universes?.["1"] || {};
  return {
    protocol: settings.protocol,
    targetMode: settings.targetMode,
    relayUrl: settings.relayUrl,
    token: "",
    targetHost: universeRoute.targetHost || settings.targetHost,
    targetPort: String(settings.targetPort),
    net: String(universeRoute.net ?? 0),
    subNet: String(universeRoute.subNet ?? 0),
    universe: String(universeRoute.universe ?? 0),
  };
}

function clampSlotValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(255, Math.round(parsed)));
}

function fixtureLabel(doc, fixtureId) {
  const fixture = doc.fixtures?.[fixtureId];
  if (!fixture) return "Select fixture";
  const position = doc.positions?.[fixture.positionId];
  const profile = getProfile(fixture.profileId, doc.fixtureProfiles);
  const unit = fixture.unitNumber == null ? fixture.id : `U${fixture.unitNumber}`;
  const profileName = [profile?.manufacturer, profile?.model].filter(Boolean).join(" ") || fixture.profileId;
  return `${position?.name || "Unpositioned"} ${unit} · ${profileName}`;
}

function rangeLabel(range) {
  if (!Number.isInteger(range.startAddress) || !Number.isInteger(range.endAddress)) return "Invalid";
  return `U${range.universe} ${range.startAddress}-${range.endAddress}`;
}

function outputStatusLabel(status) {
  if (status === "selected") return "selected";
  if (status === "ready") return "ready";
  if (status === "unmapped") return "paperwork";
  if (status === "blocked") return "blocked";
  if (status === "invalid") return "invalid";
  return status || "unknown";
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function slotsToBase64(slots) {
  let binary = "";
  for (let index = 0; index < slots.length; index += 1) {
    binary += String.fromCharCode(clampInteger(slots[index], 0, 255, 0));
  }
  return window.btoa(binary);
}

function relayStateLabel(state) {
  if (state === "arming") return "arming";
  if (state === "armed") return "armed";
  if (state === "sending") return "sending";
  if (state === "blackout") return "blackout";
  if (state === "fault") return "fault";
  return "idle";
}

function relayTargetMode(protocol, targetMode) {
  if (protocol !== "sacn") return "unicast";
  return targetMode === "multicast" ? "multicast" : "unicast";
}

function relaySettingsPatch(relay) {
  const protocol = relay.protocol === "sacn" ? "sacn" : "artnet";
  const targetMode = relayTargetMode(protocol, relay.targetMode);
  const targetPort = clampInteger(relay.targetPort, 1, 65535, defaultTargetPort(protocol));
  const targetHost = relay.targetHost.trim() || DEFAULT_RELAY.targetHost;
  const universe = protocol === "sacn"
    ? clampInteger(relay.universe, 1, 63999, 1)
    : clampInteger(relay.universe, 0, 15, 0);
  const route = protocol === "sacn"
    ? { universe, targetHost }
    : {
        net: clampInteger(relay.net, 0, 127, 0),
        subNet: clampInteger(relay.subNet, 0, 15, 0),
        universe,
        targetHost,
      };

  return {
    protocol,
    targetMode,
    relayUrl: relay.relayUrl.trim() || DEFAULT_RELAY.relayUrl,
    targetHost,
    targetPort,
    universes: {
      "1": route,
    },
  };
}

export default function DmxOutputPanel({ doc, selectedFixtureId, onSettingsChange }) {
  const [intent, setIntent] = useState(DMX_OUTPUT_INTENTS.selectedFixtureTest);
  const [manualFixtureId, setManualFixtureId] = useState("");
  const [values, setValues] = useState(DEFAULT_DMX_TEST_VALUES);
  const [activeUniverse, setActiveUniverse] = useState(null);
  const [relay, setRelay] = useState(() => ({ ...DEFAULT_RELAY, ...relayDefaultsFromDoc(doc) }));
  const [relayState, setRelayState] = useState("idle");
  const [relayStatus, setRelayStatus] = useState("");
  const [relayError, setRelayError] = useState("");
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  const fixtureIds = doc.fixtureOrder || [];
  const requestedFixtureId = manualFixtureId || selectedFixtureId || fixtureIds[0] || "";
  const activeFixtureId = fixtureIds.includes(requestedFixtureId) ? requestedFixtureId : fixtureIds[0] || "";
  const compiled = useMemo(() => compileDmxOutput(doc, {
    intent,
    selectedFixtureId: activeFixtureId,
    values,
  }), [doc, intent, activeFixtureId, values]);
  const summary = useMemo(() => summarizeDmxOutput(compiled), [compiled]);
  const selectedUniverse = compiled.universes.find(universe => universe.universe === activeUniverse)
    || compiled.universes[0]
    || null;
  const isArmed = relayState === "armed" || relayState === "sending" || relayState === "blackout";
  const canArm = !compiled.blocked && compiled.universes.length > 0 && relay.token.trim().length > 0;
  const canSend = isArmed && !compiled.blocked && compiled.universes.length > 0;
  const currentTargetMode = relayTargetMode(relay.protocol, relay.targetMode);
  const displayedSacnUniverse = clampInteger(relay.universe, 1, 63999, 1);
  const displayedTargetHost = currentTargetMode === "multicast"
    ? sacnMulticastAddress(displayedSacnUniverse)
    : relay.targetHost;

  useEffect(() => () => {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    socketRef.current?.close();
  }, []);

  function onValueChange(key, value) {
    setValues(current => ({ ...current, [key]: clampSlotValue(value) }));
  }

  function onZeroValues() {
    setValues({ intensity: 0, red: 0, green: 0, blue: 0, white: 0 });
  }

  function persistRelaySettings(nextRelay) {
    onSettingsChange?.(relaySettingsPatch(nextRelay));
  }

  function updateRelay(patch, options = {}) {
    const nextRelay = { ...relay, ...patch };
    setRelay(nextRelay);
    if (options.persist !== false) persistRelaySettings(nextRelay);
  }

  function onProtocolChange(protocol) {
    const nextProtocol = protocol === "sacn" ? "sacn" : "artnet";
    const currentProtocol = relay.protocol === "sacn" ? "sacn" : "artnet";
    const shouldSwitchPort = String(relay.targetPort).trim() === String(defaultTargetPort(currentProtocol));
    const nextRelay = {
      ...relay,
      protocol: nextProtocol,
      targetMode: nextProtocol === "sacn" ? relayTargetMode(nextProtocol, relay.targetMode) : "unicast",
      targetPort: shouldSwitchPort ? String(defaultTargetPort(nextProtocol)) : relay.targetPort,
      universe: nextProtocol === "sacn" && String(relay.universe).trim() === "0" ? "1" : relay.universe,
    };
    setRelay(nextRelay);
    persistRelaySettings(nextRelay);
  }

  function onTargetModeChange(targetMode) {
    const nextTargetMode = targetMode === "multicast" ? "multicast" : "unicast";
    const nextRelay = {
      ...relay,
      targetMode: nextTargetMode,
      targetPort: relay.protocol === "sacn" && String(relay.targetPort).trim() === ""
        ? String(defaultTargetPort("sacn"))
        : relay.targetPort,
    };
    setRelay(nextRelay);
    persistRelaySettings(nextRelay);
  }

  function clearHeartbeat() {
    if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }

  function sendRelayCommand(command) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== window.WebSocket.OPEN) {
      throw new Error("DMX relay is not connected.");
    }
    socket.send(JSON.stringify({ token: relay.token, ...command }));
  }

  function startHeartbeat() {
    clearHeartbeat();
    heartbeatRef.current = window.setInterval(() => {
      try {
        sendRelayCommand({ type: "heartbeat" });
      } catch (error) {
        setRelayState("fault");
        setRelayError(error instanceof Error ? error.message : "DMX relay heartbeat failed.");
        clearHeartbeat();
      }
    }, 500);
  }

  function handleRelayMessage(message) {
    if (message.type === "fault") {
      setRelayState("fault");
      setRelayError(message.detail || message.reason || "DMX relay fault.");
      clearHeartbeat();
      return;
    }
    if (message.type === "frame.ok") {
      setRelayState("armed");
      setRelayStatus(`Frame sent (${message.bytesSent} bytes).`);
      setRelayError("");
      return;
    }
    if (message.type === "blackout.ok") {
      setRelayState("armed");
      setRelayStatus(`Blackout sent (${message.framesSent || 0} frames).`);
      setRelayError("");
      return;
    }
    if (String(message.type || "").endsWith(".error")) {
      setRelayState("fault");
      setRelayError(message.detail || message.reason || "DMX relay command failed.");
      clearHeartbeat();
      return;
    }
    if (message.type === "heartbeat.ok") {
      setRelayError("");
    }
  }

  function connectRelay() {
    if (socketRef.current?.readyState === window.WebSocket.OPEN) return Promise.resolve(socketRef.current);
    if (!window.WebSocket) return Promise.reject(new Error("WebSocket is not available in this browser."));
    if (!relay.token.trim()) return Promise.reject(new Error("Enter the relay token before arming output."));

    setRelayState("arming");
    setRelayError("");
    setRelayStatus("Connecting to DMX relay.");
    intentionalCloseRef.current = false;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(relay.relayUrl);
      socketRef.current = socket;
      let authenticated = false;
      const timer = window.setTimeout(() => {
        socket.close();
        reject(new Error("DMX relay timed out during arm."));
      }, 2500);

      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({
          type: "auth",
          protocolVersion: 1,
          token: relay.token,
        }));
      }, { once: true });

      socket.addEventListener("message", event => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          setRelayState("fault");
          setRelayError("DMX relay returned invalid JSON.");
          return;
        }
        if (!authenticated) {
          if (message.type === "auth.ok") {
            authenticated = true;
            window.clearTimeout(timer);
            setRelayState("armed");
            setRelayStatus("Output armed.");
            setRelayError("");
            startHeartbeat();
            resolve(socket);
            return;
          }
          window.clearTimeout(timer);
          socket.close();
          reject(new Error(message.reason || "DMX relay authentication failed."));
          return;
        }
        handleRelayMessage(message);
      });

      socket.addEventListener("error", () => {
        window.clearTimeout(timer);
        reject(new Error("DMX relay connection failed."));
      }, { once: true });

      socket.addEventListener("close", () => {
        window.clearTimeout(timer);
        clearHeartbeat();
        socketRef.current = null;
        if (!intentionalCloseRef.current && authenticated) {
          setRelayState("fault");
          setRelayError("DMX relay connection closed.");
        }
      });
    });
  }

  async function onArmRelay() {
    try {
      await connectRelay();
    } catch (error) {
      setRelayState("fault");
      setRelayStatus("");
      setRelayError(error instanceof Error ? error.message : "DMX relay arm failed.");
    }
  }

  function mappedPortAddress(universe) {
    const baseUniverse = clampInteger(relay.universe, 0, 15, 0);
    const mappedUniverse = baseUniverse + Math.max(0, Number(universe.universe || 1) - 1);
    if (mappedUniverse > 15) {
      throw new Error("Art-Net universe mapping exceeds the current Sub-Net range.");
    }
    return {
      net: clampInteger(relay.net, 0, 127, 0),
      subNet: clampInteger(relay.subNet, 0, 15, 0),
      universe: mappedUniverse,
    };
  }

  function mappedSacnUniverse(universe) {
    const baseUniverse = clampInteger(relay.universe, 1, 63999, 1);
    const mappedUniverse = baseUniverse + Math.max(0, Number(universe.universe || 1) - 1);
    if (mappedUniverse > 63999) {
      throw new Error("sACN universe mapping exceeds 63999.");
    }
    return mappedUniverse;
  }

  async function onSendTestFrame() {
    if (!canSend) {
      setRelayError("Arm output and clear compiler errors before sending.");
      return;
    }
    try {
      setRelayState("sending");
      for (const universe of compiled.universes) {
        const protocol = relay.protocol === "sacn" ? "sacn" : "artnet";
        const sacnUniverse = protocol === "sacn" ? mappedSacnUniverse(universe) : null;
        const targetMode = relayTargetMode(protocol, relay.targetMode);
        const command = {
          type: "frame",
          protocol,
          target: {
            host: targetMode === "multicast" ? sacnMulticastAddress(sacnUniverse) : relay.targetHost.trim(),
            port: clampInteger(relay.targetPort, 1, 65535, defaultTargetPort(protocol)),
          },
          length: universe.slots.length,
          data: slotsToBase64(universe.slots),
        };
        if (command.protocol === "sacn") {
          command.targetMode = targetMode;
          command.universe = sacnUniverse;
          command.sourceName = "PlotForge";
          command.priority = 100;
        } else {
          command.portAddress = mappedPortAddress(universe);
        }
        sendRelayCommand(command);
      }
      setRelayStatus(`Sent ${compiled.universes.length} universe frame${compiled.universes.length === 1 ? "" : "s"}.`);
      setRelayError("");
    } catch (error) {
      setRelayState("fault");
      setRelayError(error instanceof Error ? error.message : "DMX test frame failed.");
      clearHeartbeat();
    }
  }

  function onBlackout() {
    if (!isArmed) {
      setRelayError("Arm output before blackout.");
      return;
    }
    try {
      setRelayState("blackout");
      sendRelayCommand({ type: "blackout" });
      setRelayStatus("Blackout requested.");
      setRelayError("");
    } catch (error) {
      setRelayState("fault");
      setRelayError(error instanceof Error ? error.message : "DMX blackout failed.");
      clearHeartbeat();
    }
  }

  function onDisarm() {
    try {
      if (socketRef.current?.readyState === window.WebSocket.OPEN) {
        sendRelayCommand({ type: "blackout" });
      }
    } catch {
      // Closing the relay connection is the fallback disarm path.
    }
    intentionalCloseRef.current = true;
    clearHeartbeat();
    socketRef.current?.close();
    socketRef.current = null;
    setRelayState("idle");
    setRelayStatus("Output disarmed.");
    setRelayError("");
  }

  return (
    <section className="dmx-output-panel" aria-labelledby="dmx-output-title">
      <div className="panel-header">
        <div>
          <span className="mono small">D3 PREP</span>
          <h3 id="dmx-output-title">DMX output</h3>
        </div>
        <span className={`dmx-output-badge dmx-output-badge--${relayState} mono`}>
          {relayStateLabel(relayState)}
        </span>
      </div>

      <div className="dmx-output-warning mono">
        OUTPUT TEST MODE - Not for show use
      </div>

      <div className="dmx-output-panel__summary mono small">
        <span>{summary.universeCount} universes</span>
        <span>{summary.patchedFixtureCount} patched</span>
        <span className={summary.errorCount ? "status-bad" : "status-ok"}>
          {summary.errorCount ? `${summary.errorCount} errors` : "no blocks"}
        </span>
        <span className={summary.warningCount ? "library-status--warn" : "status-ok"}>
          {summary.warningCount ? `${summary.warningCount} warnings` : "mapped"}
        </span>
      </div>

      <div className="dmx-output-controls">
        <label>
          <span>Mode</span>
          <select value={intent} onChange={event => setIntent(event.target.value)}>
            <option value={DMX_OUTPUT_INTENTS.selectedFixtureTest}>Selected test</option>
            <option value={DMX_OUTPUT_INTENTS.blackout}>Blackout</option>
          </select>
        </label>
        <label className="dmx-output-controls__fixture">
          <span>Fixture</span>
          <select value={activeFixtureId} onChange={event => setManualFixtureId(event.target.value)}>
            {fixtureIds.map(id => (
              <option key={id} value={id}>{fixtureLabel(doc, id)}</option>
            ))}
          </select>
        </label>
        {VALUE_FIELDS.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="255"
              value={values[key]}
              onChange={event => onValueChange(key, event.target.value)}
              disabled={intent === DMX_OUTPUT_INTENTS.blackout}
            />
          </label>
        ))}
        <button type="button" className="btn-compact" onClick={onZeroValues}>Zero</button>
      </div>

      <div className="dmx-output-relay" aria-label="DMX relay controls">
        <div className="dmx-output-relay__fields">
          <label>
            <span>Protocol</span>
            <select
              value={relay.protocol}
              onChange={event => onProtocolChange(event.target.value)}
              disabled={isArmed}
            >
              <option value="artnet">Art-Net</option>
              <option value="sacn">sACN</option>
            </select>
          </label>
          <label>
            <span>Relay URL</span>
            <input
              value={relay.relayUrl}
              onChange={event => updateRelay({ relayUrl: event.target.value })}
              disabled={isArmed}
            />
          </label>
          <label>
            <span>Relay token</span>
            <input
              type="password"
              value={relay.token}
              onChange={event => updateRelay({ token: event.target.value }, { persist: false })}
              disabled={isArmed}
            />
          </label>
          <label>
            <span>Target mode</span>
            <select
              value={currentTargetMode}
              onChange={event => onTargetModeChange(event.target.value)}
              disabled={isArmed || relay.protocol !== "sacn"}
            >
              <option value="unicast">Unicast</option>
              <option value="multicast">sACN multicast</option>
            </select>
          </label>
          <label>
            <span>Target host</span>
            <input
              value={displayedTargetHost}
              onChange={event => updateRelay({ targetHost: event.target.value })}
              disabled={isArmed || currentTargetMode === "multicast"}
            />
          </label>
          <label>
            <span>Target port</span>
            <input
              inputMode="numeric"
              value={relay.targetPort}
              onChange={event => updateRelay({ targetPort: event.target.value })}
              disabled={isArmed}
            />
          </label>
          <label>
            <span>Net</span>
            <input
              inputMode="numeric"
              value={relay.net}
              onChange={event => updateRelay({ net: event.target.value })}
              disabled={isArmed || relay.protocol === "sacn"}
            />
          </label>
          <label>
            <span>Sub-Net</span>
            <input
              inputMode="numeric"
              value={relay.subNet}
              onChange={event => updateRelay({ subNet: event.target.value })}
              disabled={isArmed || relay.protocol === "sacn"}
            />
          </label>
          <label>
            <span>{relay.protocol === "sacn" ? "sACN universe" : "Universe"}</span>
            <input
              inputMode="numeric"
              value={relay.universe}
              onChange={event => updateRelay({ universe: event.target.value })}
              disabled={isArmed}
            />
          </label>
        </div>
        <div className="dmx-output-relay__actions">
          <button type="button" className="btn-compact" onClick={onArmRelay} disabled={!canArm || isArmed}>
            Arm output
          </button>
          <button type="button" className="btn-compact" onClick={onSendTestFrame} disabled={!canSend}>
            Send test frame
          </button>
          <button type="button" className="btn-compact dmx-output-blackout" onClick={onBlackout} disabled={!isArmed}>
            Blackout
          </button>
          <button type="button" className="btn-compact" onClick={onDisarm} disabled={!isArmed && relayState !== "fault"}>
            Disarm
          </button>
        </div>
        {relayStatus && <p className="library-status">{relayStatus}</p>}
        {relayError && <p className="library-status library-status--error">{relayError}</p>}
      </div>

      {(compiled.errors.length > 0 || compiled.warnings.length > 0) && (
        <div className="dmx-output-message-list" aria-label="DMX compiler messages">
          {compiled.errors.map((error, index) => (
            <p key={`error-${error.code}-${index}`} className="library-status library-status--error">
              {error.message}
            </p>
          ))}
          {compiled.warnings.map((warning, index) => (
            <p key={`warning-${warning.code}-${index}`} className="library-status library-status--warn">
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <div className="dmx-output-inspector">
        <div className="dmx-output-inspector__header">
          <strong>Universe inspector</strong>
          {compiled.universes.length > 1 && (
            <select
              aria-label="DMX universe"
              value={selectedUniverse?.universe || ""}
              onChange={event => setActiveUniverse(Number(event.target.value))}
            >
              {compiled.universes.map(universe => (
                <option key={universe.universe} value={universe.universe}>Universe {universe.universe}</option>
              ))}
            </select>
          )}
        </div>

        {selectedUniverse ? (
          <>
            <div className="dmx-output-range-list" aria-label="DMX fixture ranges">
              {selectedUniverse.usedRanges.map(range => (
                <div key={range.fixtureId} className="dmx-output-range-row">
                  <span className="mono">{rangeLabel(range)}</span>
                  <strong>{range.fixtureLabel}</strong>
                  <em>{outputStatusLabel(range.outputStatus)}</em>
                </div>
              ))}
            </div>
            <div className="dmx-output-slot-list mono small" aria-label="DMX non zero slots">
              {selectedUniverse.nonZeroSlots.length === 0 ? (
                <span>All slots zero.</span>
              ) : selectedUniverse.nonZeroSlots.map(slot => (
                <span key={`${slot.fixtureId}-${slot.address}`}>
                  {slot.address}: {slot.value} {slot.type} - {slot.explanation}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="library-status library-status--warn">No patched universes.</p>
        )}
      </div>
    </section>
  );
}
