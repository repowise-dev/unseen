import { z } from 'zod';

export const KNOWN_DETECTORS = ['question', 'request', 'code-request', 'keyword'] as const;

export const ProfileSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
  name: z.string().min(1),
  description: z.string().default(''),
  icon: z.string().default('💬'),
  llm: z
    .object({
      model: z.string().optional(),
      maxTokens: z.number().int().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
  prompt: z.object({
    system: z.string().min(1),
    response_style: z.enum(['spoken', 'notes', 'code-first']).default('spoken'),
    language: z.string().default('auto'),
  }),
  knowledge: z
    .object({
      prompt_label: z.string().default('REFERENCE KNOWLEDGE'),
      files: z.array(z.string()).default([]),
    })
    .default({ prompt_label: 'REFERENCE KNOWLEDGE', files: [] }),
  triggers: z
    .object({
      auto: z.boolean().default(true),
      detectors: z
        .array(z.string())
        .default(['question', 'request'])
        .refine((ds) => ds.every((d) => (KNOWN_DETECTORS as readonly string[]).includes(d)), {
          message: `unknown detector; known: ${KNOWN_DETECTORS.join(', ')}`,
        }),
      keywords: z.array(z.string()).default([]),
      debounce_ms: z.number().int().nonnegative().default(1500),
      min_chars: z.number().int().nonnegative().default(8),
    })
    .default({
      auto: true,
      detectors: ['question', 'request'],
      keywords: [],
      debounce_ms: 1500,
      min_chars: 8,
    }),
  memory: z
    .object({
      namespaces: z.array(z.enum(['personal', 'work'])).default([]),
    })
    .optional(),
  transcript: z
    .object({
      window_chars: z.number().int().positive().optional(),
      retention_min: z.number().positive().optional(),
    })
    .optional(),
});

export type ProfileParsed = z.infer<typeof ProfileSchema>;
