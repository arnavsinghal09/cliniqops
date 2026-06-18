"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";

interface SpeechRecognitionResult {
  0: { transcript: string };
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type ExtendedWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

export default function VoiceInput({
  onTranscript,
  onComplete,
}: {
  onTranscript: (text: string) => void;
  onComplete: (finalText: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const finalRef = useRef("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const start = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setActive(false);
      return;
    }

    const w = window as ExtendedWindow;
    const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setTip("Voice input requires Chrome or Edge");
      setTimeout(() => setTip(null), 2500);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = Array.from({ length: event.results.length }, (_, i) =>
        event.results[i][0].transcript,
      ).join("");
      finalRef.current = transcript;
      onTranscript(transcript);
    };
    recognition.onend = () => {
      setActive(false);
      recognitionRef.current = null;
      if (finalRef.current.trim()) onComplete(finalRef.current.trim());
    };
    recognition.onerror = () => {
      setActive(false);
      recognitionRef.current = null;
    };

    finalRef.current = "";
    recognition.start();
    recognitionRef.current = recognition;
    setActive(true);
  };

  return (
    <div style={{ position: "relative" }}>
      <style>{`@keyframes vi-pulse{0%,100%{box-shadow:0 0 0 0 rgba(180,66,58,.4)}70%{box-shadow:0 0 0 10px rgba(180,66,58,0)}}.vi-active{animation:vi-pulse 1.5s infinite}@media(prefers-reduced-motion:reduce){.vi-active{animation:none}}`}</style>
      <button
        type="button"
        onClick={start}
        className={active ? "vi-active" : ""}
        title="Voice input"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `1px solid ${active ? "#B4423A" : "#E3DDD3"}`,
          background: active ? "#F7ECEA" : "#EDE6DF",
          color: active ? "#B4423A" : "#4A352E",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Mic size={18} />
      </button>
      {tip && (
        <span
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            whiteSpace: "nowrap",
            fontSize: 11.5,
            color: "#8A827A",
            background: "#FBFAF7",
            border: "1px solid #E3DDD3",
            borderRadius: 4,
            padding: "3px 8px",
          }}
        >
          {tip}
        </span>
      )}
    </div>
  );
}
