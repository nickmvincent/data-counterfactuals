export interface LocalPaperCollection {
  slug: string;
  title: string;
  citation_keys: string[];
  visibility?: string;
  body?: string;
}

// Tracked local overlays let us surface important concepts before the remote
// Semble shelf has been updated.
export const LOCAL_PAPER_COLLECTIONS: LocalPaperCollection[] = [
  {
    slug: 'data-dividends',
    title: 'data dividends',
    citation_keys: [
      'vincent2021dataleverage',
      'vincent2021consciousdatacontribution',
      'vincent2019ugcinsearch',
    ],
    visibility: 'public',
    body: 'Part of the datacounterfactuals.org reading lists. Research and proposals on sharing value back to the people whose data help power AI systems. Connects data leverage, user-generated content, bargaining, compensation, and governance questions about how gains from model training should be distributed.',
  },
];
