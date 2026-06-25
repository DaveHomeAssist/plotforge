import { useEffect, useMemo, useState } from "react";
import { deserialize } from "../serialization.js";
import { listRegistryShows, readRegistryShow } from "../showRegistry.js";

function formatSavedAt(value) {
  if (!value) return "Current session";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function docSummary(doc) {
  return {
    fixtureCount: doc?.fixtureOrder?.length ?? 0,
    positionCount: doc?.positionOrder?.length ?? 0,
    venue: doc?.metadata?.venue || doc?.name || "Local show",
  };
}

function thumbnailRows(doc) {
  const positions = (doc?.positionOrder || []).slice(0, 3).map((id, index) => ({
    ...doc.positions[id],
    y: [28, 58, 88][index],
  }));
  return positions.map(position => {
    const fixtures = (doc.fixtureOrder || [])
      .map(id => doc.fixtures[id])
      .filter(fixture => fixture?.positionId === position.id)
      .slice(0, 9);
    const xs = fixtures.map(fixture => fixture.xMm);
    const min = Math.min(-6000, ...xs);
    const max = Math.max(6000, ...xs);
    return {
      id: position.id,
      y: position.y,
      dots: fixtures.map(fixture => {
        const t = (fixture.xMm - min) / Math.max(1, max - min);
        const profile = doc.fixtureProfiles?.[fixture.profileId];
        return {
          id: fixture.id,
          x: 24 + t * 152,
          fill: profile?.color || "var(--blue)",
        };
      }),
    };
  });
}

function PlotThumb({ doc }) {
  const rows = thumbnailRows(doc);
  return (
    <svg className="splash-thumb" viewBox="0 0 200 112" aria-hidden="true">
      <line className="splash-thumb__center" x1="100" y1="8" x2="100" y2="104" />
      {rows.map(row => (
        <g key={row.id}>
          <line className="splash-thumb__pipe" x1="18" y1={row.y} x2="182" y2={row.y} />
          {row.dots.map(dot => (
            <circle key={dot.id} cx={dot.x} cy={row.y - 8} r="3" fill={dot.fill} />
          ))}
        </g>
      ))}
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v3M12 18v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M3 12h3M18 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export default function SplashScreen({
  doc,
  theme,
  onToggleTheme,
  onStart,
  onOpen,
  onLoadShow,
  onImportDoc,
}) {
  const [shows, setShows] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    let active = true;
    listRegistryShows()
      .then(records => { if (active) setShows(records); })
      .catch(err => { if (active) setError(err?.message || "Saved shows unavailable."); });
    return () => { active = false; };
  }, []);

  const currentSummary = useMemo(() => docSummary(doc), [doc]);
  const cards = useMemo(() => [
    {
      id: "current",
      name: doc.name || "Untitled Plot",
      venue: currentSummary.venue,
      fixtureCount: currentSummary.fixtureCount,
      positionCount: currentSummary.positionCount,
      savedAt: null,
      doc,
      source: "Current",
    },
    ...shows.map(show => ({
      id: show.id,
      name: show.name,
      venue: show.doc?.metadata?.venue || show.doc?.name || "Saved show",
      fixtureCount: show.fixtureCount,
      positionCount: show.positionCount,
      savedAt: show.savedAt,
      doc: show.doc,
      source: "Saved",
    })),
  ], [currentSummary, doc, shows]);

  async function openFile() {
    setStatus("Opening file...");
    setError("");
    const result = await onOpen();
    if (!result?.ok && !result?.aborted) setError(result?.error?.message || "No file opened.");
    if (result?.aborted) setStatus("");
  }

  async function loadSavedShow(id) {
    setStatus("Loading show...");
    setError("");
    try {
      const record = await readRegistryShow(id);
      if (!record) throw new Error("Saved show not found.");
      onLoadShow(record.doc);
    } catch (err) {
      setError(err?.message || "Could not load that show.");
      setStatus("");
    }
  }

  async function importDroppedFile(event) {
    event.preventDefault();
    setDragOver(false);
    setStatus("Importing file...");
    setError("");
    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      setStatus("");
      return;
    }
    try {
      const text = await file.text();
      onImportDoc(deserialize(text));
    } catch (err) {
      setError(err?.message || "Could not import that file.");
      setStatus("");
    }
  }

  return (
    <section
      className={`splash ${dragOver ? "splash--drag" : ""}`}
      aria-labelledby="splash-title"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={importDroppedFile}
    >
      <header className="splash-topbar">
        <div className="splash-brand">
          <span className="splash-logo" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M5 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".58" />
              <circle cx="16" cy="18" r="2.4" fill="currentColor" />
            </svg>
          </span>
          <strong>PlotForge</strong>
          <span className="splash-badge mono">BETA</span>
        </div>
        <div className="splash-topbar__actions">
          <button type="button" className="btn-compact theme-button" onClick={onToggleTheme} aria-pressed={theme === "light"}>
            <ThemeIcon />
            {theme === "light" ? "Light" : "Dark"}
          </button>
          <button type="button" className="btn-compact" onClick={openFile}>Open .plot</button>
        </div>
      </header>

      <div className="splash-shell">
        <aside className="splash-nav" aria-label="PlotForge launch">
          <span className="mono small">LIBRARY</span>
          <button type="button" className="splash-nav__item splash-nav__item--active">Recent</button>
          <button type="button" className="splash-nav__item" onClick={onStart}>Editor</button>
          <button type="button" className="splash-nav__item" onClick={openFile}>Import</button>
          <div className="splash-nav__foot">
            <span className="splash-status-dot" aria-hidden="true" />
            <span className="mono small">Local first</span>
          </div>
        </aside>

        <main className="splash-main">
          <div className="splash-hero">
            <div>
              <p className="mono small splash-kicker">GOOD TO GO</p>
              <h1 id="splash-title">Pick up a lighting plot.</h1>
              <p>{currentSummary.fixtureCount} fixtures and {currentSummary.positionCount} positions are ready in the current document.</p>
            </div>
            <div className="splash-quick-actions">
              <button type="button" className="splash-action splash-action--primary" onClick={onStart}>
                <span>Open editor</span>
                <small>Current document</small>
              </button>
              <button type="button" className="splash-action" onClick={openFile}>
                <span>Open .plot</span>
                <small>From this device</small>
              </button>
              <button type="button" className="splash-action" onClick={onToggleTheme}>
                <span>{theme === "light" ? "Use dark" : "Use light"}</span>
                <small>Appearance</small>
              </button>
            </div>
          </div>

          <div className="splash-section-heading">
            <span className="mono small">RECENT PLOTS</span>
            <span className="mono small">{cards.length}</span>
          </div>

          <div className="splash-grid">
            {cards.map(card => (
              <article className="splash-card" key={card.id}>
                <div className="splash-card__preview">
                  <PlotThumb doc={card.doc} />
                  <span className="splash-card__source mono">{card.source}</span>
                </div>
                <div className="splash-card__body">
                  <div>
                    <h2>{card.name}</h2>
                    <p>{card.venue}</p>
                  </div>
                  <div className="splash-card__meta mono">
                    <span>{card.fixtureCount} fix</span>
                    <span>{card.positionCount} pos</span>
                    <span>{formatSavedAt(card.savedAt)}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-compact"
                    onClick={() => card.id === "current" ? onStart() : loadSavedShow(card.id)}
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </div>

          {shows.length === 0 && (
            <p className="splash-empty">No saved registry shows yet. Use the editor registry panel to save show snapshots.</p>
          )}
          {status && <p className="library-status">{status}</p>}
          {error && <p className="library-status library-status--error">{error}</p>}
        </main>
      </div>

      {dragOver && (
        <div className="splash-drop" aria-hidden="true">
          <span>Drop .plot to import</span>
        </div>
      )}
    </section>
  );
}
