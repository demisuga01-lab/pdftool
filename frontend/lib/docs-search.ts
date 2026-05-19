export type DocsSearchCategory = "User guide" | "Tool guide" | "Technical" | "Operations" | "Support";

export type DocsSearchEntry = {
  category: DocsSearchCategory;
  description: string;
  groupTitle: string;
  href: string;
  keywords: string[];
  title: string;
};

export type DocsSearchSourceGroup = {
  audience: "user" | "technical";
  description: string;
  id: string;
  items: Array<{
    audience: "user" | "technical";
    description: string;
    groupId: string;
    groupTitle: string;
    href: string;
    slug: string;
    title: string;
  }>;
  title: string;
};

export type DocsNavSection = {
  description: string;
  groupIds: string[];
  title: string;
};

export const docsNavSections: DocsNavSection[] = [
  {
    title: "Start here",
    description: "Orientation and first-run help.",
    groupIds: ["help-getting-started"],
  },
  {
    title: "Tool guides",
    description: "PDF and image workflow choices.",
    groupIds: ["help-pdf-tools", "help-image-tools"],
  },
  {
    title: "OCR Tools",
    description: "Scanned PDF, searchable PDF, image OCR, and shared OCR workspace.",
    groupIds: ["help-ocr-tools"],
  },
  {
    title: "Privacy Tools",
    description: "Metadata, filename, archive safety, macro check, and scan tools.",
    groupIds: ["help-privacy-tools"],
  },
  {
    title: "File Tools",
    description: "Hash, inspect, archive, rename, split, join, and text workflows.",
    groupIds: ["help-file-tools"],
  },
  {
    title: "User help",
    description: "Files, failures, privacy, and contact paths.",
    groupIds: ["help-file-handling", "help-troubleshooting", "help-contact"],
  },
  {
    title: "Technical docs",
    description: "Product, architecture, APIs, and services.",
    groupIds: ["dev-product", "dev-architecture"],
  },
  {
    title: "Operations",
    description: "Deploy, environment, checks, and releases.",
    groupIds: ["dev-operations", "dev-testing"],
  },
  {
    title: "Support",
    description: "Security, support, rate limits, and known issues.",
    groupIds: ["dev-security"],
  },
];

const categoryByGroupId = new Map<string, DocsSearchCategory>([
  ["help-getting-started", "User guide"],
  ["help-file-handling", "User guide"],
  ["help-troubleshooting", "Support"],
  ["help-contact", "Support"],
  ["help-pdf-tools", "Tool guide"],
  ["help-image-tools", "Tool guide"],
  ["help-ocr-tools", "Tool guide"],
  ["help-privacy-tools", "Tool guide"],
  ["help-file-tools", "Tool guide"],
  ["dev-product", "Technical"],
  ["dev-architecture", "Technical"],
  ["dev-operations", "Operations"],
  ["dev-testing", "Operations"],
  ["dev-security", "Support"],
]);

export function getDocsSearchCategory(groupId: string, audience: "user" | "technical"): DocsSearchCategory {
  return categoryByGroupId.get(groupId) ?? (audience === "user" ? "User guide" : "Technical");
}

export function buildDocsSearchEntries(groups: DocsSearchSourceGroup[]): DocsSearchEntry[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      category: getDocsSearchCategory(item.groupId, item.audience),
      description: item.description,
      groupTitle: item.groupTitle,
      href: item.href,
      keywords: [
        item.slug,
        item.groupId,
        item.groupTitle,
        group.title,
        group.description,
        item.title,
        item.description,
      ]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
      title: item.title,
    })),
  );
}
