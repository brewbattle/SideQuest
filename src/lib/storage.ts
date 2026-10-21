import { get, set, setMany } from "idb-keyval";
import { freshState, stateSchema, type AppState } from "./model";
const KEY = "sidequest-v1";
const CONTENT = "sidequest-content-v1";
export async function loadState(): Promise<AppState> {
  const saved = await get(KEY);
  if (!saved) return freshState();
  if (saved.contentStoredSeparately) {
    const content = await get(CONTENT);
    if (!content) throw Error("Course content could not be opened.");
    return stateSchema.parse({ ...saved, ...content });
  }
  return stateSchema.parse(saved);
}
// Serialize writes, and keep source packs out of per-second progress snapshots.
// A content change and its progress snapshot commit in one IndexedDB transaction.
let pending = Promise.resolve();
let lastQuestions: AppState["questions"] | undefined;
let lastMaterials: AppState["materials"] | undefined;
export function saveState(state: AppState) {
  const next = pending
    .catch(() => {})
    .then(async () => {
      const { questions, materials, ...progress } = state;
      const snapshot = { ...progress, contentStoredSeparately: true };
      if (questions !== lastQuestions || materials !== lastMaterials) {
        await setMany([
          [CONTENT, { questions, materials }],
          [KEY, snapshot],
        ]);
        lastQuestions = questions;
        lastMaterials = materials;
      } else await set(KEY, snapshot);
    });
  pending = next;
  return next;
}
export async function exportStored() {
  const saved = await get(KEY);
  return saved?.contentStoredSeparately
    ? { ...saved, ...(await get(CONTENT)) }
    : saved;
}
export function downloadJSON(value: unknown, name: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
