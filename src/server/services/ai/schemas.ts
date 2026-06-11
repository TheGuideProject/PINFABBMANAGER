// JSON schema for structured criticality extraction (output_config.format).
// Enums mirror prisma/schema.prisma — keep in sync.

export const CRITICALITY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const CRITICALITY_CATEGORIES = [
  "SCHEDULE_CONFLICT",
  "TOLERANCE_OUT_OF_SPEC",
  "LEAK",
  "DAMAGE",
  "SAFETY",
  "LOGISTICS",
  "QUALITY",
  "OTHER",
] as const;

export type ExtractedCriticality = {
  severity: (typeof CRITICALITY_SEVERITIES)[number];
  category: (typeof CRITICALITY_CATEGORIES)[number];
  title: string;
  description: string;
  recommendedAction: string;
  finPosition: "PORT" | "STARBOARD" | null;
  confidence: number;
};

export type CriticalityExtraction = {
  criticalities: ExtractedCriticality[];
  summary: string;
};

export const criticalityExtractionSchema = {
  type: "object",
  properties: {
    criticalities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: [...CRITICALITY_SEVERITIES] },
          category: { type: "string", enum: [...CRITICALITY_CATEGORIES] },
          title: {
            type: "string",
            description: "Short actionable headline (max ~80 chars), in English.",
          },
          description: {
            type: "string",
            description:
              "What was observed, why it matters for the job, citing the source (log notes, measurement, meeting statement).",
          },
          recommendedAction: {
            type: "string",
            description: "Concrete next step the office/manager should take.",
          },
          finPosition: {
            type: ["string", "null"],
            enum: ["PORT", "STARBOARD", null],
            description: "Affected fin if identifiable, else null.",
          },
          confidence: {
            type: "number",
            description: "0-1 confidence that this is a real, relevant issue.",
          },
        },
        required: [
          "severity",
          "category",
          "title",
          "description",
          "recommendedAction",
          "finPosition",
          "confidence",
        ],
        additionalProperties: false,
      },
    },
    summary: {
      type: "string",
      description: "1-2 sentence overall assessment of the analyzed content.",
    },
  },
  required: ["criticalities", "summary"],
  additionalProperties: false,
} as const;
