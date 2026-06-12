import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../src/shared/template';

describe('renderTemplate', () => {
  it('substitutes variables', () => {
    expect(renderTemplate('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  it('leaves unknown variables intact', () => {
    expect(renderTemplate('hi {{unknown}}', {})).toBe('hi {{unknown}}');
  });

  it('keeps section content when enabled', () => {
    expect(renderTemplate('a{{#k}} kept{{/k}} b', {}, { k: true })).toBe('a kept b');
  });

  it('drops section content when disabled', () => {
    expect(renderTemplate('a{{#k}} dropped{{/k}} b', {}, { k: false })).toBe('a b');
  });

  it('handles multiline sections with variables inside', () => {
    const out = renderTemplate('{{#know}}Use {{label}}.\n{{/know}}Done', { label: 'DOCS' }, { know: true });
    expect(out).toBe('Use DOCS.\nDone');
  });
});
