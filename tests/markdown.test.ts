import { describe, it, expect } from 'vitest';
import { renderMarkdown, escapeHtml } from '../src/renderer/overlay/markdown';

describe('renderMarkdown', () => {
  it('renders fenced code blocks with language class', () => {
    const html = renderMarkdown('before\n```ts\nconst x = 1;\n```\nafter');
    expect(html).toContain('<pre><code class="lang-ts">const x = 1;\n</code></pre>');
    expect(html).toContain('before');
    expect(html).toContain('after');
  });

  it('closes an unbalanced trailing fence so streaming code renders immediately', () => {
    const html = renderMarkdown('answer:\n```py\nprint("hi")');
    expect(html).toContain('<pre><code class="lang-py">');
    expect(html).not.toContain('```');
  });

  it('escapes HTML in code and prose', () => {
    const html = renderMarkdown('a <script> tag and ```\n<b>code</b>\n```');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;code&lt;/b&gt;');
  });

  it('renders inline code and bold outside fences', () => {
    const html = renderMarkdown('use `npm i` and **really** mean it');
    expect(html).toContain('<code>npm i</code>');
    expect(html).toContain('<strong>really</strong>');
  });
});

describe('escapeHtml', () => {
  it('escapes all five specials', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
