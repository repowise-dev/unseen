// Minimal streaming-safe markdown → HTML: fenced code blocks, inline code,
// bold. Closes a still-open trailing fence so streaming code renders as a
// block immediately instead of showing raw backticks until the close arrives.
// Pure string → string; unit-tested.

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as const)[
        c as '&' | '<' | '>' | '"' | "'"
      ],
  );
}

export function renderMarkdown(text: string): string {
  const fenceCount = (text.match(/```/g) ?? []).length;
  const normalized = fenceCount % 2 === 1 ? text + '\n```' : text;
  const parts = normalized.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part) => {
      if (part.startsWith('```')) {
        const m = part.match(/^```(\w+)?\n?([\s\S]*?)```$/);
        const lang = m?.[1] ?? '';
        const code = m?.[2] ?? part.replace(/```/g, '');
        return `<pre><code class="lang-${lang}">${escapeHtml(code)}</code></pre>`;
      }
      return escapeHtml(part)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    })
    .join('');
}
