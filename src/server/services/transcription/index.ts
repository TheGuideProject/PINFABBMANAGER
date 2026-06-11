export type TranscriptionResult = {
  text: string;
  language: string | null;
  durationSec: number | null;
  provider: string;
};

export interface TranscriptionService {
  transcribe(audio: Buffer, mimeType: string): Promise<TranscriptionResult>;
}

/** OpenAI Whisper (whisper-1, ~$0.006/min). Swap by adding another implementation. */
const whisperService: TranscriptionService = {
  async transcribe(audio, mimeType) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const extension = mimeType.includes("webm")
      ? "webm"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
        ? "m4a"
        : mimeType.includes("ogg")
          ? "ogg"
          : "webm";

    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array(audio)], `meeting.${extension}`, { type: mimeType }),
    );
    formData.set("model", "whisper-1");
    formData.set("response_format", "verbose_json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Whisper API ${response.status}: ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      text: string;
      language?: string;
      duration?: number;
    };

    return {
      text: payload.text,
      language: payload.language ?? null,
      durationSec: payload.duration ? Math.round(payload.duration) : null,
      provider: "openai-whisper-1",
    };
  },
};

export const transcription: TranscriptionService = whisperService;
