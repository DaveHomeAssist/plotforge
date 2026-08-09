import { useEffect, useMemo, useRef, useState } from "react";
import { queryFixtures } from "../domain/query.js";

/**
 * ⌘K palette: type a channel, unit, DMX pair, gel, instrument, position, or
 * status; Enter jumps the canvas to the fixture and selects it. Shift+Enter
 * adds every result to the current selection.
 *
 * The dialog mounts fresh on every open (wrapper returns null when closed),
 * so text/cursor state never needs effect-driven resets.
 */
export default function CommandPalette(props) {
  if (!props.open) return null;
  return <PaletteDialog {...props} />;
}

function PaletteDialog({ doc, onClose, onJumpToFixture, onSelectMany }) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const results = useMemo(() => queryFixtures(doc, text), [doc, text]);
  const active = results[Math.min(cursor, Math.max(results.length - 1, 0))] ?? null;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(event) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setCursor(c => Math.max(c - 1, 0)); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey && results.length) {
        onSelectMany(results.map(row => row.fixtureId));
        onClose();
        return;
      }
      if (active) {
        onJumpToFixture(active.fixtureId, { xMm: active.xMm, yMm: active.yMm });
        onClose();
      }
    }
  }

  return (
    <div className="palette-backdrop" onPointerDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Find fixture"
        onPointerDown={event => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Find: 412 · u3 · 1/41 · r80 · fresnel · 2nd elec…"
          value={text}
          onChange={event => { setText(event.target.value); setCursor(0); }}
          onKeyDown={handleKeyDown}
          aria-label="Fixture search"
        />
        <ul className="palette__results" role="listbox" aria-label="Matches">
          {results.map((row, index) => (
            <li key={row.fixtureId} role="option" aria-selected={index === cursor}>
              <button
                type="button"
                className={`palette__row${index === cursor ? " palette__row--active" : ""}`}
                onPointerEnter={() => setCursor(index)}
                onClick={() => { onJumpToFixture(row.fixtureId, { xMm: row.xMm, yMm: row.yMm }); onClose(); }}
              >
                <span className="palette__label">{row.label}</span>
                <span className="palette__detail mono small">{row.detail}</span>
              </button>
            </li>
          ))}
          {text.trim() && results.length === 0 && (
            <li className="palette__empty">No fixtures match “{text.trim()}”.</li>
          )}
        </ul>
        <div className="palette__hint mono small">
          ↑↓ move · Enter jump · Shift+Enter select all {results.length ? `(${results.length})` : ""} · Esc close
        </div>
      </div>
    </div>
  );
}
