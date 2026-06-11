import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;

export function claude() {
  if (!client) client = new Anthropic();
  return client;
}

export function aiEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
};

/**
 * Structured extraction call: adaptive thinking + JSON-schema-constrained
 * output. Returns the parsed JSON of the first text block.
 */
export async function extractStructured<T>({
  system,
  userContent,
  schema,
  maxTokens = 16000,
}: {
  system: string;
  userContent: Anthropic.ContentBlockParam[];
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<{ data: T; usage: AiUsage }> {
  const response = await claude().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: { type: "json_schema", schema } },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AI_REFUSAL");
  }

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("AI_EMPTY_RESPONSE");

  return {
    data: JSON.parse(text.text) as T,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/** Free-text generation (report sections). Streams to tolerate long outputs. */
export async function generateText({
  system,
  userContent,
  maxTokens = 32000,
}: {
  system: string;
  userContent: Anthropic.ContentBlockParam[];
  maxTokens?: number;
}): Promise<{ text: string; usage: AiUsage }> {
  const stream = claude().messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: userContent }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("AI_REFUSAL");

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

/** Base64 image block helper for vision calls. */
export function imageBlock(
  data: Buffer,
  mimeType: string,
): Anthropic.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
      data: data.toString("base64"),
    },
  };
}
