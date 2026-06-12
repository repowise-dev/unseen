import { DETECTORS, type DetectorContext } from './detectors';

export interface TriggerConfig {
  auto: boolean;
  detectors: string[];
  keywords: string[];
  min_chars: number;
}

export interface TriggerResult {
  fire: boolean;
  codeMode: boolean;
  detector?: string;
}

const NO_FIRE: TriggerResult = { fire: false, codeMode: false };

export function evaluateTriggers(
  cfg: TriggerConfig,
  input: { newText: string; recentText: string },
): TriggerResult {
  if (!cfg.auto) return NO_FIRE;
  if (!input.newText || input.newText.length < cfg.min_chars) return NO_FIRE;

  const ctx: DetectorContext = { ...input, keywords: cfg.keywords };

  // Code requests always force code mode, even if 'code-request' isn't in the
  // profile's detector list, as long as some detector fires.
  const codeMode = DETECTORS['code-request'](ctx);

  for (const name of cfg.detectors) {
    const detector = DETECTORS[name];
    if (detector && detector(ctx)) {
      return { fire: true, codeMode: codeMode || name === 'code-request', detector: name };
    }
  }
  return NO_FIRE;
}
