export default function DraftRecoveryBanner({ onRestore, onDismiss }) {
  return (
    <div className="banner" role="status">
      <span>An unsaved draft was found. Restore it?</span>
      <span>
        <button type="button" onClick={onRestore} className="btn-primary">Restore</button>
        <button type="button" onClick={onDismiss}>Discard</button>
      </span>
    </div>
  );
}
