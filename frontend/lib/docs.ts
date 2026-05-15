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

export type DocAudience = "user" | "technical";

type DocGroupId =
  | "help-getting-started"
  | "help-pdf-tools"
  | "help-image-tools"
  | "help-file-handling"
  | "help-troubleshooting"
  | "help-contact"
  | "dev-product"
  | "dev-architecture"
  | "dev-operations"
  | "dev-security"
  | "dev-testing";

type DocDefinition = {
  audience: DocAudience;
  description?: string;
  group: DocGroupId;
  noindex?: boolean;
  operational?: boolean;
  slug: string;
  source: string;
};

export type DocLink = {
  audience: DocAudience;
  description: string;
  groupId: DocGroupId;
  groupTitle: string;
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
  headings: DocHeading[];
  html: string;
  noindex: boolean;
  operational: boolean;
  source: string;
};

export type DocGroup = {
  audience: DocAudience;
  description: string;
  id: DocGroupId;
  items: DocLink[];
  title: string;
};

const GROUP_DEFINITIONS: Array<{
  audience: DocAudience;
  description: string;
  id: DocGroupId;
  title: string;
}> = [
  {
    id: "help-getting-started",
    title: "Getting Started",
    description: "Start here to learn what PDFTools does and how uploads, settings, processing, and downloads work.",
    audience: "user",
  },
  {
    id: "help-pdf-tools",
    title: "PDF Tools",
    description: "Compare common PDF workflows such as merge, split, compress, convert, protect, decrypt, watermark, and OCR.",
    audience: "user",
  },
  {
    id: "help-image-tools",
    title: "Image Tools",
    description: "Find the right workflow for resizing, compressing, converting, cropping, rotating, watermarking, OCR, and background removal.",
    audience: "user",
  },
  {
    id: "help-file-handling",
    title: "File Handling and Privacy",
    description: "Understand how uploaded files are processed and what to consider before uploading sensitive content.",
    audience: "user",
  },
  {
    id: "help-troubleshooting",
    title: "Troubleshooting",
    description: "Get quick fixes for upload issues, failed jobs, missing downloads, OCR problems, and preview glitches.",
    audience: "user",
  },
  {
    id: "help-contact",
    title: "Contact and Support",
    description: "Know when to contact support, what details to include, and where business or API questions should go.",
    audience: "user",
  },
  {
    id: "dev-product",
    title: "For Developers and Operators: Product Context",
    description: "Product scope, feature inventory, documentation map, and deeper project orientation.",
    audience: "technical",
  },
  {
    id: "dev-architecture",
    title: "For Developers and Operators: Architecture",
    description: "Architecture, APIs, services, frontend systems, file flow, queues, and supporting diagrams.",
    audience: "technical",
  },
  {
    id: "dev-operations",
    title: "For Developers and Operators: Operations",
    description: "Deployment, environment, release workflow, external tooling, and runtime operations.",
    audience: "technical",
  },
  {
    id: "dev-security",
    title: "For Developers and Operators: Security and Support",
    description: "Security notes, support playbooks, rate limiting, retention details, and operational troubleshooting.",
    audience: "technical",
  },
  {
    id: "dev-testing",
    title: "For Developers and Operators: Testing and Future Work",
    description: "Testing, roadmap items, smoke checks, contributing guidance, and future platform direction.",
    audience: "technical",
  },
];

const DOC_DEFINITIONS: DocDefinition[] = [
  {
    slug: "",
    source: "docs/help-center.md",
    group: "help-getting-started",
    audience: "user",
    description: "Start here for a quick overview of the help center and file-handling guidance.",
  },
  {
    slug: "getting-started",
    source: "docs/getting-started.md",
    group: "help-getting-started",
    audience: "user",
    description: "Learn how to choose tools, upload files, adjust settings, run jobs, and download results.",
  },
  {
    slug: "pdf-tools",
    source: "docs/pdf-tools-help.md",
    group: "help-pdf-tools",
    audience: "user",
    description: "Compare the available PDF workflows, including merge, split, convert, watermark, protect, and OCR.",
  },
  {
    slug: "image-tools",
    source: "docs/image-tools-help.md",
    group: "help-image-tools",
    audience: "user",
    description: "Compare the available image workflows, including resize, compress, convert, crop, rotate, watermark, and OCR.",
  },
  {
    slug: "file-handling-and-privacy",
    source: "docs/file-handling-and-privacy.md",
    group: "help-file-handling",
    audience: "user",
    description: "Understand how files are processed, what the service is designed to do, and when to use caution.",
  },
  {
    slug: "troubleshooting",
    source: "docs/troubleshooting-user.md",
    group: "help-troubleshooting",
    audience: "user",
    description: "Get practical troubleshooting help for uploads, OCR, downloads, previews, watermark visibility, and rate limits.",
  },
  {
    slug: "contact-and-support",
    source: "docs/contact-and-support.md",
    group: "help-contact",
    audience: "user",
    description: "Find the right contact channel for support, business questions, API interest, and feature suggestions.",
  },

  {
    slug: "developer-overview",
    source: "README.md",
    group: "dev-product",
    audience: "technical",
    description: "Technical entry point to the full project documentation set.",
  },
  {
    slug: "documentation",
    source: "DOCUMENTATION.md",
    group: "dev-product",
    audience: "technical",
    description: "Documentation map, reading order, and maintenance rules.",
  },
  {
    slug: "topics",
    source: "docs/README.md",
    group: "dev-product",
    audience: "technical",
    description: "Index of deeper topic pages.",
  },
  {
    slug: "product-overview",
    source: "docs/product-overview.md",
    group: "dev-product",
    audience: "technical",
    description: "Product definition, target users, public policy, and scope boundaries.",
  },
  {
    slug: "features",
    source: "FEATURES.md",
    group: "dev-product",
    audience: "technical",
    description: "Product-wide feature matrix across routes, workers, and services.",
  },
  {
    slug: "features-index",
    source: "docs/features-index.md",
    group: "dev-product",
    audience: "technical",
    description: "Cross-index of tools and platform features.",
  },

  {
    slug: "frontend-routes",
    source: "docs/frontend-routes.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Frontend route inventory, purpose, and page behavior.",
  },
  {
    slug: "workspace-system",
    source: "docs/workspace-system.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Shared workspace architecture and layout behavior.",
  },
  {
    slug: "tool-workflows",
    source: "docs/tool-workflows.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Generic upload-to-download lifecycle across tools.",
  },
  {
    slug: "theme-and-branding",
    source: "docs/theme-and-branding.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Brand, theme, and visual system guidance.",
  },
  {
    slug: "mobile-ui",
    source: "docs/mobile-ui.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Mobile interaction rules, drawers, and QA expectations.",
  },
  {
    slug: "api-reference",
    source: "API_REFERENCE.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Route-family API summary and common response patterns.",
  },
  {
    slug: "backend-api",
    source: "docs/backend-api.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Detailed backend route notes and request and response behavior.",
  },
  {
    slug: "architecture",
    source: "ARCHITECTURE.md",
    group: "dev-architecture",
    audience: "technical",
    description: "System architecture, boundaries, and request and data flow.",
  },
  {
    slug: "backend-services",
    source: "docs/backend-services.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Service-layer responsibilities and shared backend logic.",
  },
  {
    slug: "workers-and-queues",
    source: "docs/workers-and-queues.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Queue usage, task routing, and operational worker behavior.",
  },
  {
    slug: "celery-workers",
    source: "docs/celery-workers.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Celery app, workers, routing, and inspection commands.",
  },
  {
    slug: "data-flow-diagrams",
    source: "docs/data-flow-diagrams.md",
    group: "dev-architecture",
    audience: "technical",
    description: "ASCII diagrams of uploads, jobs, downloads, and rate limiting.",
  },
  {
    slug: "frontend-components",
    source: "docs/frontend-components.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Major frontend component systems and how they fit together.",
  },
  {
    slug: "upload-preview-download-flow",
    source: "docs/upload-preview-download-flow.md",
    group: "dev-architecture",
    audience: "technical",
    description: "File lifecycle from upload through preview, job, and download.",
  },
  {
    slug: "file-storage-and-retention",
    source: "docs/file-storage-and-retention.md",
    group: "dev-architecture",
    audience: "technical",
    description: "Storage directories, cleanup, retention, and disk usage guidance.",
  },

  {
    slug: "deployment",
    source: "DEPLOYMENT.md",
    group: "dev-operations",
    audience: "technical",
    description: "Production deployment, restart, verification, and rollback steps.",
    noindex: true,
    operational: true,
  },
  {
    slug: "deployment-vps",
    source: "docs/deployment-vps.md",
    group: "dev-operations",
    audience: "technical",
    description: "VPS-focused deployment details and runtime checks.",
    noindex: true,
    operational: true,
  },
  {
    slug: "environment",
    source: "ENVIRONMENT.md",
    group: "dev-operations",
    audience: "technical",
    description: "Tracked env templates, runtime rules, and safe production values.",
  },
  {
    slug: "environment-variables",
    source: "docs/environment-variables.md",
    group: "dev-operations",
    audience: "technical",
    description: "Detailed environment variable reference and risk notes.",
  },
  {
    slug: "production-checklist",
    source: "PRODUCTION_CHECKLIST.md",
    group: "dev-operations",
    audience: "technical",
    description: "Release and deploy checklist for production verification.",
    operational: true,
  },
  {
    slug: "production-env",
    source: "PRODUCTION_ENV.md",
    group: "dev-operations",
    audience: "technical",
    description: "Safe production backend env template and VPS update command.",
    noindex: true,
    operational: true,
  },
  {
    slug: "operations",
    source: "OPERATIONS.md",
    group: "dev-operations",
    audience: "technical",
    description: "Daily and weekly operator guide with PM2, Redis, and disk checks.",
    noindex: true,
    operational: true,
  },
  {
    slug: "release-process",
    source: "docs/release-process.md",
    group: "dev-operations",
    audience: "technical",
    description: "Release workflow, deployment coordination, and post-release checks.",
    noindex: true,
    operational: true,
  },
  {
    slug: "pre-commit-final-check",
    source: "PRE_COMMIT_FINAL_CHECK.md",
    group: "dev-operations",
    audience: "technical",
    description: "Local pre-commit and post-push deployment commands.",
    noindex: true,
    operational: true,
  },
  {
    slug: "local-development-windows",
    source: "docs/local-development-windows.md",
    group: "dev-operations",
    audience: "technical",
    description: "Windows local development setup and command reference.",
  },
  {
    slug: "external-tools",
    source: "docs/external-tools.md",
    group: "dev-operations",
    audience: "technical",
    description: "External command dependencies used by the platform.",
  },

  {
    slug: "security",
    source: "SECURITY.md",
    group: "dev-security",
    audience: "technical",
    description: "Security model, abuse controls, and hardening notes.",
  },
  {
    slug: "security-hardening",
    source: "docs/security-hardening.md",
    group: "dev-security",
    audience: "technical",
    description: "Practical hardening details for uploads, subprocesses, and SVG.",
  },
  {
    slug: "error-handling",
    source: "docs/error-handling.md",
    group: "dev-security",
    audience: "technical",
    description: "Safe error payloads, logging boundaries, and UI behavior.",
  },
  {
    slug: "troubleshooting-index",
    source: "docs/troubleshooting-index.md",
    group: "dev-security",
    audience: "technical",
    description: "Quick troubleshooting entry points by symptom.",
  },
  {
    slug: "known-limitations",
    source: "docs/known-limitations.md",
    group: "dev-security",
    audience: "technical",
    description: "Current gaps, partial implementations, and operational caveats.",
  },
  {
    slug: "support",
    source: "SUPPORT.md",
    group: "dev-security",
    audience: "technical",
    description: "Support expectations, contact channels, and triage rules.",
  },
  {
    slug: "support-playbook",
    source: "docs/support-playbook.md",
    group: "dev-security",
    audience: "technical",
    description: "Maintainer-side playbook for first-pass support handling.",
    noindex: true,
    operational: true,
  },
  {
    slug: "mail-and-contact",
    source: "docs/mail-and-contact.md",
    group: "dev-security",
    audience: "technical",
    description: "Mail host, support and contact split, aliases, and DNS notes.",
  },
  {
    slug: "rate-limiting",
    source: "docs/rate-limiting.md",
    group: "dev-security",
    audience: "technical",
    description: "Per-tool and per-bucket rate limiting behavior and frontend handling.",
  },

  {
    slug: "testing-and-smoke-tests",
    source: "docs/testing-and-smoke-tests.md",
    group: "dev-testing",
    audience: "technical",
    description: "Validation commands and high-value manual smoke tests.",
  },
  {
    slug: "smoke-test-results-template",
    source: "docs/smoke-test-results-template.md",
    group: "dev-testing",
    audience: "technical",
    description: "Reusable template for documenting smoke-test runs.",
  },
  {
    slug: "troubleshooting-ops",
    source: "TROUBLESHOOTING.md",
    group: "dev-testing",
    audience: "technical",
    description: "Operational symptom-to-fix troubleshooting matrix.",
  },
  {
    slug: "roadmap",
    source: "ROADMAP.md",
    group: "dev-testing",
    audience: "technical",
    description: "Planned future work only.",
  },
  {
    slug: "future-api-platform",
    source: "docs/future-api-platform.md",
    group: "dev-testing",
    audience: "technical",
    description: "Planned API and auth platform direction at api.wellfriend.online.",
  },
  {
    slug: "contributing",
    source: "CONTRIBUTING.md",
    group: "dev-testing",
    audience: "technical",
    description: "Local setup, change process, and contributor expectations.",
  },
  {
    slug: "changelog",
    source: "CHANGELOG.md",
    group: "dev-testing",
    audience: "technical",
    description: "Documentation changelog for the current repo state.",
  },
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

type MarkdownNode = {
  children?: MarkdownNode[];
  depth?: number;
  type: string;
  url?: string;
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
      return (tree: MarkdownNode) => {
        if (Array.isArray(tree.children)) {
          const nextChildren: MarkdownNode[] = [];
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

        visit(tree, "heading", (node: MarkdownNode) => {
          const text = toString(node).trim();
          if (!text) {
            return;
          }
          const id = slugger.slug(text);
          if (node.depth === 2 || node.depth === 3) {
            headings.push({
              depth: node.depth,
              id,
              text,
            });
          }
        });

        visit(tree, "link", (node: MarkdownNode) => {
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
      const description =
        definition.description ||
        parsed.description ||
        `Documentation source: pdftools-documentation/${definition.source}`;

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
        audience: definition.audience,
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
    audience: group.audience,
    items: visibleDocs
      .filter((doc) => doc.groupId === group.id)
      .map((doc) => ({
        slug: doc.slug,
        href: doc.href,
        title: doc.title,
        description: doc.description,
        audience: doc.audience,
        groupId: doc.groupId,
        groupTitle: doc.groupTitle,
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
