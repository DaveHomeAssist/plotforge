export const FIXTURE_NOTE_LAYERS = [
  { id: "color", label: "Color" },
  { id: "gobo", label: "Gobo" },
  { id: "focus", label: "Focus" },
  { id: "crew", label: "Crew" },
];

export function defaultFixtureNotes() {
  return {
    color: "",
    gobo: "",
    focus: "",
    crew: "",
  };
}

function textValue(value) {
  return typeof value === "string" ? value : "";
}

export function normalizeFixtureNotes(notes, legacyNote = "") {
  const source = notes && typeof notes === "object" ? notes : {};
  return {
    color: textValue(source.color),
    gobo: textValue(source.gobo),
    focus: textValue(source.focus),
    crew: textValue(source.crew) || textValue(legacyNote),
  };
}

export function fixtureNotesEqual(a, b) {
  const left = normalizeFixtureNotes(a);
  const right = normalizeFixtureNotes(b);
  return FIXTURE_NOTE_LAYERS.every(layer => left[layer.id] === right[layer.id]);
}

export function formatFixtureNotes(notes) {
  const normalized = normalizeFixtureNotes(notes);
  return FIXTURE_NOTE_LAYERS
    .map(layer => ({ label: layer.label, value: normalized[layer.id] }))
    .filter(entry => entry.value)
    .map(entry => `${entry.label}: ${entry.value}`)
    .join(" | ");
}
