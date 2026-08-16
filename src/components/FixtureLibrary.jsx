import { useEffect, useMemo, useRef, useState } from "react";
import {
  getFixtureProfileLibrary,
  getProfileDetail,
  getProfileSearchText,
} from "../domain/profiles.js";
import { outputProfileStatus } from "../domain/fixtureOutputProfiles.js";

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

function outputStatusCopy(status) {
  if (status === "output-ready") return "Output ready";
  if (status === "candidate") return "Candidate map";
  return "Paperwork only";
}

function channelStatusLabel(channel) {
  return channel.unsafe ? `${channel.type} locked` : channel.type;
}

function FixtureProfileDetail({ profile, customProfiles, hasPosition, selectedPositionId, onAddFixture }) {
  if (!profile) {
    return (
      <section className="fixture-profile-detail fixture-profile-detail--empty" aria-label="Fixture profile detail">
        <p className="empty-note">No matching profile selected.</p>
      </section>
    );
  }

  const detail = getProfileDetail(profile);
  const output = outputProfileStatus(profile.id, customProfiles);
  const outputChannels = output.profile?.channels || [];
  const unsafeCount = outputChannels.filter(channel => channel.unsafe).length;

  return (
    <section className="fixture-profile-detail" aria-labelledby="fixture-profile-detail-title">
      <div className="fixture-profile-detail__head">
        <div>
          <span className="mono small">{profile.category}</span>
          <h3 id="fixture-profile-detail-title">{profile.model}</h3>
          <p>{profile.manufacturer}</p>
        </div>
        <button
          type="button"
          className="btn-compact"
          disabled={!hasPosition}
          onClick={() => onAddFixture(selectedPositionId, profile.id)}
        >
          Add
        </button>
      </div>

      <p className="profile-summary">{detail.summary}</p>

      <dl className="profile-detail-grid">
        <div>
          <dt>Mode</dt>
          <dd>{profile.defaultMode}</dd>
        </div>
        <div>
          <dt>Footprint</dt>
          <dd>{profile.dmxFootprint}ch</dd>
        </div>
        <div>
          <dt>Symbol</dt>
          <dd>{profile.symbol}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{formatSource(profile)}</dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>{outputStatusCopy(output.status)}</dd>
        </div>
        <div>
          <dt>Mapped</dt>
          <dd>{outputChannels.length ? `${outputChannels.length} slots` : "None"}</dd>
        </div>
      </dl>

      <div className="profile-info-block">
        <span className="mono small">OUTPUT MAP</span>
        {output.profile ? (
          <>
            <div className="profile-chip-row">
              <span>{output.profile.label}</span>
              <span>{outputStatusCopy(output.status)}</span>
              {unsafeCount > 0 && <span>{unsafeCount} unsafe locked</span>}
            </div>
            <div className="profile-output-channel-list" aria-label="Output channel map">
              {outputChannels.map(channel => (
                <span key={`${output.profile.id}-${channel.slot}`}>
                  <strong>{channel.slot}</strong>
                  <em>{channel.label}</em>
                  <code>{channelStatusLabel(channel)}</code>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-note">No approved output map. This profile stays paperwork-only for live output.</p>
        )}
      </div>

      <div className="profile-info-block">
        <span className="mono small">BEST FOR</span>
        <div className="profile-chip-row">
          {detail.bestFor.map(item => <span key={item}>{item}</span>)}
        </div>
      </div>

      <div className="profile-info-block">
        <span className="mono small">CAPABILITIES</span>
        <ul>
          {detail.capabilities.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="profile-info-block">
        <span className="mono small">NOTES</span>
        <ul>
          {detail.notes.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="profile-info-block">
        <span className="mono small">MODES</span>
        <div className="profile-mode-list">
          {profile.modes.map(mode => (
            <span key={mode.name}>
              <strong>{mode.name}</strong>
              <em>{mode.dmxFootprint}ch</em>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
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
  const [selectedProfileId, setSelectedProfileId] = useState(null);

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

  const selectedProfile = useMemo(() => (
    profiles.find(profile => profile.id === selectedProfileId) || visibleProfiles[0] || null
  ), [profiles, selectedProfileId, visibleProfiles]);

  useEffect(() => {
    if (!visibleProfiles.length) {
      if (selectedProfileId !== null) setSelectedProfileId(null);
      return;
    }
    if (!visibleProfiles.some(profile => profile.id === selectedProfileId)) {
      setSelectedProfileId(visibleProfiles[0].id);
    }
  }, [selectedProfileId, visibleProfiles]);

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
            aria-label="Import an Open Fixture Library JSON profile"
            tabIndex={-1}
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

      <FixtureProfileDetail
        profile={selectedProfile}
        customProfiles={doc.fixtureProfiles}
        hasPosition={hasPosition}
        selectedPositionId={selectedPositionId}
        onAddFixture={onAddFixture}
      />

      <div className="fixture-profile-list" role="list" aria-label="Fixture profiles">
        {visibleProfiles.map(profile => {
          const output = outputProfileStatus(profile.id, doc.fixtureProfiles);
          return (
            <div
              className={`fixture-profile-row${selectedProfile?.id === profile.id ? " fixture-profile-row--selected" : ""}`}
              role="listitem"
              key={profile.id}
            >
              <span className="fixture-profile-row__main">
                <strong>{profile.model}</strong>
                <em>{profile.manufacturer}</em>
              </span>
              <span className="fixture-profile-row__meta">
                <span className="mono small">{profile.defaultMode}</span>
                <span className="mono small">{profile.dmxFootprint}ch · {profile.category}</span>
                <span className="mono small muted">{formatSource(profile)}</span>
              </span>
              <span className={`fixture-output-pill fixture-output-pill--${output.status} mono small`}>
                {outputStatusCopy(output.status)}
              </span>
              <button
                type="button"
                className="btn-compact"
                aria-current={selectedProfile?.id === profile.id ? "true" : undefined}
                onClick={() => setSelectedProfileId(profile.id)}
              >
                Details
              </button>
              <button
                type="button"
                className="btn-compact"
                disabled={!hasPosition}
                onClick={() => onAddFixture(selectedPositionId, profile.id)}
              >
                Add
              </button>
            </div>
          );
        })}
        {visibleProfiles.length === 0 && (
          <p className="empty-note">No profiles in this lane.</p>
        )}
      </div>
    </section>
  );
}
