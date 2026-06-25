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

const TEMPLATE_CARDS = [
  {
    id: "template-rep",
    name: "Rep plot starter",
    venue: "3 electrics, FOH, patch-ready seed",
    fixtureCount: 18,
    positionCount: 4,
    source: "Template",
  },
  {
    id: "template-corporate",
    name: "Corporate ballroom",
    venue: "Truss, scenic wash, speaker specials",
    fixtureCount: 24,
    positionCount: 5,
    source: "Template",
  },
  {
    id: "template-focus",
    name: "Focus session",
    venue: "Channel-first focus workflow",
    fixtureCount: 32,
    positionCount: 6,
    source: "Template",
  },
];

const SHARED_CARDS = [
  {
    id: "shared-library",
    name: "Fixture exchange",
    venue: "Profiles, gel palettes, and template plots",
    fixtureCount: 0,
    positionCount: 0,
    source: "Planned",
  },
];

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
  const [section, setSection] = useState("recent");
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    let active = true;
    listRegistryShows()
      .then(records => { if (active) setShows(records); })
      .catch(err => { if (active) setError(err?.message || "Saved shows unavailable."); });
    return () => { active = false; };
  }, []);

  const currentSummary = useMemo(() => docSummary(doc), [doc]);
  const recentCards = useMemo(() => [
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
  const archivedCards = useMemo(() => shows
    .filter(show => show.archived)
    .map(show => ({
      id: show.id,
      name: show.name,
      venue: show.doc?.metadata?.venue || show.doc?.name || "Archived show",
      fixtureCount: show.fixtureCount,
      positionCount: show.positionCount,
      savedAt: show.savedAt,
      doc: show.doc,
      source: "Archive",
    })), [shows]);

  const cards = useMemo(() => {
    if (section === "templates") return TEMPLATE_CARDS.map(card => ({ ...card, doc }));
    if (section === "shared") return SHARED_CARDS.map(card => ({ ...card, doc }));
    if (section === "archive") return archivedCards;
    return recentCards;
  }, [archivedCards, doc, recentCards, section]);

  const navItems = [
    { id: "recent", label: "Recent", count: recentCards.length },
    { id: "templates", label: "Templates", count: TEMPLATE_CARDS.length },
    { id: "shared", label: "Shared", count: SHARED_CARDS.length },
    { id: "archive", label: "Archive", count: archivedCards.length },
  ];

  const sectionTitle = {
    recent: "RECENT PLOTS",
    templates: "TEMPLATES",
    shared: "SHARED",
    archive: "ARCHIVE",
  }[section];

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

  function openCard(card) {
    if (card.id === "current" || card.source === "Template" || card.source === "Planned") {
      onStart();
      return;
    }
    loadSavedShow(card.id);
  }

  function signIn() {
    setSignedIn(true);
    setSignInOpen(false);
    setAccountOpen(false);
    setEmailDraft("");
  }

  function closeMenus() {
    setAccountOpen(false);
    setSettingsOpen(false);
    setSignInOpen(false);
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
          <button
            type="button"
            className="btn-compact"
            onClick={() => {
              setSettingsOpen(current => !current);
              setAccountOpen(false);
              setSignInOpen(false);
            }}
            aria-expanded={settingsOpen}
          >
            Settings
          </button>
          <button
            type="button"
            className="splash-account-button"
            onClick={() => {
              if (!signedIn) {
                setSignInOpen(true);
                setAccountOpen(false);
                setSettingsOpen(false);
                return;
              }
              setAccountOpen(current => !current);
              setSettingsOpen(false);
              setSignInOpen(false);
            }}
            aria-expanded={accountOpen || signInOpen}
          >
            {signedIn ? "DR" : "Sign in"}
          </button>
        </div>
      </header>

      <div className="splash-shell">
        <aside className="splash-nav" aria-label="PlotForge launch">
          <span className="mono small">LIBRARY</span>
          {navItems.map(item => (
            <button
              type="button"
              key={item.id}
              className={`splash-nav__item${section === item.id ? " splash-nav__item--active" : ""}`}
              onClick={() => {
                setSection(item.id);
                closeMenus();
              }}
            >
              <span>{item.label}</span>
              <span className="mono">{item.count}</span>
            </button>
          ))}
          <button type="button" className="splash-nav__item" onClick={onStart}>
            <span>Editor</span>
            <span className="mono">GO</span>
          </button>
          <button type="button" className="splash-nav__item" onClick={openFile}>
            <span>Import</span>
            <span className="mono">.plot</span>
          </button>
          <div className="splash-nav__foot">
            <span className="splash-status-dot" aria-hidden="true" />
            <span className="mono small">Local workspace</span>
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
            <span className="mono small">{sectionTitle}</span>
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
                    onClick={() => openCard(card)}
                  >
                    Open
                  </button>
                </div>
              </article>
            ))}
          </div>

          {cards.length === 0 && (
            <p className="splash-empty">No items in this section yet.</p>
          )}
          {section === "recent" && shows.length === 0 && (
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

      {settingsOpen && (
        <div className="splash-popover splash-popover--settings" role="dialog" aria-label="Launch settings">
          <div className="splash-popover__head">
            <strong>Settings</strong>
            <button type="button" className="btn-compact" onClick={closeMenus}>Close</button>
          </div>
          <dl className="splash-setting-list">
            <div>
              <dt>Appearance</dt>
              <dd>{theme === "light" ? "Light" : "Dark"}</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>Browser registry</dd>
            </div>
            <div>
              <dt>File import</dt>
              <dd>.plot drag and drop</dd>
            </div>
          </dl>
        </div>
      )}

      {accountOpen && (
        <div className="splash-popover splash-popover--account" role="dialog" aria-label="Account menu">
          <div className="splash-account-card">
            <span className="splash-account-avatar">DR</span>
            <div>
              <strong>Dave Robertson</strong>
              <span>Lighting Designer</span>
            </div>
          </div>
          <button type="button" className="splash-menu-row" onClick={() => setSection("shared")}>Shared libraries</button>
          <button type="button" className="splash-menu-row" onClick={() => setSection("templates")}>Template plots</button>
          <button type="button" className="splash-menu-row" onClick={() => setSignedIn(false)}>Sign out</button>
        </div>
      )}

      {signInOpen && (
        <div className="splash-modal" role="dialog" aria-modal="true" aria-labelledby="splash-signin-title">
          <div className="splash-modal__panel">
            <div className="splash-popover__head">
              <div>
                <p className="mono small splash-kicker">ACCOUNT</p>
                <h2 id="splash-signin-title">Sign in to PlotForge</h2>
              </div>
              <button type="button" className="btn-compact" onClick={closeMenus}>Close</button>
            </div>
            <label className="splash-signin-field">
              <span>Email</span>
              <input
                type="email"
                value={emailDraft}
                onChange={event => setEmailDraft(event.target.value)}
                placeholder="dave@example.com"
              />
            </label>
            <div className="splash-modal__actions">
              <button type="button" className="splash-action splash-action--primary" onClick={signIn}>
                <span>Continue</span>
                <small>Prototype account state</small>
              </button>
              <button type="button" className="splash-action" onClick={closeMenus}>
                <span>Stay local</span>
                <small>Keep working in this browser</small>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
