"use client";

import { useRef, useState } from "react";
import { Mic } from "lucide-react";
import { getScribeToken } from "@/app/(dashboard)/consultations/token-action";

// Identical to the scribe's PCM conversion — 16-bit little-endian for AssemblyAI.
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, s, true);
  }
  return buffer;
}

export default function VoiceInput({
  onTranscript,
  onComplete,
}: {
  onTranscript: (text: string) => void;
  onComplete: (finalText: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [tip, setTip] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Text committed from completed turns; survives interim updates.
  const committedRef = useRef("");
  // Prevents double-clicks while async startup is in flight.
  const startingRef = useRef(false);

  const showTip = (msg: string, ms = 3000) => {
    setTip(msg);
    setTimeout(() => setTip(null), ms);
  };

  const teardown = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      wsRef.current.onclose = null; // prevent the onclose handler from re-entering
      wsRef.current.close();
      wsRef.current = null;
    }
    processorRef.current?.disconnect();
    processorRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleClick = () => {
    if (active) {
      teardown();
      setActive(false);
      const final = committedRef.current.trim();
      committedRef.current = "";
      if (final) onComplete(final);
      return;
    }

    if (startingRef.current) return; // ignore clicks while connecting
    startingRef.current = true;
    committedRef.current = "";

    void (async () => {
      // 1 — request mic
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        showTip("Microphone access denied");
        startingRef.current = false;
        return;
      }
      streamRef.current = stream;

      // 2 — mint a short-lived AssemblyAI token (server action, never exposes API key)
      const tokenRes = await getScribeToken();
      if ("error" in tokenRes) {
        showTip(tokenRes.error.slice(0, 60));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        startingRef.current = false;
        return;
      }

      // 3 — open WebSocket
      const ws = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${tokenRes.token}`,
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data as string) as {
          type: string;
          transcript?: string;
          end_of_turn?: boolean;
        };
        if (msg.type !== "Turn" || typeof msg.transcript !== "string") return;

        if (msg.end_of_turn) {
          if (msg.transcript.trim()) {
            committedRef.current = committedRef.current
              ? `${committedRef.current} ${msg.transcript}`.trim()
              : msg.transcript.trim();
          }
          onTranscript(committedRef.current);
        } else {
          // Interim: show committed text + live partial together
          const live = committedRef.current
            ? `${committedRef.current} ${msg.transcript}`.trim()
            : msg.transcript;
          onTranscript(live);
        }
      };

      ws.onerror = () => {
        teardown();
        setActive(false);
        showTip("Transcription error — check your connection");
        committedRef.current = "";
      };

      // Unexpected server-side close while we're still recording
      ws.onclose = () => {
        if (wsRef.current !== null) return; // we already called teardown()
        setActive(false);
        showTip("Transcription disconnected");
        committedRef.current = "";
      };

      // 4 — wait for connection (8 s timeout)
      const connected = await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(false), 8000);
        ws.onopen = () => { clearTimeout(t); resolve(true); };
      });

      if (!connected || ws.readyState !== WebSocket.OPEN) {
        teardown();
        showTip("Could not connect to transcription service");
        startingRef.current = false;
        return;
      }

      // 5 — audio pipeline: mic → 16 kHz PCM → WebSocket
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(floatTo16BitPCM(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setActive(true);
      startingRef.current = false;
    })();
  };

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes vi-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(180,66,58,.4); }
          70%      { box-shadow: 0 0 0 10px rgba(180,66,58,0); }
        }
        .vi-active { animation: vi-pulse 1.5s infinite; }
        @media (prefers-reduced-motion: reduce) { .vi-active { animation: none; } }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        className={active ? "vi-active" : ""}
        title={active ? "Stop recording" : "Voice input"}
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
