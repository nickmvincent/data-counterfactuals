import { conceptSpecIds, graphLensIds } from "./concept-lens-specs.js";

export const sharedExplorerParamKeys = [
  "count",
  "metric",
  "mode",
  "lens",
  "train",
  "eval",
  "focus",
  "k",
  "epsilon",
  "audit",
  "poison",
  "gridView",
];

export const gridModes = new Set(conceptSpecIds);

export const graphLenses = new Set(graphLensIds);

export function gridModeToGraphLens(mode) {
  if (mode === "group") return "strike";
  if (mode === "interaction") return "interaction";
  if (mode === "eval-scaling") return "eval-scaling";
  if (mode === "dp" || mode === "unlearning") return "dp";
  if (mode === "poison") return "poison";
  if (mode === "scaling" || mode === "diagonal-scaling" || mode === "budget") return "scaling";
  if (mode === "shapley" || mode === "banzhaf" || mode === "beta") return "shapley";
  return "ablation";
}

export function graphLensToGridMode(lens) {
  if (lens === "strike") return "group";
  if (lens === "interaction") return "interaction";
  if (lens === "shapley") return "shapley";
  if (lens === "eval-scaling") return "eval-scaling";
  if (lens === "scaling") return "scaling";
  if (lens === "dp") return "dp";
  if (lens === "poison") return "poison";
  return "loo";
}

export function parseSharedSubset(value) {
  if (!value || value === "empty" || value === "∅") return [];
  return [...new Set(String(value).toUpperCase().match(/[A-Z]/g) || [])].sort();
}

export function formatSharedSubset(subset = []) {
  const normalized = [...new Set(subset.filter(Boolean).map((token) => String(token).toUpperCase()))].sort();
  return normalized.length ? normalized.join("") : "empty";
}

export function parseSharedCount(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeSharedChoice(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

export function parseExplorerGameState(search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const mode = params.get("mode");
  const lens = params.get("lens");
  const focus = params.get("focus");
  const normalizedMode = gridModes.has(mode) ? mode : null;
  const normalizedLens = graphLenses.has(lens) ? lens : null;
  const compatibleLens = normalizedMode
    ? normalizedLens === gridModeToGraphLens(normalizedMode)
      ? normalizedLens
      : gridModeToGraphLens(normalizedMode)
    : normalizedLens;

  return {
    count: params.get("count"),
    metric: params.get("metric"),
    mode: normalizedMode,
    lens: compatibleLens,
    trainSet: params.has("train") ? parseSharedSubset(params.get("train")) : null,
    evalSet: params.has("eval") ? parseSharedSubset(params.get("eval")) : null,
    focusSet: focus ? parseSharedSubset(focus) : null,
    k: params.get("k"),
    epsilon: params.get("epsilon"),
    auditTolerance: params.get("audit"),
    poisonActive: params.get("poison"),
    gridView: params.get("gridView"),
  };
}

export function hasExplorerGameStateParams(search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return sharedExplorerParamKeys.some((key) => params.has(key));
}

export function normalizeSharedTokens(tokens, base, fallback = []) {
  const allowed = new Set(base);
  const normalized = [...new Set((tokens || []).filter((token) => allowed.has(token)))].sort();
  if (normalized.length) return normalized;
  return fallback.filter((token) => allowed.has(token));
}

export function createExplorerGameStateSearch(state = {}, existingSearch = "") {
  const params = new URLSearchParams(existingSearch.startsWith("?") ? existingSearch : `?${existingSearch}`);
  sharedExplorerParamKeys.forEach((key) => params.delete(key));

  if (state.count) params.set("count", String(state.count));
  if (state.metric) params.set("metric", state.metric);
  if (state.mode) params.set("mode", state.mode);
  if (state.lens) params.set("lens", state.lens);
  if (state.trainSet) params.set("train", formatSharedSubset(state.trainSet));
  if (state.evalSet) params.set("eval", formatSharedSubset(state.evalSet));
  if (state.focusSet?.length) params.set("focus", formatSharedSubset(state.focusSet));
  if (typeof state.k === "number") params.set("k", String(state.k));
  if (typeof state.epsilon === "number") params.set("epsilon", String(state.epsilon));
  if (typeof state.auditTolerance === "number") params.set("audit", String(state.auditTolerance));
  if (typeof state.poisonActive === "boolean") params.set("poison", state.poisonActive ? "1" : "0");
  if (state.gridView) params.set("gridView", state.gridView);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildExplorerHref(path, state = {}) {
  return `${path}${createExplorerGameStateSearch(state)}`;
}

export function buildExplorerShareUrl(path, state = {}, origin = "") {
  const href = buildExplorerHref(path, state);
  return origin ? new URL(href, origin).toString() : href;
}

export async function copyExplorerShareUrl(path, state = {}) {
  if (typeof window === "undefined" || !window.navigator?.clipboard?.writeText) {
    throw new Error("Clipboard API is not available");
  }
  const shareUrl = buildExplorerShareUrl(path, state, window.location.origin);
  await window.navigator.clipboard.writeText(shareUrl);
  return shareUrl;
}

export function replaceExplorerGameStateUrl(state = {}) {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const nextSearch = createExplorerGameStateSearch(state, window.location.search);
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", nextUrl);
  }
}
