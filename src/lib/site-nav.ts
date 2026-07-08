export interface SiteNavLink {
  href: string;
  label: string;
  title?: string;
  external?: boolean;
}

export interface SiteNavSection {
  label: string;
  links: SiteNavLink[];
}

export const primarySiteLinks: SiteNavLink[] = [
  { href: "/story", label: "Story", title: "Visual introduction to the data counterfactuals idea" },
  { href: "/learn", label: "Learning Lab", title: "Structured path through the explorers, memos, and reference material" },
  { href: "/post-training", label: "Post-training", title: "Human feedback value in RL-based post-training" },
  { href: "/memo", label: "Memos", title: "Written notes, the lightweight course path, formalisms, and more" },
  { href: "/collections", label: "Related Work", title: "Curated shelf of neighboring literatures and representative papers" },
];

export const wipExplorableLinks: SiteNavLink[] = [
  { href: "/grid", label: "Grid", title: "Interactive toy grid for exploring train/eval counterfactuals" },
  { href: "/graph", label: "Graph", title: "Subset-lattice companion that treats dataset edits as graph moves" },
  { href: "/api-explorer", label: "API", title: "Request/response style explorer for querying grid and graph state directly" },
  {
    href: "/advanced.html",
    label: "3D Viewer",
    title: "Heavier prototype with the more complex 3D visualization",
  },
];

export function getSiteNavSections(githubUrl?: string): SiteNavSection[] {
  return [
    { label: "Explore the site", links: primarySiteLinks },
    { label: "Interactive tools", links: wipExplorableLinks },
    ...(githubUrl
      ? [{
          label: "Project links",
          links: [{ href: githubUrl, label: "GitHub", external: true }],
        }]
      : []),
  ];
}
