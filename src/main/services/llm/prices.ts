// USD per million tokens. Best-effort static table for the in-app cost
// estimate — PRs updating this file are welcome. Unknown models show token
// counts without a dollar figure.

interface Price {
  input: number;
  output: number;
  cacheRead?: number;
}

const PRICES: Record<string, Price> = {
  'claude-sonnet-4-6': { input: 3, output: 15, cacheRead: 0.3 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gpt-5-mini': { input: 0.25, output: 2, cacheRead: 0.025 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const cached = p.cacheRead !== undefined ? cacheReadTokens : 0;
  return (
    ((inputTokens - cached) * p.input +
      cached * (p.cacheRead ?? 0) +
      outputTokens * p.output) /
    1_000_000
  );
}
