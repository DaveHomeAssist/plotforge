import { useEffect, useState } from "react";
import PlotCanvas from "./components/PlotCanvas.jsx";
import ProjectMetadata from "./components/ProjectMetadata.jsx";
import RevisionsPanel from "./components/RevisionsPanel.jsx";
import Inspector from "./components/Inspector.jsx";
import SaveStatus from "./components/SaveStatus.jsx";
import PositionEditor from "./components/PositionEditor.jsx";
import FixtureLibrary from "./components/FixtureLibrary.jsx";
import PatchTable from "./components/PatchTable.jsx";
import GelPalette from "./components/GelPalette.jsx";
import CircuitPanel from "./components/CircuitPanel.jsx";
import CommentPins from "./components/CommentPins.jsx";
import InteropPanel from "./components/InteropPanel.jsx";
import OscBridgePanel from "./components/OscBridgePanel.jsx";
import ShowRegistryPanel from "./components/ShowRegistryPanel.jsx";
import PlotStarterPanel from "./components/PlotStarterPanel.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import ConflictPanel from "./components/ConflictPanel.jsx";
import SelectionTools from "./components/SelectionTools.jsx";
import PrintExport from "./components/PrintExport.jsx";
import DraftRecoveryBanner from "./components/DraftRecoveryBanner.jsx";
import TextSettingsPanel from "./components/TextSettingsPanel.jsx";
import useShowDoc from "./hooks/useShowDoc.js";
import { newShow, newPosition, newFixture, addPosition, addFixture } from "./domain/show.js";
import { feetToMm } from "./domain/units.js";
import "./PlotForge.css";
import "./InspectorUx.css";

export function seedShow() {
  let doc = newShow({ name: "Studio A · Spike" });
  const [elec1, elec2, foh] = [
    newPosition({ name: "1ST ELEC", kind: "pipe", yMm: feetToMm(-8), lengthMm: feetToMm(28), trimMm: feetToMm(22) }),
    newPosition({ name: "2ND ELEC", kind: "pipe", yMm: feetToMm(-14), lengthMm: feetToMm(28), trimMm: feetToMm(22) }),
    newPosition({ name: "FOH TRUSS", kind: "truss", yMm: feetToMm(8), lengthMm: feetToMm(30), trimMm: feetToMm(28) })
  ];
  [elec1, elec2, foh].forEach(position => { doc = addPosition(doc, position); });
  [-12, -6, 0, 6, 12].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: elec1.id, profileId: "s4_26", xMm: feetToMm(feet), channel: 11 + i, dmx: { universe: 1, address: 41 + i * 4 }, color: "R02", circuit: `A${i + 1}`, dimmer: `D${i + 1}` }));
  });
  [-9, 0, 9].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: elec2.id, profileId: "fresnel", xMm: feetToMm(feet), channel: 31 + i, dmx: { universe: 1, address: 121 + i * 4 }, color: "R119", circuit: `B${i + 1}`, dimmer: `D${i + 11}` }));
  });
  [-10, 10].forEach((feet, i) => {
    doc = addFixture(doc, newFixture({ positionId: foh.id, profileId: "spot_mh", xMm: feetToMm(feet), channel: 201 + i, dmx: { universe: 2, address: 1 + i * 24 }, circuit: `C${i + 1}`, dimmer: `D${i + 21}` }));
  });
  return doc;
}

const TOOL_STORAGE_KEY = "plotforge-active-tool";
const DEFAULT_TOOL = "inspect";
const TOOL_DEFINITIONS = [
  { id: "inspect", label: "Inspect", eyebrow: "Selection", description: "Selected fixture fields and selection controls." },
  { id: "fixtures", label: "Fixtures", eyebrow: "Library", description: "Fixture profiles, source lanes, and add flow." },
  { id: "setup", label: "Setup", eyebrow: "Show", description: "Title block, revisions, venue, and positions." },
  { id: "patch", label: "Patch", eyebrow: "Paperwork", description: "Patch table, gels, and CSV exports." },
  { id: "notes", label: "Notes", eyebrow: "Plot notes", description: "Comment pins and handoff notes." },
  { id: "checks", label: "Checks", eyebrow: "Review", description: "Conflicts, circuit health, and issue review." },
  { id: "export", label: "Export", eyebrow: "Output", description: "Print, interop manifest, and OSC outputs." },
  { id: "files", label: "Files", eyebrow: "Session", description: "Open, save, share, registry, and recovery." },
  { id: "wizard", label: "Wizard", eyebrow: "Starter", description: "Guided plot starter with editable fixture plan." },
];
const TOOL_IDS = new Set(TOOL_DEFINITIONS.map(tool => tool.id));

function fixtureStatusCounts(doc) {
  return doc.fixtureOrder.reduce((counts, fixtureId) => {
    const status = doc.fixtures[fixtureId]?.status || "planned";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function buildHandoffSummary(doc, conflicts) {
  const metadata = doc.metadata || {};
  const statusCounts = fixtureStatusCounts(doc);
  const positions = doc.positionOrder
    .map(positionId => doc.positions[positionId]?.name)
    .filter(Boolean)
    .join(", ");
  const statusLine = Object.entries(statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ") || "none";

  return [
    `PlotForge handoff: ${doc.name || "Untitled Plot"}`,
    `Venue: ${metadata.venueName || metadata.venue || "Not set"}`,
    `Drawing: ${metadata.drawingTitle || "Lighting Plot"}`,
    `Revision: ${metadata.revision || "Not set"}`,
    `Scale: ${metadata.scaleLabel || "Not set"}`,
    `Fixtures: ${doc.fixtureOrder.length}`,
    `Positions: ${doc.positionOrder.length}${positions ? ` (${positions})` : ""}`,
    `Fixture status: ${statusLine}`,
    `Patch health: ${conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}` : "DMX clear"}`,
    `Comments: ${doc.commentPinOrder?.length || 0}`,
    `Generated: ${new Date().toLocaleString()}`,
  ].join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

function HandoffExport({ doc, conflicts }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const summary = buildHandoffSummary(doc, conflicts);

  async function onCopySummary() {
    setStatus("");
    setError("");
    try {
      await copyText(summary);
      setStatus("Handoff copied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handoff copy failed.");
    }
  }

  return (
    <section className="handoff-panel" aria-labelledby="handoff-export-title">
      <div className="panel-header">
        <div>
          <span className="mono small">HANDOFF</span>
          <h3 id="handoff-export-title">Handoff summary</h3>
        </div>
        <button type="button" className="btn-compact" onClick={onCopySummary}>Copy</button>
      </div>
      <div className="handoff-panel__summary mono small">
        <span>{doc.fixtureOrder.length} fixtures</span>
        <span>{conflicts.length ? `${conflicts.length} conflicts` : "DMX clear"}</span>
      </div>
      <pre className="handoff-preview">{summary}</pre>
      {status && <p className="library-status">{status}</p>}
      {error && <p className="library-status library-status--error">{error}</p>}
    </section>
  );
}

export default function PlotForge() {
  const show = useShowDoc(seedShow);
  const onSave = show.onSave;
  const [showSplash, setShowSplash] = useState(true);
  const [activeTool, setActiveTool] = useState(() => {
    try {
      const stored = localStorage.getItem(TOOL_STORAGE_KEY);
      if (stored === "ai") return "wizard";
      if (TOOL_IDS.has(stored)) return stored;
    } catch {
      // Ignore storage failures.
    }
    return DEFAULT_TOOL;
  });
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("plotforge-theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // Ignore storage failures.
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "light" ? "#f4f7fb" : "#0a0d12",
    );
    try {
      localStorage.setItem("plotforge-theme", theme);
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(TOOL_STORAGE_KEY, activeTool);
    } catch {
      // Ignore storage failures.
    }
  }, [activeTool]);

  useEffect(() => {
    if (!show.recovery.draft) return undefined;
    const timer = window.setTimeout(() => setActiveTool("files"), 0);
    return () => window.clearTimeout(timer);
  }, [show.recovery.draft]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      onSave();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  async function openFromSplash() {
    const result = await show.onOpen();
    if (result?.ok) setShowSplash(false);
    return result;
  }

  function loadIntoEditor(doc) {
    show.onLoadShow(doc);
    setShowSplash(false);
  }

  async function openInEditor() {
    const result = await show.onOpen();
    if (result?.ok) setActiveTool("files");
    return result;
  }

  function handleSelectFixture(fixtureId, options) {
    show.onSelectFixture(fixtureId, options);
    if (fixtureId) setActiveTool("inspect");
  }

  function handleSelectPosition(positionId) {
    show.onSelectPosition(positionId);
    if (positionId) setActiveTool("setup");
  }

  function handleSelectCommentPin(commentPinId) {
    show.onSelectCommentPin(commentPinId);
    if (commentPinId) setActiveTool("notes");
  }

  function handleAddCommentPin(point) {
    show.onAddCommentPin(point);
    setActiveTool("notes");
  }

  function handleLoadShow(doc) {
    show.onLoadShow(doc);
    setActiveTool("files");
  }

  const activeToolMeta = TOOL_DEFINITIONS.find(tool => tool.id === activeTool) ?? TOOL_DEFINITIONS[0];
  const toolBadges = {
    inspect: show.selectedFixtureIds.length ? String(show.selectedFixtureIds.length) : "",
    patch: show.conflicts.length ? String(show.conflicts.length) : "",
    checks: show.conflicts.length ? String(show.conflicts.length) : "",
    files: show.saveStatus.state === "unsaved" ? "dirty" : show.saveStatus.state === "error" ? "!" : "",
  };

  function renderActiveTool() {
    switch (activeTool) {
      case "fixtures":
        return (
          <FixtureLibrary
            doc={show.doc}
            selectedPositionId={show.selectedPositionId}
            onAddFixture={show.onAddFixture}
            onImportOpenFixtureLibraryProfile={show.onImportOpenFixtureLibraryProfile}
          />
        );
      case "setup":
        return (
          <>
            <ProjectMetadata
              doc={show.doc}
              onShowNameChange={show.onShowNameChange}
              onProjectMetadataChange={show.onProjectMetadataChange}
            />
            <RevisionsPanel
              doc={show.doc}
              onAddRevision={show.onAddRevision}
              onActivateRevision={show.onActivateRevision}
            />
            <TextSettingsPanel
              doc={show.doc}
              onChange={show.onLabelSettingsChange}
            />
            <PositionEditor
              doc={show.doc}
              selectedPositionId={show.selectedPositionId}
              onSelectPosition={handleSelectPosition}
              onAddPosition={show.onAddPosition}
              onVenueChange={show.onVenueChange}
              onPositionChange={show.onPositionChange}
              onDeletePosition={show.onPositionDelete}
            />
          </>
        );
      case "patch":
        return (
          <>
            <PatchTable doc={show.doc} />
            <GelPalette doc={show.doc} />
          </>
        );
      case "notes":
        return (
          <CommentPins
            doc={show.doc}
            selectedCommentPinId={show.selectedCommentPinId}
            onSelectCommentPin={handleSelectCommentPin}
            onChange={show.onCommentPinChange}
            onDelete={show.onCommentPinDelete}
          />
        );
      case "checks":
        return (
          <>
            <ConflictPanel doc={show.doc} onRevealFixture={handleSelectFixture} />
            <CircuitPanel doc={show.doc} />
          </>
        );
      case "export":
        return (
          <>
            <HandoffExport doc={show.doc} conflicts={show.conflicts} />
            <PrintExport doc={show.doc} />
            <InteropPanel doc={show.doc} />
            <OscBridgePanel
              doc={show.doc}
              selectedFixtureId={show.selectedFixtureId}
              onBridgeChange={show.onOscBridgeChange}
            />
          </>
        );
      case "files":
        return (
          <>
            <section className="file-actions-panel" aria-labelledby="file-actions-title">
              <div className="panel-header">
                <div>
                  <span className="mono small">SESSION</span>
                  <h3 id="file-actions-title">Files</h3>
                </div>
                <SaveStatus status={show.saveStatus} onRetry={show.onSave} />
              </div>
              <div className="file-actions-grid">
                <button type="button" className="btn-compact" onClick={openInEditor}>Open .plot</button>
                <button type="button" className="btn-compact" onClick={show.onSave}>Save .plot</button>
                <button type="button" className="btn-compact" onClick={() => setShowSplash(true)}>Start screen</button>
              </div>
              {show.recovery.draft && (
                <DraftRecoveryBanner onRestore={show.onRestoreDraft} onDismiss={show.recovery.dismissDraft} />
              )}
            </section>
            <ShowRegistryPanel doc={show.doc} onLoadShow={handleLoadShow} />
          </>
        );
      case "wizard":
        return <PlotStarterPanel doc={show.doc} onApplyStarter={show.onApplyPlotStarterPlan} />;
      case "inspect":
      default:
        return (
          <>
            <SelectionTools
              doc={show.doc}
              selectedFixtureId={show.selectedFixtureId}
              selectedFixtureIds={show.selectedFixtureIds}
              onAlignSelectedFixtures={show.onAlignSelectedFixtures}
              onDistributeSelectedFixtures={show.onDistributeSelectedFixtures}
              onClearSelection={show.onClearFixtureSelection}
            />
            <Inspector
              doc={show.doc}
              fixtureId={show.selectedFixtureId}
              selectedFixtureIds={show.selectedFixtureIds}
              onChange={show.onFixtureChange}
              onDelete={show.onFixtureDelete}
            />
          </>
        );
    }
  }

  if (showSplash) {
    return (
      <div className="app app--splash" data-theme={theme}>
        <SplashScreen
          doc={show.doc}
          theme={theme}
          onToggleTheme={() => setTheme(current => current === "light" ? "dark" : "light")}
          onStart={() => setShowSplash(false)}
          onOpen={openFromSplash}
          onLoadShow={loadIntoEditor}
          onImportDoc={loadIntoEditor}
        />
      </div>
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="brand">
          <strong>PlotForge</strong>
          <span className="mono small">spike · v0.1</span>
        </div>
        <nav className="topbar-actions">
          <button type="button" onClick={() => show.history.undo()} disabled={!show.history.undoN}>Undo</button>
          <button type="button" onClick={() => show.history.redo()} disabled={!show.history.redoN}>Redo</button>
          <span className="sep" />
          <button
            type="button"
            onClick={() => setTheme(current => current === "light" ? "dark" : "light")}
            aria-pressed={theme === "light"}
            className="theme-button"
          >
            {theme === "light" ? "Light" : "Dark"}
          </button>
          <button type="button" onClick={() => setShowSplash(true)}>Home</button>
          <span className="sep" />
          <SaveStatus status={show.saveStatus} onRetry={show.onSave} />
          <button type="button" onClick={openInEditor}>Open…</button>
          <button type="button" onClick={show.onSave} className="btn-primary">Save .plot</button>
        </nav>
      </header>

      <main className="workbench">
        <PlotCanvas
          doc={show.doc}
          selectedFixtureId={show.selectedFixtureId}
          selectedFixtureIds={show.selectedFixtureIds}
          selectedPositionId={show.selectedPositionId}
          selectedCommentPinId={show.selectedCommentPinId}
          onSelectFixture={handleSelectFixture}
          onSelectPosition={handleSelectPosition}
          onSelectCommentPin={handleSelectCommentPin}
          onMoveFixture={show.onMoveFixture}
          onSetFixtureFocus={show.onSetFixtureFocus}
          onClearFixtureFocus={show.onClearFixtureFocus}
          onAddCommentPin={handleAddCommentPin}
        />
        <aside className="sidepanel">
          <section className="console-overview" aria-label="PlotForge console summary">
            <div>
              <span className="mono small">CONSOLE</span>
              <h2>{show.doc.name || "Untitled Plot"}</h2>
              <p>{show.doc.metadata?.venue || "Browser workspace"} | {show.totalFixtures} fixtures | {show.doc.positionOrder.length} positions</p>
            </div>
            <div className="console-overview__stats">
              <span className={show.saveStatus.state === "error" ? "console-pill console-pill--bad" : "console-pill"}>
                {show.saveStatus.state === "saved" ? (show.saveStatus.mode || ".plot") : show.saveStatus.state}
              </span>
              <span className={show.conflicts.length ? "console-pill console-pill--warn" : "console-pill console-pill--good"}>
                {show.conflicts.length ? `${show.conflicts.length} conflicts` : "DMX clear"}
              </span>
              <span className="console-pill">{show.selectedFixtureIds.length || 0} selected</span>
            </div>
          </section>
          <div className="tool-workspace">
            <nav className="tool-rail" aria-label="Sidebar tools" role="tablist">
              {TOOL_DEFINITIONS.map(tool => {
                const selected = activeTool === tool.id;
                const badge = toolBadges[tool.id];
                return (
                  <button
                    key={tool.id}
                    id={`tool-tab-${tool.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`tool-panel-${tool.id}`}
                    className={`tool-tab${selected ? " tool-tab--active" : ""}${badge ? " tool-tab--badged" : ""}`}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <span className="tool-tab__label">{tool.label}</span>
                    <span className="tool-tab__meta">{tool.eyebrow}</span>
                    {badge && <span className="tool-tab__badge">{badge}</span>}
                  </button>
                );
              })}
            </nav>
            <section
              className="tool-panel"
              id={`tool-panel-${activeTool}`}
              role="tabpanel"
              aria-labelledby={`tool-tab-${activeTool}`}
            >
              <header className="tool-panel__header">
                <div>
                  <span className="mono small">{activeToolMeta.eyebrow.toUpperCase()}</span>
                  <h2>{activeToolMeta.label}</h2>
                  <p>{activeToolMeta.description}</p>
                </div>
              </header>
              <div className="tool-panel__body">
                {renderActiveTool()}
              </div>
            </section>
          </div>
        </aside>
      </main>

      <footer className="statusbar">
        <span>{show.totalFixtures} fixtures</span>
        <span className="sep" />
        <span>{show.doc.positionOrder.length} positions</span>
        <span className="sep" />
        <span className={show.conflicts.length ? "status-bad" : "status-ok"}>
          {show.conflicts.length ? `${show.conflicts.length} DMX conflict${show.conflicts.length > 1 ? "s" : ""}` : "DMX OK"}
        </span>
        <span className="sep" />
        <span className="muted small">drag fixtures along their pipe · scroll to zoom · drag empty area to pan</span>
      </footer>

      <nav className="mobile-dock" aria-label="Mobile workspace sections">
        <button type="button" aria-pressed={activeTool === "inspect"} onClick={() => setActiveTool("inspect")}>Inspect</button>
        <button type="button" aria-pressed={activeTool === "fixtures"} onClick={() => setActiveTool("fixtures")}>Fixtures</button>
        <button type="button" aria-pressed={activeTool === "patch"} onClick={() => setActiveTool("patch")}>Patch</button>
        <button type="button" aria-pressed={activeTool === "wizard"} onClick={() => setActiveTool("wizard")}>Wizard</button>
        <button type="button" aria-pressed={activeTool === "files"} onClick={() => setActiveTool("files")}>Files</button>
      </nav>
    </div>
  );
}
