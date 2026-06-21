import { useState } from "react";

function formatRevisionDate(value) {
  return new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

export default function RevisionsPanel({ doc, onAddRevision, onActivateRevision }) {
  const [name, setName] = useState(doc.metadata?.revision || "Draft");
  const [note, setNote] = useState("");
  const revisions = (doc.revisionOrder || [])
    .map(id => doc.revisions?.[id])
    .filter(Boolean)
    .reverse();

  function submit(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddRevision({ name: trimmed, note: note.trim() });
    setName("");
    setNote("");
  }

  return (
    <section className="revisions-panel">
      <header className="panel-header">
        <div>
          <span className="mono small">P1 2</span>
          <h3>Named revisions</h3>
        </div>
        <span className="mono small muted">{revisions.length} saved</span>
      </header>

      <form className="revision-form" onSubmit={submit}>
        <label>
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Rev A"
          />
        </label>
        <label>
          <span>Note</span>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Issued for focus"
            rows={3}
          />
        </label>
        <button type="submit" className="btn-compact">Save revision</button>
      </form>

      {revisions.length ? (
        <div className="revision-list">
          {revisions.map(revision => {
            const active = revision.id === doc.activeRevisionId;
            return (
              <button
                key={revision.id}
                type="button"
                className={`revision-row ${active ? "revision-row--active" : ""}`}
                onClick={() => onActivateRevision(revision.id)}
              >
                <span>
                  <strong>{revision.name}</strong>
                  {revision.note && <em>{revision.note}</em>}
                </span>
                <span className="mono small">{formatRevisionDate(revision.createdAt)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="empty-note">Save named revisions for print issue tracking.</p>
      )}
    </section>
  );
}
