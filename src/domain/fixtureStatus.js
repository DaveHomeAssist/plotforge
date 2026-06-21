export const DEFAULT_FIXTURE_STATUS = "planned";

export const FIXTURE_STATUS_OPTIONS = [
  { id: "planned", label: "Planned", color: "#5d6878" },
  { id: "hung", label: "Hung", color: "#ffb547" },
  { id: "patched", label: "Patched", color: "#4cc9ff" },
  { id: "focused", label: "Focused", color: "#58e896" },
  { id: "needs_work", label: "Needs work", color: "#ff6b6b" },
];

const STATUSES_BY_ID = new Map(FIXTURE_STATUS_OPTIONS.map(status => [status.id, status]));

export function normalizeFixtureStatus(status) {
  return STATUSES_BY_ID.has(status) ? status : DEFAULT_FIXTURE_STATUS;
}

export function getFixtureStatus(status) {
  return STATUSES_BY_ID.get(normalizeFixtureStatus(status));
}
