const FIELD_GROUPS = [
  [
    ["drawingTitle", "Drawing title"],
    ["venueName", "Venue name"],
  ],
  [
    ["designer", "Designer"],
    ["draftsperson", "Draftsperson"],
  ],
  [
    ["company", "Company"],
    ["revision", "Revision"],
  ],
  [
    ["showDate", "Show date", "date"],
    ["scaleLabel", "Scale"],
  ],
];

export default function ProjectMetadata({ doc, onShowNameChange, onProjectMetadataChange }) {
  const metadata = doc.metadata || {};

  return (
    <section className="project-metadata">
      <header className="panel-header">
        <div>
          <span className="mono small">TITLE BLOCK</span>
          <h3>{metadata.drawingTitle || "Lighting Plot"}</h3>
        </div>
      </header>

      <label>
        <span>Show title</span>
        <input
          type="text"
          value={doc.name}
          onChange={event => onShowNameChange(event.target.value)}
        />
      </label>

      {FIELD_GROUPS.map((fields, index) => (
        <div className="field-grid" key={index}>
          {fields.map(([key, label, type = "text"]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={metadata[key] || ""}
                onChange={event => onProjectMetadataChange({ [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      ))}
    </section>
  );
}
