import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeFixtureCircuit } from "../domain/circuiting.js";
import { fixtureNotesEqual, normalizeFixtureNotes } from "../domain/fixtureNotes.js";
import { FIXTURE_STATUS_OPTIONS, normalizeFixtureStatus } from "../domain/fixtureStatus.js";
import { getProfile } from "../domain/profiles.js";
import { formatImperial, parseImperial } from "../domain/units.js";
import { recordDebugEvent } from "../debugEvents.js";

const DEBOUNCE_MS = 450;
const FIELD_ORDER = [
  "x",
  "channel",
  "universe",
  "address",
  "circuit",
  "dimmer",
  "color",
  "status",
  "colorNote",
  "goboNote",
  "focusNote",
  "note",
];

const NUMERIC_LIMITS = {
  channel: { min: 1, max: 9999, label: "Channel" },
  universe: { min: 1, max: 63, label: "Universe" },
  address: { min: 1, max: 512, label: "Address" },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function draftFromFixture(fx) {
  const notes = normalizeFixtureNotes(fx.notes, fx.note);
  const circuiting = normalizeFixtureCircuit(fx);
  return {
    x: formatImperial(fx.xMm),
    channel: fx.channel == null ? "" : String(fx.channel),
    universe: fx.dmx?.universe == null ? "" : String(fx.dmx.universe),
    address: fx.dmx?.address == null ? "" : String(fx.dmx.address),
    circuit: circuiting.circuit,
    dimmer: circuiting.dimmer,
    color: fx.color ?? "",
    colorNote: notes.color,
    goboNote: notes.gobo,
    focusNote: notes.focus,
    note: notes.crew,
    status: normalizeFixtureStatus(fx.status),
  };
}

function parseIntegerDraft(value, { min, max, label }) {
  const trimmed = value.trim();
  if (!trimmed) return { value: null };
  if (!/^\d+$/.test(trimmed)) return { error: `${label} must be a whole number.` };
  const parsed = Number(trimmed);
  if (parsed < min || parsed > max) return { error: `${label} must be ${min} to ${max}.` };
  return { value: parsed };
}

function sameDmx(a, b) {
  return (a?.universe ?? null) === (b?.universe ?? null) && (a?.address ?? null) === (b?.address ?? null);
}

function hasPatch(patch) {
  return Object.keys(patch).length > 0;
}

export function buildPendingPatch(fx, draft) {
  const committed = draftFromFixture(fx);
  const errors = {};
  const patch = {};

  const xMm = parseImperial(draft.x);
  const channel = parseIntegerDraft(draft.channel, NUMERIC_LIMITS.channel);
  const universe = parseIntegerDraft(draft.universe, NUMERIC_LIMITS.universe);
  const address = parseIntegerDraft(draft.address, NUMERIC_LIMITS.address);

  if (xMm == null) errors.x = "Use feet and inches, like 2'-6\".";
  if (channel.error) errors.channel = channel.error;
  if (universe.error) errors.universe = universe.error;
  if (address.error) errors.address = address.error;

  if (!errors.x && draft.x !== committed.x && xMm !== fx.xMm) patch.xMm = xMm;
  if (!errors.channel && draft.channel !== committed.channel && channel.value !== (fx.channel ?? null)) {
    patch.channel = channel.value;
  }

  const universeChanged = draft.universe !== committed.universe;
  const addressChanged = draft.address !== committed.address;
  let nextUniverse = fx.dmx?.universe ?? null;
  let nextAddress = fx.dmx?.address ?? null;
  let dmxHasValidChange = false;

  if (universeChanged && !errors.universe) {
    nextUniverse = universe.value;
    if (nextUniverse == null) nextAddress = null;
    dmxHasValidChange = true;
  }

  if (addressChanged && !errors.address) {
    if (nextUniverse == null && address.value != null) {
      errors.address = "Set universe before address.";
    } else {
      nextAddress = address.value;
      dmxHasValidChange = true;
    }
  }

  if (dmxHasValidChange && !errors.address) {
    const nextDmx = nextUniverse == null ? null : { universe: nextUniverse, address: nextAddress };
    if (!sameDmx(nextDmx, fx.dmx)) patch.dmx = nextDmx;
  } else if (dmxHasValidChange && universeChanged && !errors.universe) {
    const nextDmx = nextUniverse == null ? null : { universe: nextUniverse, address: nextAddress };
    if (!sameDmx(nextDmx, fx.dmx)) patch.dmx = nextDmx;
  }

  const circuit = draft.circuit.trim();
  const dimmer = draft.dimmer.trim();
  if (draft.circuit !== committed.circuit && circuit !== (fx.circuit ?? "")) patch.circuit = circuit;
  if (draft.dimmer !== committed.dimmer && dimmer !== (fx.dimmer ?? "")) patch.dimmer = dimmer;
  if (draft.color !== committed.color && draft.color !== (fx.color ?? "")) patch.color = draft.color;

  const nextNotes = normalizeFixtureNotes({
    color: draft.colorNote,
    gobo: draft.goboNote,
    focus: draft.focusNote,
    crew: draft.note,
  });
  if (!fixtureNotesEqual(nextNotes, normalizeFixtureNotes(fx.notes, fx.note))) {
    patch.notes = nextNotes;
    patch.note = nextNotes.crew;
  }

  const status = normalizeFixtureStatus(draft.status);
  if (draft.status !== committed.status && status !== normalizeFixtureStatus(fx.status)) patch.status = status;

  return { errors, patch: hasPatch(patch) ? patch : null };
}

export default function Inspector({
  doc,
  fixtureId,
  selectedFixtureIds = [],
  onChange,
  onDelete,
  readOnly = false,
}) {
  if (!fixtureId) {
    return (
      <section className="inspector inspector--empty" aria-label="Fixture inspector">
        <header>
          <span className="mono small">INSPECTOR</span>
          <h3>No fixture selected</h3>
        </header>
        <p>Select a fixture to edit its channel, DMX, color, and notes.</p>
      </section>
    );
  }

  const fx = doc.fixtures[fixtureId];
  if (!fx) return null;
  const editorKey = [
    fx.id,
    fx.xMm,
    fx.channel ?? "",
    fx.dmx?.universe ?? "",
    fx.dmx?.address ?? "",
    fx.circuit ?? "",
    fx.dimmer ?? "",
    fx.color ?? "",
    JSON.stringify(normalizeFixtureNotes(fx.notes, fx.note)),
    fx.note ?? "",
    fx.status ?? "",
  ].join(":");

  return (
    <FixtureInspector
      key={editorKey}
      doc={doc}
      fx={fx}
      selectedFixtureIds={selectedFixtureIds}
      onChange={onChange}
      onDelete={onDelete}
      readOnly={readOnly}
    />
  );
}

function FixtureInspector({ doc, fx, selectedFixtureIds, onChange, onDelete, readOnly }) {
  const profile = getProfile(fx.profileId, doc.fixtureProfiles);
  const position = doc.positions[fx.positionId];
  const selectedCount = selectedFixtureIds.length;
  const sectionRef = useRef(null);
  const timerRef = useRef(null);
  const lastCommitRef = useRef(null);
  const [draft, setDraft] = useState(() => draftFromFixture(fx));
  const pending = useMemo(() => buildPendingPatch(fx, draft), [fx, draft]);
  const latestRef = useRef({ fxId: fx.id, onChange, pending });
  const errorSignature = JSON.stringify(pending.errors);

  useEffect(() => {
    latestRef.current = { fxId: fx.id, onChange, pending };
  });

  useEffect(() => {
    recordDebugEvent("inspector:select", { fixtureId: fx.id });
  }, [fx.id]);

  useEffect(() => {
    const fields = Object.keys(pending.errors);
    if (fields.length) recordDebugEvent("inspector:invalid", { fixtureId: fx.id, fields });
  }, [fx.id, errorSignature, pending.errors]);

  const commitPatch = useCallback((patch = latestRef.current.pending.patch) => {
    if (!patch) return false;
    const signature = JSON.stringify(patch);
    if (signature === lastCommitRef.current) return false;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    lastCommitRef.current = signature;
    latestRef.current.onChange(latestRef.current.fxId, patch);
    recordDebugEvent("inspector:commit", { fixtureId: latestRef.current.fxId, fields: Object.keys(patch) });
    return true;
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!pending.patch || readOnly) return undefined;
    timerRef.current = setTimeout(() => {
      commitPatch(pending.patch);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [commitPatch, pending.patch, readOnly]);

  useEffect(() => {
    return () => {
      if (!readOnly) commitPatch(latestRef.current.pending.patch);
    };
  }, [commitPatch, readOnly]);

  function updateDraft(key, value) {
    lastCommitRef.current = null;
    recordDebugEvent("inspector:draft", { fixtureId: fx.id, field: key });
    setDraft(current => ({ ...current, [key]: value }));
  }

  function revertField(key) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const committed = draftFromFixture(fx);
    setDraft(current => ({ ...current, [key]: committed[key] }));
  }

  function handleBlur(key) {
    if (readOnly) return;
    commitPatch(latestRef.current.pending.patch);
    if (latestRef.current.pending.errors[key]) revertField(key);
  }

  function focusNextField(key) {
    const currentIndex = FIELD_ORDER.indexOf(key);
    if (currentIndex < 0) return;
    window.requestAnimationFrame(() => {
      const controls = Array.from(sectionRef.current?.querySelectorAll("[data-inspector-field]") ?? []);
      const next = controls.find(control => FIELD_ORDER.indexOf(control.dataset.inspectorField) > currentIndex);
      next?.focus();
    });
  }

  function bumpNumericField(key, direction, step) {
    const limits = NUMERIC_LIMITS[key];
    if (!limits) return;
    const committed = draftFromFixture(fx);
    const parsedDraft = parseIntegerDraft(draft[key], limits);
    const parsedCommitted = parseIntegerDraft(committed[key], limits);
    const base = parsedDraft.value ?? parsedCommitted.value ?? limits.min;
    updateDraft(key, String(clamp(base + direction * step, limits.min, limits.max)));
  }

  function handleControlKeyDown(event, key) {
    if (readOnly) return;
    if (event.key === "Escape") {
      event.preventDefault();
      revertField(key);
      return;
    }

    if (event.key === "Enter" && event.currentTarget.tagName !== "TEXTAREA") {
      event.preventDefault();
      commitPatch(latestRef.current.pending.patch);
      focusNextField(key);
      return;
    }

    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && NUMERIC_LIMITS[key]) {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? 1 : -1;
      bumpNumericField(key, direction, event.shiftKey ? 10 : 1);
      return;
    }

    if (event.key === "Tab") commitPatch(latestRef.current.pending.patch);
  }

  function fieldProps(key) {
    const errorId = `inspector-${fx.id}-${key}-error`;
    const hasError = Boolean(pending.errors[key]);
    return {
      "data-inspector-field": key,
      "aria-invalid": hasError ? "true" : "false",
      "aria-describedby": hasError ? errorId : undefined,
      disabled: readOnly,
      tabIndex: readOnly ? -1 : undefined,
      onKeyDown: event => handleControlKeyDown(event, key),
      onBlur: () => handleBlur(key),
    };
  }

  function renderError(key) {
    if (!pending.errors[key]) return null;
    return <span id={`inspector-${fx.id}-${key}-error`} className="field-error">{pending.errors[key]}</span>;
  }

  function handleDelete() {
    if (readOnly) return;
    commitPatch(latestRef.current.pending.patch);
    onDelete(fx.id);
  }

  return (
    <section className={`inspector${readOnly ? " inspector--readonly" : ""}`} aria-label="Fixture inspector" ref={sectionRef}>
      <header className="inspector__header">
        <div>
          <span className="mono small">UNIT</span>
          <h3>{fx.unitNumber ?? "No unit"} <span className="muted small">| {profile?.model}</span></h3>
          <span className="mono small">{position?.name} | {formatImperial(fx.xMm)}</span>
        </div>
        {readOnly && <span className="inspector__state">Read only</span>}
      </header>

      {selectedCount > 1 && (
        <div className="inspector__multi" role="status">
          <strong>{selectedCount} FIXTURES SELECTED</strong>
          <span>Editing primary fixture. Align and distribute use the full selection.</span>
        </div>
      )}

      <label>
        <span>Position</span>
        <input
          type="text"
          value={draft.x}
          onChange={e => updateDraft("x", e.target.value)}
          placeholder={"0'-0\""}
          {...fieldProps("x")}
        />
        {renderError("x")}
      </label>

      <label>
        <span>Channel</span>
        <input
          type="text"
          inputMode="numeric"
          value={draft.channel}
          onChange={e => updateDraft("channel", e.target.value)}
          {...fieldProps("channel")}
        />
        {renderError("channel")}
      </label>

      <fieldset>
        <legend>DMX</legend>
        <label>
          <span>Universe</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.universe}
            onChange={e => updateDraft("universe", e.target.value)}
            {...fieldProps("universe")}
          />
          {renderError("universe")}
        </label>
        <label>
          <span>Address</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.address}
            onChange={e => updateDraft("address", e.target.value)}
            {...fieldProps("address")}
          />
          {renderError("address")}
        </label>
        <span className="mono small muted">footprint {profile?.dmxFootprint ?? 1}</span>
      </fieldset>

      <fieldset>
        <legend>Circuit</legend>
        <label>
          <span>Circuit</span>
          <input
            type="text"
            value={draft.circuit}
            onChange={e => updateDraft("circuit", e.target.value)}
            placeholder="A1"
            {...fieldProps("circuit")}
          />
        </label>
        <label>
          <span>Dimmer</span>
          <input
            type="text"
            value={draft.dimmer}
            onChange={e => updateDraft("dimmer", e.target.value)}
            placeholder="D12"
            {...fieldProps("dimmer")}
          />
        </label>
      </fieldset>

      <label>
        <span>Color</span>
        <input
          type="text"
          placeholder="R02, R26, R119, ..."
          value={draft.color}
          onChange={e => updateDraft("color", e.target.value)}
          {...fieldProps("color")}
        />
      </label>

      <label>
        <span>Status</span>
        <select
          value={draft.status}
          onChange={e => updateDraft("status", e.target.value)}
          {...fieldProps("status")}
        >
          {FIXTURE_STATUS_OPTIONS.map(status => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Color note</span>
        <textarea
          rows={2}
          value={draft.colorNote}
          onChange={e => updateDraft("colorNote", e.target.value)}
          {...fieldProps("colorNote")}
        />
      </label>

      <label>
        <span>Gobo note</span>
        <textarea
          rows={2}
          value={draft.goboNote}
          onChange={e => updateDraft("goboNote", e.target.value)}
          {...fieldProps("goboNote")}
        />
      </label>

      <label>
        <span>Focus note</span>
        <textarea
          rows={2}
          value={draft.focusNote}
          onChange={e => updateDraft("focusNote", e.target.value)}
          {...fieldProps("focusNote")}
        />
      </label>

      <label>
        <span>Crew note</span>
        <textarea
          rows={2}
          value={draft.note}
          onChange={e => updateDraft("note", e.target.value)}
          {...fieldProps("note")}
        />
      </label>

      <button
        className="btn-danger"
        type="button"
        onClick={handleDelete}
        disabled={readOnly}
        tabIndex={readOnly ? -1 : undefined}
      >
        Delete fixture
      </button>
    </section>
  );
}
