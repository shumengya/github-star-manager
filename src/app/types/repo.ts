export type RepoPreview = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  topics: string[];
  language?: string | null;
  languageColor?: string | null;
  stars?: number;
  forks?: number;
  openIssues?: number;
  license?: string | null;
  homepageUrl?: string | null;
  repoUrl?: string;
  ownerAvatarUrl?: string | null;
  parentFullName?: string | null;
  isArchived?: boolean;
  isFork?: boolean;
  isTemplate?: boolean;
  updatedAt?: string;
  pushedAt?: string | null;
  starredAt?: string | null;
};

export type ListPreview = {
  id: string;
  name: string;
  count: number;
};

export function formatIsoDate(value?: string | null): string {
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}
