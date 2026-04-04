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
  { href: "/", label: "Overview", title: "What data counterfactuals are and why they matter" },
  { href: "/grid", label: "Grid", title: "Interactive toy grid for exploring train/eval counterfactuals" },
  { href: "/memo", label: "Memos", title: "Written notes: the launch post, loose syllabus, formalisms, and more" },
  { href: "/collections", label: "Related Areas and Papers", title: "Curated shelf of neighboring literatures and representative papers" },
];

export const wipExplorableLinks: SiteNavLink[] = [
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
    { label: "WIP Explorables", links: wipExplorableLinks },
    ...(githubUrl
      ? [{
          label: "Project links",
          links: [{ href: githubUrl, label: "GitHub Repo", external: true }],
        }]
      : []),
  ];
}
