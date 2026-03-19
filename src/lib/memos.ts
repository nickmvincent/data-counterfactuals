import { getCollection } from "astro:content";

export const GLOSSARY_MEMO_SLUG = "glossary";
export const LAUNCH_MEMO_SLUG = "data-counterfactuals";
export const DIRECT_MEMO_ROUTES = {
  [GLOSSARY_MEMO_SLUG]: "/glossary",
} as const;

export function memoHref(slug: string) {
  return DIRECT_MEMO_ROUTES[slug as keyof typeof DIRECT_MEMO_ROUTES] ?? `/memo/${slug}`;
}

export function hasDirectMemoRoute(slug: string) {
  return slug in DIRECT_MEMO_ROUTES;
}

export function countWords(body: string) {
  return body.split(/\s+/).filter(Boolean).length;
}

export function estimateReadMinutes(wordCount: number) {
  return Math.max(1, Math.round(wordCount / 220));
}

function memoSortValue(order?: number) {
  return order ?? Number.POSITIVE_INFINITY;
}

export function numberedMemoTitle(title: string, order?: number) {
  return order ? `${order}. ${title}` : title;
}

export async function getPublicMemos() {
  return (await getCollection("memos"))
    .filter((memo) => memo.data.visibility !== "private")
    .sort((a, b) => {
      const orderDifference = memoSortValue(a.data.order) - memoSortValue(b.data.order);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0);
    });
}

export async function getPublicMemoBySlug(slug: string) {
  const memos = await getPublicMemos();
  return memos.find((memo) => memo.slug === slug);
}
