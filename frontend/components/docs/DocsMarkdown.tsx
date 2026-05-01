export function DocsMarkdown({ html }: { html: string }) {
  return (
    <article
      className="docs-prose tool-panel min-w-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
