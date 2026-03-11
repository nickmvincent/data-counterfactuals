export interface NetworkDiscussion {
  provider: string;
  url: string;
  label?: string;
  description?: string;
}

export interface RelatedProject {
  name: string;
  title?: string;
  website?: string;
}

export interface NetworkLinks {
  website?: string;
  github?: string;
}

export interface NetworkData {
  discussions?: NetworkDiscussion[];
  relatedProjects?: RelatedProject[];
  links?: NetworkLinks;
  generatedAt?: string;
}
