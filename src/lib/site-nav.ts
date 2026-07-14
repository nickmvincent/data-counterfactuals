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
  { href: "/learn", label: "Learn", title: "A guided path from nearby data worlds to methods, evidence, and institutions" },
  { href: "/research", label: "Research", title: "The cross-field synthesis, comparison framework, and open questions" },
  { href: "/labs", label: "Cases & Labs", title: "Worked cases, framing tools, and advanced interactive explorers" },
  { href: "/collections", label: "Papers", title: "Search a curated map of neighboring literatures and primary sources" },
  { href: "/teach", label: "Teach", title: "Short, classroom-length, and multi-session teaching paths" },
];

export const frameSiteLink: SiteNavLink = {
  href: "/frame",
  label: "Frame a study",
  title: "Turn a data change into a precise working study brief",
};

export const secondarySiteLinks: SiteNavLink[] = [
  { href: "/story", label: "Quick primer", title: "Five-minute visual introduction to the core idea" },
  { href: "/examples", label: "Worked examples", title: "Concrete training, evaluation, governance, privacy, and adversarial cases" },
  { href: "/methods", label: "Method comparison", title: "Compare method families by the claims they can support" },
  { href: "/glossary", label: "Glossary", title: "Working definitions for the terms used across the site" },
  { href: "/memo", label: "Essays and notes", title: "Longer written arguments, formalisms, and the loose syllabus" },
];

export const experimentalSiteLinks: SiteNavLink[] = [
  { href: "/post-training", label: "Post-training", title: "Provisional human-feedback value explorer" },
  { href: "/grid", label: "Grid sandbox", title: "Advanced toy grid for exploring train/eval counterfactuals" },
  { href: "/graph", label: "Graph explorer", title: "Subset-lattice companion that treats dataset edits as graph moves" },
  { href: "/api-explorer", label: "Explorer API", title: "Request/response style explorer for querying grid and graph state directly" },
  {
    href: "/advanced.html",
    label: "3D Viewer",
    title: "Heavier prototype with the more complex 3D visualization",
  },
];

export function getSiteNavSections(githubUrl?: string): SiteNavSection[] {
  return [
    { label: "Main paths", links: primarySiteLinks },
    { label: "Use and reference", links: [frameSiteLink, ...secondarySiteLinks] },
    { label: "Experimental tools", links: experimentalSiteLinks },
    ...(githubUrl
      ? [{
          label: "Project links",
          links: [{ href: githubUrl, label: "GitHub", external: true }],
        }]
      : []),
  ];
}
