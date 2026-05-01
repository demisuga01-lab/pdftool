import "server-only";

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import { toString } from "mdast-util-to-string";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

type DocGroupId =
  | "getting-started"
  | "product-ui"
  | "tools"
  | "backend-architecture"
  | "operations"
  | "security-support"
  | "testing-future";

type DocDefinition = {
  description?: string;
  group: DocGroupId;
  noindex?: boolean;
  operational?: boolean;
  slug: string;
  source: string;
};

export type DocLink = {
  description: string;
  href: string;
  slug: string;
  title: string;
};

export type DocHeading = {
  depth: 2 | 3;
  id: string;
  text: string;
};

export type DocPage = DocLink & {
  groupId: DocGroupId;
  groupTitle: string;
  headings: DocHeading[];
  html: string;
  noindex: boolean;
  operational: boolean;
  source: string;
};

export type DocGroup = {
  description: string;
  id: DocGroupId;
  items: DocLink[];
  title: string;
};

const GROUP_DEFINITIONS: Array<{ description: string; id: DocGroupId; title: string }> = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Overview, documentation map, and the fastest way to understand the project.",
  },
  {
    id: "product-ui",
    title: "Product & UI",
    description: "Route inventory, workspace behavior, theming, and mobile experience.",
  },
  {
    id: "tools",
    title: "Tools",
    description: "Feature-level documentation for PDF, image, conversion, compression, OCR, and watermark workflows.",
  },
  {
    id: "backend-architecture",
    title: "Backend & Architecture",
    description: "API structure, services, workers, queues, and end-to-end data flow.",
  },
  {
    id: "operations",
    title: "Operations",
    description: "Deployment, environment, production runbooks, and maintainer-only operational references.",
  },
  {
    id: "security-support",
    title: "Security & Support",
    description: "Security posture, error handling, troubleshooting, support, and contact guidance.",
  },
  {
    id: "testing-future",
    title: "Testing & Future",
    description: "Testing, smoke checks, roadmap, future platform work, and contribution guidance.",
  },
];

const DOC_DEFINITIONS: DocDefinition[] = [
  { slug: "", source: "README.md", group: "getting-started", description: "Fast entry point to the PDFTools documentation system." },
  { slug: "documentation", source: "DOCUMENTATION.md", group: "getting-started", description: "Documentation map, reading order, and maintenance rules." },
  { slug: "topics", source: "docs/README.md", group: "getting-started", description: "Index of deeper topic pages." },
  { slug: "product-overview", source: "docs/product-overview.md", group: "getting-started", description: "What PDFTools is, who it serves, and what it is not." },
  { slug: "features", source: "FEATURES.md", group: "getting-started", description: "Product-wide feature matrix across routes, workers, and services." },
  { slug: "features-index", source: "docs/features-index.md", group: "getting-started", description: "Cross-index of tools and platform features." },

  { slug: "frontend-routes", source: "docs/frontend-routes.md", group: "product-ui", description: "Frontend route inventory, purpose, and page behavior." },
  { slug: "workspace-system", source: "docs/workspace-system.md", group: "product-ui", description: "Shared workspace architecture and layout behavior." },
  { slug: "tool-workflows", source: "docs/tool-workflows.md", group: "product-ui", description: "Generic upload-to-download lifecycle across tools." },
  { slug: "theme-and-branding", source: "docs/theme-and-branding.md", group: "product-ui", description: "Brand, theme, and visual system guidance." },
  { slug: "mobile-ui", source: "docs/mobile-ui.md", group: "product-ui", description: "Mobile interaction rules, drawers, and QA expectations." },

  { slug: "pdf-tools", source: "docs/pdf-tools.md", group: "tools", description: "PDF tool behavior, options, failure modes, and implementation notes." },
  { slug: "image-tools", source: "docs/image-tools.md", group: "tools", description: "Image tool behavior, options, failure modes, and implementation notes." },
  { slug: "compression", source: "docs/compression.md", group: "tools", description: "Compression modes, target-size behavior, and external CLI usage." },
  { slug: "conversion", source: "docs/conversion.md", group: "tools", description: "Conversion workflows, format normalization, and result packaging." },
  { slug: "ocr", source: "docs/ocr.md", group: "tools", description: "OCR inputs, outputs, dependencies, limits, and troubleshooting." },
  { slug: "watermarking", source: "docs/watermarking.md", group: "tools", description: "Text/image watermark behavior, placement, SVG handling, and UX notes." },

  { slug: "api-reference", source: "API_REFERENCE.md", group: "backend-architecture", description: "Route-family API summary and common response patterns." },
  { slug: "backend-api", source: "docs/backend-api.md", group: "backend-architecture", description: "Detailed backend route notes and request/response behavior." },
  { slug: "architecture", source: "ARCHITECTURE.md", group: "backend-architecture", description: "System architecture, boundaries, and request/data flow." },
  { slug: "backend-services", source: "docs/backend-services.md", group: "backend-architecture", description: "Service-layer responsibilities and shared backend logic." },
  { slug: "workers-and-queues", source: "docs/workers-and-queues.md", group: "backend-architecture", description: "Queue usage, task routing, and operational worker behavior." },
  { slug: "celery-workers", source: "docs/celery-workers.md", group: "backend-architecture", description: "Celery app, workers, routing, and inspection commands." },
  { slug: "data-flow-diagrams", source: "docs/data-flow-diagrams.md", group: "backend-architecture", description: "ASCII diagrams of uploads, jobs, downloads, and rate limiting." },
  { slug: "frontend-components", source: "docs/frontend-components.md", group: "backend-architecture", description: "Major frontend component systems and how they fit together." },
  { slug: "upload-preview-download-flow", source: "docs/upload-preview-download-flow.md", group: "backend-architecture", description: "File lifecycle from upload through preview, job, and download." },
  { slug: "file-storage-and-retention", source: "docs/file-storage-and-retention.md", group: "backend-architecture", description: "Storage directories, cleanup, retention, and disk usage guidance." },

  { slug: "deployment", source: "DEPLOYMENT.md", group: "operations", description: "Production deployment, restart, verification, and rollback steps.", noindex: true, operational: true },
  { slug: "deployment-vps", source: "docs/deployment-vps.md", group: "operations", description: "VPS-focused deployment details and runtime checks.", noindex: true, operational: true },
  { slug: "environment", source: "ENVIRONMENT.md", group: "operations", description: "Tracked env templates, runtime rules, and current safe production values." },
  { slug: "environment-variables", source: "docs/environment-variables.md", group: "operations", description: "Detailed environment variable reference and risk notes." },
  { slug: "production-checklist", source: "PRODUCTION_CHECKLIST.md", group: "operations", description: "Release and deploy checklist for production verification.", operational: true },
  { slug: "production-env", source: "PRODUCTION_ENV.md", group: "operations", description: "Safe production backend env template and VPS update command.", noindex: true, operational: true },
  { slug: "operations", source: "OPERATIONS.md", group: "operations", description: "Daily and weekly operator guide with PM2, Redis, and disk checks.", noindex: true, operational: true },
  { slug: "release-process", source: "docs/release-process.md", group: "operations", description: "Release workflow, deployment coordination, and post-release checks.", noindex: true, operational: true },
  { slug: "pre-commit-final-check", source: "PRE_COMMIT_FINAL_CHECK.md", group: "operations", description: "Local pre-commit and post-push deployment commands.", noindex: true, operational: true },
  { slug: "local-development-windows", source: "docs/local-development-windows.md", group: "operations", description: "Windows local development setup and command reference." },
  { slug: "external-tools", source: "docs/external-tools.md", group: "operations", description: "External command dependencies used by the platform." },

  { slug: "security", source: "SECURITY.md", group: "security-support", description: "Security model, abuse controls, and hardening notes." },
  { slug: "security-hardening", source: "docs/security-hardening.md", group: "security-support", description: "Practical hardening details for uploads, subprocesses, and SVG." },
  { slug: "error-handling", source: "docs/error-handling.md", group: "security-support", description: "Safe error payloads, logging boundaries, and UI behavior." },
  { slug: "troubleshooting", source: "TROUBLESHOOTING.md", group: "security-support", description: "Symptom-to-fix troubleshooting matrix." },
  { slug: "troubleshooting-index", source: "docs/troubleshooting-index.md", group: "security-support", description: "Quick troubleshooting entry points by symptom." },
  { slug: "known-limitations", source: "docs/known-limitations.md", group: "security-support", description: "Current gaps, partial implementations, and operational caveats." },
  { slug: "support", source: "SUPPORT.md", group: "security-support", description: "Support expectations, contact channels, and triage rules." },
  { slug: "support-playbook", source: "docs/support-playbook.md", group: "security-support", description: "Maintainer-side playbook for first-pass support handling.", noindex: true, operational: true },
  { slug: "mail-and-contact", source: "docs/mail-and-contact.md", group: "security-support", description: "Mail host, support/contact split, aliases, and DNS notes." },
  { slug: "rate-limiting", source: "docs/rate-limiting.md", group: "security-support", description: "Per-tool/per-bucket rate limiting behavior and frontend handling." },

  { slug: "testing-and-smoke-tests", source: "docs/testing-and-smoke-tests.md", group: "testing-future", description: "Validation commands and high-value manual smoke tests." },
  { slug: "smoke-test-results-template", source: "docs/smoke-test-results-template.md", group: "testing-future", description: "Reusable template for documenting smoke-test runs." },
  { slug: "roadmap", source: "ROADMAP.md", group: "testing-future", description: "Planned future work only." },
  { slug: "future-api-platform", source: "docs/future-api-platform.md", group: "testing-future", description: "Planned API/auth platform direction at api.wellfriend.online." },
  { slug: "contributing", source: "CONTRIBUTING.md", group: "testing-future", description: "Local setup, change process, and contributor expectations." },
  { slug: "changelog", source: "CHANGELOG.md", group: "testing-future", description: "Documentation changelog for the current repo state." },
];

const NOINDEX_SLUGS = new Set(
  DOC_DEFINITIONS.filter((definition) => definition.noindex).map((definition) => definition.slug),
);

const DOCS_ROOT = path.resolve(process.cwd(), "..", "pdftools-documentation");

if (!fs.existsSync(DOCS_ROOT)) {
  throw new Error("pdftools-documentation directory could not be found for frontend docs rendering.");
}

function safeFilePath(relativeSource: string) {
  const resolved = path.resolve(DOCS_ROOT, relativeSource);
  if (!resolved.startsWith(DOCS_ROOT)) {
    throw new Error("Refused to read documentation content outside pdftools-documentation.");
  }
  return resolved;
}

function sourceToHrefMap() {
  return new Map(
    DOC_DEFINITIONS.map((definition) => [
      definition.source.replace(/\\/g, "/"),
      definition.slug ? `/docs/${definition.slug}` : "/docs",
    ]),
  );
}

function isExternalUrl(value: string) {
  return /^(https?:|mailto:|tel:|#)/i.test(value);
}

function rewriteInternalDocLink(
  currentSource: string,
  href: string,
  knownLinks: Map<string, string>,
) {
  if (!href || isExternalUrl(href)) {
    return href;
  }

  const [rawPath, rawHash] = href.split("#", 2);
  if (!rawPath || !/\.md$/i.test(rawPath)) {
    return href;
  }

  const currentDirectory = path.posix.dirname(currentSource);
  const normalized = path.posix.normalize(path.posix.join(currentDirectory, rawPath));
  if (normalized.startsWith("../")) {
    return href;
  }

  const nextHref = knownLinks.get(normalized);
  if (!nextHref) {
    return href;
  }

  return rawHash ? `${nextHref}#${rawHash}` : nextHref;
}

async function ensureDocsSourcesExist() {
  await Promise.all(
    DOC_DEFINITIONS.map(async (definition) => {
      const filePath = safeFilePath(definition.source);
      try {
        await fsp.access(filePath);
      } catch {
        throw new Error(`Missing documentation source file: pdftools-documentation/${definition.source}`);
      }
    }),
  );
}

type ParsedDoc = {
  description: string;
  headings: DocHeading[];
  html: string;
  title: string;
};

async function parseMarkdownDocument(source: string, relativeSource: string): Promise<ParsedDoc> {
  const knownLinks = sourceToHrefMap();
  let extractedTitle = "";
  let extractedDescription = "";
  const headings: DocHeading[] = [];

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(() => {
      return (tree: any) => {
        if (Array.isArray(tree.children)) {
          const nextChildren: any[] = [];
          let removedTitle = false;
          for (const child of tree.children) {
            if (!removedTitle && child.type === "heading" && child.depth === 1) {
              extractedTitle = toString(child).trim();
              removedTitle = true;
              continue;
            }
            nextChildren.push(child);
          }
          tree.children = nextChildren;
        }

        const slugger = new GithubSlugger();

        visit(tree, "paragraph", (node) => {
          if (!extractedDescription) {
            const text = toString(node).trim();
            if (text) {
              extractedDescription = text;
            }
          }
        });

        visit(tree, "heading", (node: any) => {
          const text = toString(node).trim();
          if (!text) {
            return;
          }
          const id = slugger.slug(text);
          if ((node.depth === 2 || node.depth === 3) && text) {
            headings.push({
              depth: node.depth,
              id,
              text,
            });
          }
        });

        visit(tree, "link", (node: any) => {
          if (typeof node.url !== "string") {
            return;
          }
          node.url = rewriteInternalDocLink(relativeSource, node.url, knownLinks);
        });
      };
    })
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "append",
      properties: {
        className: ["docs-heading-anchor"],
        ariaLabel: "Link to section",
      },
    })
    .use(rehypeStringify);

  const html = String(await processor.process(source));
  return {
    title: extractedTitle,
    description: extractedDescription,
    headings,
    html,
  };
}

const loadDocs = cache(async (): Promise<DocPage[]> => {
  await ensureDocsSourcesExist();

  const groupLookup = new Map(GROUP_DEFINITIONS.map((group) => [group.id, group]));
  const docs = await Promise.all(
    DOC_DEFINITIONS.map(async (definition) => {
      const filePath = safeFilePath(definition.source);
      const raw = await fsp.readFile(filePath, "utf8");
      const matterResult = matter(raw);
      const parsed = await parseMarkdownDocument(matterResult.content, definition.source.replace(/\\/g, "/"));
      const group = groupLookup.get(definition.group);
      if (!group) {
        throw new Error(`Unknown documentation group for ${definition.source}`);
      }
      const title = parsed.title || definition.slug || "Documentation";
      const description = definition.description || parsed.description || `Documentation source: pdftools-documentation/${definition.source}`;
      return {
        slug: definition.slug,
        href: definition.slug ? `/docs/${definition.slug}` : "/docs",
        title,
        description,
        html: parsed.html,
        headings: parsed.headings,
        source: definition.source,
        groupId: definition.group,
        groupTitle: group.title,
        noindex: Boolean(definition.noindex),
        operational: Boolean(definition.operational),
      } satisfies DocPage;
    }),
  );

  return docs;
});

export async function getAllDocs() {
  return loadDocs();
}

export async function getDocsForNavigation(): Promise<DocGroup[]> {
  const docs = await getAllDocs();
  const visibleDocs = docs.filter((doc) => doc.slug !== "");
  return GROUP_DEFINITIONS.map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description,
    items: visibleDocs
      .filter((doc) => doc.groupId === group.id)
      .map((doc) => ({
        slug: doc.slug,
        href: doc.href,
        title: doc.title,
        description: doc.description,
      })),
  })).filter((group) => group.items.length > 0);
}

export async function getDocsLandingDocument() {
  const docs = await getAllDocs();
  return docs.find((doc) => doc.slug === "") ?? null;
}

export async function getDocBySlug(slug: string) {
  const docs = await getAllDocs();
  return docs.find((doc) => doc.slug === slug) ?? null;
}

export async function getDocPagination(slug: string) {
  const docs = await getAllDocs();
  const orderedDocs = docs.filter((doc) => doc.slug !== "");
  const index = orderedDocs.findIndex((doc) => doc.slug === slug);
  return {
    previous: index > 0 ? orderedDocs[index - 1] : null,
    next: index >= 0 && index < orderedDocs.length - 1 ? orderedDocs[index + 1] : null,
  };
}

export function isNoindexDoc(slug: string) {
  return NOINDEX_SLUGS.has(slug);
}

export function isOperationalDoc(slug: string) {
  return DOC_DEFINITIONS.some((definition) => definition.slug === slug && definition.operational);
}

export function docsStaticParams() {
  return DOC_DEFINITIONS.filter((definition) => definition.slug).map((definition) => ({
    slug: [definition.slug],
  }));
}
