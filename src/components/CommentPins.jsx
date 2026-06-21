import { useMemo, useState } from "react";
import { commentPinRows } from "../domain/show.js";
import { formatImperial } from "../domain/units.js";

export default function CommentPins({
  doc,
  selectedCommentPinId,
  onSelectCommentPin,
  onChange,
  onDelete,
}) {
  const rows = useMemo(() => commentPinRows(doc), [doc]);
  const selected = selectedCommentPinId ? doc.commentPins?.[selectedCommentPinId] : null;
  const selectedIndex = selected ? rows.findIndex(row => row.id === selected.id) : -1;

  return (
    <section className="comment-panel" aria-labelledby="comment-panel-title">
      <div className="panel-header">
        <div>
          <span className="mono small">P2 6</span>
          <h3 id="comment-panel-title">Comment pins</h3>
        </div>
      </div>

      <div className="comment-panel__summary mono small">
        <span>{rows.length} pin{rows.length === 1 ? "" : "s"}</span>
        <span>{selected ? `selected ${selectedIndex + 1}` : "none selected"}</span>
      </div>

      {rows.length === 0 ? (
        <p className="patch-table__empty">No comment pins.</p>
      ) : (
        <div className="comment-pin-list">
          {rows.map((commentPin, index) => (
            <button
              key={commentPin.id}
              type="button"
              className={`comment-pin-row ${commentPin.id === selectedCommentPinId ? "comment-pin-row--selected" : ""}`}
              onClick={() => onSelectCommentPin(commentPin.id)}
            >
              <span className="mono">#{index + 1}</span>
              <span>{commentPin.text}</span>
              <span className="mono small">{formatImperial(commentPin.xMm)}, {formatImperial(commentPin.yMm)}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <CommentPinEditor
          key={selected.id}
          commentPin={selected}
          onChange={onChange}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}

function CommentPinEditor({ commentPin, onChange, onDelete }) {
  const [draft, setDraft] = useState(commentPin.text);

  function flushDraft() {
    if (draft !== commentPin.text) onChange(commentPin.id, { text: draft });
  }

  return (
    <div className="comment-editor">
      <label>
        <span>Selected note</span>
        <textarea
          rows={3}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={flushDraft}
        />
      </label>
      <button className="btn-danger" type="button" onClick={() => onDelete(commentPin.id)}>Delete pin</button>
    </div>
  );
}
