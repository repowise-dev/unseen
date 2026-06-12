// Trigger detectors — pure predicates over transcript text. To add one:
// write a function here, register it in DETECTORS, document it in
// docs/extending/detector.md, and add its name to KNOWN_DETECTORS in
// src/shared/profile-schema.ts.

export interface DetectorContext {
  /** Text accumulated since the last answer. */
  newText: string;
  /** Last few finals, for patterns that look at the tail of the conversation. */
  recentText: string;
  keywords: string[];
}

export type Detector = (ctx: DetectorContext) => boolean;

/** Questions: "?", or sentence-ish chunks ending in interrogative shapes. */
export const question: Detector = ({ newText }) => {
  if (!newText) return false;
  const lower = newText.toLowerCase();
  if (lower.includes('?')) return true;
  const chunks = lower
    .split(/[.?!]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const triggers = [
    /\b(can|could|would|will|should|do|does|did|is|are|was|were|have|has|how|what|why|when|where|which|who|any)\b[^.?!]{0,120}$/,
    /\btell us\b|\bshow us\b|\bwalk us through\b|\bwhat about\b|\bhow about\b|\byour take\b|\bthoughts on\b|\bwhat do you\b|\bcurious (about|how|if|whether)\b/,
  ];
  return chunks.some((chunk) => triggers.some((r) => r.test(chunk)));
};

/** Imperative requests: "show me", "walk us through", "explain", ... */
export const request: Detector = ({ newText }) => {
  if (!newText) return false;
  const chunks = newText
    .toLowerCase()
    .split(/[.?!]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const r =
    /\b(show|write|give|explain|walk|tell|describe|demo|code|implement|build|draft|share|elaborate|clarify|compare|design|summarize|recap)\b[^.?!]{0,120}$/;
  return chunks.some((chunk) => r.test(chunk));
};

/** Explicit code requests — fires the answer in code mode. */
export const codeRequest: Detector = ({ recentText }) => {
  const patterns = [
    /write\s+(the\s+)?code/i,
    /code\s+(it|this|that)\s+(up|out)/i,
    /implement\s+(this|that|it)/i,
    /show\s+me\s+(the\s+)?(code|implementation)/i,
    /can\s+you\s+code/i,
    /let'?s\s+(see|write)\s+(the\s+)?code/i,
    /give\s+me\s+(the\s+)?(code|implementation)/i,
    /in\s+(python|java|javascript|typescript|go|rust|c\+\+|c#)\b/i,
  ];
  return patterns.some((r) => r.test(recentText));
};

/** Profile-configured keywords (e.g. "pricing", "competitor"). */
export const keyword: Detector = ({ newText, keywords }) => {
  if (!keywords.length || !newText) return false;
  const lower = newText.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
};

export const DETECTORS: Record<string, Detector> = {
  question,
  request,
  'code-request': codeRequest,
  keyword,
};
