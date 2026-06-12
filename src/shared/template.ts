// Tiny mustache subset for profile prompts: {{var}} substitution and
// {{#section}}...{{/section}} conditional blocks. Deliberately no loops,
// partials, or escaping — prompts are trusted local config, not user input
// from the network.

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
  sections: Record<string, boolean> = {},
): string {
  let out = template.replace(
    /\{\{#([\w-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, name: string, body: string) => (sections[name] ? body : ''),
  );
  out = out.replace(/\{\{([\w-]+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
  return out;
}
