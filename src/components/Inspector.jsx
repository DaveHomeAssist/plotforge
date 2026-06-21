import { getProfile } from "../domain/profiles.js";
import { formatImperial } from "../domain/units.js";

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
  const profile = getProfile(fx.profileId, doc.fixtureProfiles);
  const position = doc.positions[fx.positionId];

  return (
    <section className="inspector">
      <header>
        <span className="mono small">UNIT</span>
        <h3>{fx.unitNumber ?? "—"} <span className="muted small">· {profile?.model}</span></h3>
        <span className="mono small">{position?.name} · {formatImperial(fx.xMm)}</span>
      </header>

      <label>
        <span>Channel</span>
        <input
          type="number" min="1" max="9999"
          value={fx.channel ?? ""}
          onChange={e => onChange(fx.id, { channel: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </label>

      <fieldset>
        <legend>DMX</legend>
        <label>
          <span>Universe</span>
          <input
            type="number" min="1" max="63"
            value={fx.dmx?.universe ?? ""}
            onChange={e => {
              const universe = e.target.value === "" ? null : Number(e.target.value);
              onChange(fx.id, { dmx: universe == null ? null : { universe, address: fx.dmx?.address ?? 1 } });
            }}
          />
        </label>
        <label>
          <span>Address</span>
          <input
            type="number" min="1" max="512"
            value={fx.dmx?.address ?? ""}
            onChange={e => {
              const address = e.target.value === "" ? null : Number(e.target.value);
              if (fx.dmx?.universe == null) return;
              onChange(fx.id, { dmx: { universe: fx.dmx.universe, address } });
            }}
          />
        </label>
        <span className="mono small muted">footprint {profile?.dmxFootprint ?? 1}</span>
      </fieldset>

      <label>
        <span>Color</span>
        <input
          type="text" placeholder="R02, R26, R119, …"
          value={fx.color ?? ""}
          onChange={e => onChange(fx.id, { color: e.target.value })}
        />
      </label>

      <label>
        <span>Note</span>
        <textarea
          rows={2}
          value={fx.note ?? ""}
          onChange={e => onChange(fx.id, { note: e.target.value })}
        />
      </label>

      <button className="btn-danger" type="button" onClick={() => onDelete(fx.id)}>Delete fixture</button>
    </section>
  );
}
