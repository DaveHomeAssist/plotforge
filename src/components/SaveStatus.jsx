function formatSavedTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function SaveStatus({ status, onRetry }) {
  const state = status?.state ?? "unsaved";
  const mode = status?.mode === "download" ? "download" : ".plot";

  if (state === "saved") {
    return (
      <span className="save-status save-status--saved" role="status">
        Saved {formatSavedTime(status.lastSavedAt)}
      </span>
    );
  }

  if (state === "saving") {
    return (
      <span className="save-status save-status--saving" role="status">
        Saving...
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="save-status save-status--error" role="status">
        Save failed
        <button type="button" onClick={onRetry}>Retry</button>
      </span>
    );
  }

  return (
    <span className="save-status save-status--dirty" role="status">
      Unsaved changes
      <span className="save-status__mode">{mode}</span>
    </span>
  );
}
