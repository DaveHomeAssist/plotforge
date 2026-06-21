import { useEffect, useMemo, useRef, useState } from "react";
import { FIXTURE_STATUS_OPTIONS, normalizeFixtureStatus } from "../domain/fixtureStatus.js";
import { getProfile } from "../domain/profiles.js";
import { formatImperial, parseImperial } from "../domain/units.js";

const DEBOUNCE_MS = 450;

function draftFromFixture(fx) {
  return {
    x: formatImperial(fx.xMm),
    channel: fx.channel == null ? "" : String(fx.channel),
    universe: fx.dmx?.universe == null ? "" : String(fx.dmx.universe),
    address: fx.dmx?.address == null ? "" : String(fx.dmx.address),
    color: fx.color ?? "",
    note: fx.note ?? "",
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

function buildPendingPatch(fx, draft) {
  const errors = {};
  const patch = {};
  const xMm = parseImperial(draft.x);
  const channel = parseIntegerDraft(draft.channel, { min: 1, max: 9999, label: "Channel" });
  const universe = parseIntegerDraft(draft.universe, { min: 1, max: 63, label: "Universe" });
  const address = parseIntegerDraft(draft.address, { min: 1, max: 512, label: "Address" });

  if (xMm == null) errors.x = "Use feet and inches, like 2'-6\".";
  if (channel.error) errors.channel = channel.error;
  if (universe.error) errors.universe = universe.error;
  if (address.error) errors.address = address.error;
  if (address.value != null && universe.value == null) errors.address = "Set universe before address.";

  if (Object.keys(errors).length) return { errors, patch: null };

  if (xMm !== fx.xMm) patch.xMm = xMm;
  if (channel.value !== (fx.channel ?? null)) patch.channel = channel.value;

  const nextDmx = universe.value == null
    ? null
    : { universe: universe.value, address: address.value };
  if (!sameDmx(nextDmx, fx.dmx)) patch.dmx = nextDmx;
  if (draft.color !== (fx.color ?? "")) patch.color = draft.color;
  if (draft.note !== (fx.note ?? "")) patch.note = draft.note;
  const status = normalizeFixtureStatus(draft.status);
  if (status !== normalizeFixtureStatus(fx.status)) patch.status = status;

  return { errors, patch: Object.keys(patch).length ? patch : null };
}

export default function Inspector({ doc, fixtureId, onChange, onDelete }) {
  if (!fixtureId) {
    return (
      <section className="inspector inspector--empty">
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
    fx.color ?? "",
    fx.note ?? "",
    fx.status ?? "",
  ].join(":");

  return <FixtureInspector key={editorKey} doc={doc} fx={fx} onChange={onChange} onDelete={onDelete} />;
}

function FixtureInspector({ doc, fx, onChange, onDelete }) {
  const profile = getProfile(fx.profileId, doc.fixtureProfiles);
  const position = doc.positions[fx.positionId];
  const [draft, setDraft] = useState(() => draftFromFixture(fx));
  const timerRef = useRef(null);
  const pending = useMemo(() => buildPendingPatch(fx, draft), [fx, draft]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!pending.patch) return undefined;
    timerRef.current = setTimeout(() => {
      onChange(fx.id, pending.patch);
      timerRef.current = null;
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [fx.id, onChange, pending]);

  function updateDraft(key, value) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  function flushPending() {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    if (pending.patch) onChange(fx.id, pending.patch);
  }

  return (
    <section className="inspector">
      <header>
        <span className="mono small">UNIT</span>
        <h3>{fx.unitNumber ?? "No unit"} <span className="muted small">| {profile?.model}</span></h3>
        <span className="mono small">{position?.name} | {formatImperial(fx.xMm)}</span>
      </header>

      <label>
        <span>Position</span>
        <input
          type="text"
          value={draft.x}
          onChange={e => updateDraft("x", e.target.value)}
          onBlur={flushPending}
          aria-invalid={pending.errors.x ? "true" : "false"}
          aria-describedby={pending.errors.x ? "inspector-x-error" : undefined}
          placeholder={"0'-0\""}
        />
        {pending.errors.x && <span id="inspector-x-error" className="field-error">{pending.errors.x}</span>}
      </label>

      <label>
        <span>Channel</span>
        <input
          type="text"
          inputMode="numeric"
          value={draft.channel}
          onChange={e => updateDraft("channel", e.target.value)}
          onBlur={flushPending}
          aria-invalid={pending.errors.channel ? "true" : "false"}
          aria-describedby={pending.errors.channel ? "inspector-channel-error" : undefined}
        />
        {pending.errors.channel && <span id="inspector-channel-error" className="field-error">{pending.errors.channel}</span>}
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
            onBlur={flushPending}
            aria-invalid={pending.errors.universe ? "true" : "false"}
            aria-describedby={pending.errors.universe ? "inspector-universe-error" : undefined}
          />
          {pending.errors.universe && <span id="inspector-universe-error" className="field-error">{pending.errors.universe}</span>}
        </label>
        <label>
          <span>Address</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.address}
            onChange={e => updateDraft("address", e.target.value)}
            onBlur={flushPending}
            aria-invalid={pending.errors.address ? "true" : "false"}
            aria-describedby={pending.errors.address ? "inspector-address-error" : undefined}
          />
          {pending.errors.address && <span id="inspector-address-error" className="field-error">{pending.errors.address}</span>}
        </label>
        <span className="mono small muted">footprint {profile?.dmxFootprint ?? 1}</span>
      </fieldset>

      <label>
        <span>Color</span>
        <input
          type="text" placeholder="R02, R26, R119, ..."
          value={draft.color}
          onChange={e => updateDraft("color", e.target.value)}
          onBlur={flushPending}
        />
      </label>

      <label>
        <span>Status</span>
        <select
          value={draft.status}
          onChange={e => updateDraft("status", e.target.value)}
          onBlur={flushPending}
        >
          {FIXTURE_STATUS_OPTIONS.map(status => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Note</span>
        <textarea
          rows={2}
          value={draft.note}
          onChange={e => updateDraft("note", e.target.value)}
          onBlur={flushPending}
        />
      </label>

      <button className="btn-danger" type="button" onClick={() => onDelete(fx.id)}>Delete fixture</button>
    </section>
  );
}
