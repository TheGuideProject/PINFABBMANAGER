"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Mic, Pause, Play, Square, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  finalizeRecording,
  getRecordingUploadUrl,
} from "@/server/actions/recordings";

type Phase = "idle" | "recording" | "paused" | "review" | "uploading";

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MeetingRecorder({ projectId }: { projectId: string }) {
  const t = useTranslations("meeting");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 32_000, // mono speech: ~14MB/hour, under Whisper's 25MB cap
      });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      elapsedRef.current = 0;
      setElapsed(0);
      startTimer();
      setPhase("recording");
    } catch {
      toast.error(t("micDenied"));
    }
  };

  const pause = () => {
    recorderRef.current?.pause();
    stopTimer();
    setPhase("paused");
  };
  const resume = () => {
    recorderRef.current?.resume();
    startTimer();
    setPhase("recording");
  };
  const stop = () => {
    recorderRef.current?.stop();
    stopTimer();
    setPhase("review");
  };
  const discard = () => {
    setBlob(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase("idle");
  };

  const upload = async () => {
    if (!blob) return;
    setPhase("uploading");
    try {
      const mimeType = blob.type || "audio/webm";
      const target = await getRecordingUploadUrl(projectId, mimeType);
      const putResponse = await fetch(target.url, {
        method: target.method,
        headers: { "Content-Type": mimeType },
        body: blob,
      });
      if (!putResponse.ok) throw new Error("upload");

      const result = await finalizeRecording({
        projectId,
        storageKey: target.key,
        mimeType,
        durationSec: elapsedRef.current || null,
      });
      if (!result.ok) throw new Error(result.error);

      toast.success(t("sent"));
      discard();
      router.refresh();
    } catch {
      toast.error(t("uploadFailed"));
      setPhase("review");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>

        <div className="flex items-center justify-center py-2">
          <div className="text-3xl font-semibold tabular-nums">
            {formatElapsed(elapsed)}
          </div>
        </div>

        {phase === "idle" ? (
          <Button onClick={start} size="lg" className="w-full">
            <Mic className="size-5" aria-hidden /> {t("record")}
          </Button>
        ) : null}

        {phase === "recording" || phase === "paused" ? (
          <div className="flex gap-2">
            {phase === "recording" ? (
              <Button onClick={pause} variant="outline" className="flex-1">
                <Pause className="size-4" aria-hidden /> {t("pause")}
              </Button>
            ) : (
              <Button onClick={resume} variant="outline" className="flex-1">
                <Play className="size-4" aria-hidden /> {t("resume")}
              </Button>
            )}
            <Button onClick={stop} variant="destructive" className="flex-1">
              <Square className="size-4" aria-hidden /> {t("stop")}
            </Button>
          </div>
        ) : null}

        {phase === "review" && blob ? (
          <div className="space-y-3">
            <audio controls src={URL.createObjectURL(blob)} className="w-full" />
            <div className="flex gap-2">
              <Button onClick={discard} variant="outline" className="flex-1">
                <Trash2 className="size-4" aria-hidden /> {t("discard")}
              </Button>
              <Button onClick={upload} className="flex-1">
                <UploadCloud className="size-4" aria-hidden />{" "}
                {t("uploadAndTranscribe")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "uploading" ? (
          <Button disabled size="lg" className="w-full">
            <Loader2 className="size-5 animate-spin" aria-hidden /> {t("uploading")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
