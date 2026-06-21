import { useMemo, useRef, useState } from "react";
import {
  getFixtureProfileLibrary,
  getProfileSearchText,
} from "../domain/profiles.js";

const LANES = [
  ["curated-gdtf", "GDTF"],
  ["ofl-import", "OFL"],
  ["legacy", "Legacy"],
];

function sourceLane(profile) {
  if (profile.libraryTier === "ofl-import") return "ofl-import";
  if (profile.libraryTier === "legacy") return "legacy";
  return "curated-gdtf";
}

function formatSource(profile) {
  if (profile.source?.type === "gdtf-share") {
    return `GDTF ${profile.source.fixtureId}.${profile.source.revisionId}`;
  }
  if (profile.source?.type === "open-fixture-library") {
    return "OFL JSON";
  }
  return "Spike seed";
}

export default function FixtureLibrary({
  doc,
  selectedPositionId,
  onAddFixture,
  onImportOpenFixtureLibraryProfile,
}) {
  const inputRef = useRef(null);
  const [lane, setLane] = useState("curated-gdtf");
  const [query, setQuery] = useState("");
  const [importState, setImportState] = useState(null);

  const profiles = useMemo(() => getFixtureProfileLibrary(doc.fixtureProfiles), [doc.fixtureProfiles]);
  const categories = useMemo(() => (
    [...new Set(profiles.filter(profile => sourceLane(profile) === lane).map(profile => profile.category))]
      .sort((a, b) => a.localeCompare(b))
  ), [profiles, lane]);
  const [category, setCategory] = useState("all");

  const visibleProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter(profile => {
      if (sourceLane(profile) !== lane) return false;
      if (category !== "all" && profile.category !== category) return false;
      if (!needle) return true;
      return getProfileSearchText(profile).includes(needle);
    });
  }, [profiles, lane, category, query]);

  const onImportClick = () => inputRef.current?.click();

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const oflFixture = JSON.parse(text);
      const result = onImportOpenFixtureLibraryProfile(oflFixture, {
        fileName: file.name,
        fixtureKey: file.name.replace(/\.json$/i, ""),
      });

      if (!result.ok) throw result.error;

      setLane("ofl-import");
      setCategory("all");
      setQuery("");
      setImportState({ type: "ok", message: `${result.profile.manufacturer} ${result.profile.model}` });
    } catch (error) {
      setImportState({ type: "error", message: error?.message || "Import failed" });
    } finally {
      event.target.value = "";
    }
  };

  const hasPosition = Boolean(selectedPositionId && doc.positions[selectedPositionId]);

  return (
    <section className="fixture-library">
      <div className="panel-section">
        <div className="section-heading">
          <span className="mono small">FIXTURE LIBRARY</span>
          <button type="button" className="btn-compact" onClick={onImportClick}>Import OFL</button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            onChange={onImportFile}
          />
        </div>

        <div className="segmented-control" aria-label="Fixture source">
          {LANES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={lane === value ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
              onClick={() => {
                setLane(value);
                setCategory("all");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="library-filters">
          <label>
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span>Type</span>
            <select value={category} onChange={event => setCategory(event.target.value)}>
              <option value="all">All</option>
              {categories.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {importState && (
          <p className={importState.type === "error" ? "library-status library-status--error" : "library-status"}>
            {importState.message}
          </p>
        )}
      </div>

      <div className="fixture-profile-list" role="list" aria-label="Fixture profiles">
        {visibleProfiles.map(profile => (
          <div className="fixture-profile-row" role="listitem" key={profile.id}>
            <span className="fixture-profile-row__main">
              <strong>{profile.model}</strong>
              <em>{profile.manufacturer}</em>
            </span>
            <span className="fixture-profile-row__meta">
              <span className="mono small">{profile.defaultMode}</span>
              <span className="mono small">{profile.dmxFootprint}ch · {profile.category}</span>
              <span className="mono small muted">{formatSource(profile)}</span>
            </span>
            <button
              type="button"
              className="btn-compact"
              disabled={!hasPosition}
              onClick={() => onAddFixture(selectedPositionId, profile.id)}
            >
              Add
            </button>
          </div>
        ))}
        {visibleProfiles.length === 0 && (
          <p className="empty-note">No profiles in this lane.</p>
        )}
      </div>
    </section>
  );
}
