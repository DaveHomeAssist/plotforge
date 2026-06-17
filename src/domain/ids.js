// Stable, sortable, collision-resistant ids without a crypto dep.
// Format: <base36-time>-<base36-rand>
let counter = 0;
export function uid(prefix = "") {
  counter = (counter + 1) & 0xffff;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  const c = counter.toString(36).padStart(3, "0");
  return `${prefix}${prefix ? "_" : ""}${t}-${r}${c}`;
}
