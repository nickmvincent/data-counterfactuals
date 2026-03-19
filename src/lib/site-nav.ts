export interface SiteNavLink {
  href: string;
  label: string;
  title?: string;
}

export const siteLinks: SiteNavLink[] = [
  { href: "/", label: "Overview", title: "What data counterfactuals are and why they matter" },
  { href: "/grid", label: "Grid", title: "Interactive toy grid for exploring train/eval counterfactuals" },
  { href: "/graph", label: "Graph", title: "Subset-lattice companion that treats dataset edits as graph moves" },
  { href: "/api-explorer", label: "API", title: "Request/response style explorer for querying grid and graph state directly" },
  { href: "/memo", label: "Memos", title: "Written notes: the launch post, formalisms, and more" },
  { href: "/collections", label: "Related Areas and Papers", title: "Curated shelf of neighboring literatures and representative papers" },
];

export const viewerLink: SiteNavLink = {
  href: "/advanced.html",
  label: "wip more complex 3d viewer",
};
