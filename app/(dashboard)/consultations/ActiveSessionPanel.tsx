"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Circle,
  Square,
  Radio,
} from "lucide-react";
import { getScribeToken } from "./token-action";
import {
  getRoomForDoctor,
  startConsultation,
  endConsultation,
  saveScribeTranscript,
} from "./room-actions";
import type { PatientOption } from "./ConsultationsClient";

const C = {
  surface: "#FBFAF7",
  bg: "#F4F1EB",
  ink: "#1A1714",
  ink2: "#4A453F",
  ink3: "#8A827A",
  border: "#E3DDD3",
  border2: "#D8D0C4",
  accent: "#72554D",
  accentDk: "#4A352E",
  accentMut: "#EDE6DF",
  danger: "#B4423A",
  dangerBg: "#F7ECEA",
  ok: "#4E6B4F",
  okBg: "#ECF0EA",
} as const;

const STUN = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type Mode = "standalone" | "telehealth";

function mmss(total: number): string {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

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

function CtrlBtn({
  onClick,
  active,
  label,
  icon,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${active ? "#D8D0C4" : "#B4423A"}`,
        background: active ? "#FBFAF7" : "#F7ECEA",
        color: active ? "#4A453F" : "#B4423A",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 13.5,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ActiveSessionPanel({
  initialPatients,
  selectedRoomId,
  onClearRoom,
  onCallEnded,
}: {
  initialPatients: PatientOption[];
  selectedRoomId: string | null;
  onClearRoom: () => void;
  onCallEnded: (roomId: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("standalone");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [scribeOn, setScribeOn] = useState(false);
  const [finalSegments, setFinalSegments] = useState<string[]>([]);
  const [partialText, setPartialText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [apptType, setApptType] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializingRoomRef = useRef<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Auto-scroll transcript.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [finalSegments, partialText]);

  // When a room is selected from the panel, switch into telehealth.
  useEffect(() => {
    if (!selectedRoomId) return;
    void initiateTelehealth(selectedRoomId);
    return () => {
      teardown();
      initializingRoomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach remote stream to its <video> whenever stream or grid mounts.
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log("[DR] attached remote stream to video element ✓");
    }
  }, [remoteStream, remoteJoined, mode]);

  // Attach local stream to its <video> whenever the grid mounts.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [mode, remoteJoined]);

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function teardown() {
    stopScribe();
    stopTimer();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }

  /* ---------------- AssemblyAI v3 scribe ---------------- */

  async function startScribe(audioTrack: MediaStreamTrack) {
    const tokenRes = await getScribeToken();
    if ("error" in tokenRes) {
      setError(tokenRes.error);
      return;
    }
    const ws = new WebSocket(
      `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${tokenRes.token}`,
    );
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data as string);
      if (msg.type === "Turn" && typeof msg.transcript === "string") {
        if (msg.end_of_turn) {
          if (msg.transcript.trim()) {
            setFinalSegments((prev) => [...prev, msg.transcript]);
          }
          setPartialText("");
        } else {
          setPartialText(msg.transcript);
        }
      }
    };
    ws.onerror = () => setError("Transcription connection error.");

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(
      new MediaStream([audioTrack]),
    );
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      ws.send(floatTo16BitPCM(input));
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  }

  function stopScribe() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "Terminate" }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }

  /* ---------------- Standalone scribe ---------------- */

  async function startStandalone() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(
        "Microphone access is required. Please allow microphone permissions in your browser settings.",
      );
      return;
    }
    localStreamRef.current = stream;
    setFinalSegments([]);
    setPartialText("");
    await startScribe(stream.getAudioTracks()[0]);
    setIsRecording(true);
    startTimer();
  }

  async function stopStandalone() {
    stopScribe();
    stopTimer();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setIsRecording(false);
    const transcript = finalSegments.join(" ");
    if (transcript.trim()) {
      try {
        await saveScribeTranscript(null, selectedPatientId || null, transcript);
      } catch {
        setError("Failed to save transcript.");
      }
    }
  }

  /* ---------------- Telehealth (doctor = caller) ---------------- */

  async function initiateTelehealth(roomId: string) {
    if (initializingRoomRef.current === roomId) {
      console.log(
        "[DR] initiateTelehealth SKIPPED — already initializing",
        roomId,
      );
      return;
    }
    initializingRoomRef.current = roomId;

    console.log("[DR] initiateTelehealth start, roomId:", roomId);
    setMode("telehealth");
    setActiveRoomId(roomId);
    setError(null);

    let room: Awaited<ReturnType<typeof getRoomForDoctor>>;
    try {
      room = await getRoomForDoctor(roomId);
      console.log("[DR] room loaded, roomToken:", room.roomToken);
    } catch (e) {
      console.log("[DR] getRoomForDoctor FAILED:", e);
      setError("Couldn't load the room.");
      return;
    }

    let localStream: MediaStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("[DR] got local media");
    } catch (e) {
      console.log("[DR] getUserMedia FAILED:", e);
      setError(
        "Camera and microphone access are required. Please allow permissions in your browser settings.",
      );
      return;
    }
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

    const pc = new RTCPeerConnection(STUN);
    pcRef.current = pc;
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

    pc.ontrack = (event) => {
      console.log("[DR] ontrack — remote stream received ✓");
      setRemoteJoined(true);
      setRemoteStream(event.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      console.log("[DR] connectionState:", pc.connectionState);
    };
    pc.oniceconnectionstatechange = () => {
      console.log("[DR] iceConnectionState:", pc.iceConnectionState);
    };

    if (!supabaseRef.current) {
      supabaseRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
    }
    const supabase = supabaseRef.current;

    const channelName = `consultation:${room.roomToken}`;
    console.log("[DR] joining channel:", channelName);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
          },
        });
      } else {
        console.log("[DR] ICE gathering complete");
      }
    };

    const sendOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[DR] sending offer");
      channel.send({
        type: "broadcast",
        event: "signal",
        payload: { type: "offer", sdp: offer },
      });
    };

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      console.log("[DR] received signal:", payload.type);
      if (payload.type === "answer") {
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          console.log("[DR] set remote answer ✓");
        }
      } else if (payload.type === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.log("[DR] ICE add failed", e);
        }
      } else if (payload.type === "patient-joined") {
        console.log("[DR] patient-joined received ✓ — sending offer now");
        setRemoteJoined(true);
        await sendOffer();
      } else if (payload.type === "patient-left") {
        setRemoteJoined(false);
      }
    });

    channel.subscribe(async (status) => {
      console.log("[DR] channel status:", status);
      if (status === "SUBSCRIBED") {
        try {
          await startConsultation(roomId);
          console.log(
            "[DR] startConsultation done — room is ACTIVE, waiting for patient",
          );
        } catch (e) {
          console.log("[DR] startConsultation failed:", e);
        }
      }
    });
  }

  /* ---------------- In-call controls ---------------- */

  async function toggleScribeInCall() {
    if (scribeOn) {
      stopScribe();
      setScribeOn(false);
      stopTimer();
      return;
    }
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (!audioTrack) {
      setError("No microphone track available for scribe.");
      return;
    }
    setFinalSegments([]);
    setPartialText("");
    await startScribe(audioTrack);
    setScribeOn(true);
    startTimer();
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }
  function toggleVideo() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoOff(!track.enabled);
  }

  async function endCall() {
    const endedRoomId = activeRoomId;
    stopScribe();
    stopTimer();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    initializingRoomRef.current = null;

    const transcript = finalSegments.join(" ");
    if (endedRoomId) {
      try {
        await endConsultation(endedRoomId);
        if (transcript.trim()) {
          await saveScribeTranscript(
            endedRoomId,
            selectedPatientId || null,
            transcript,
          );
        }
      } catch {
        /* non-fatal */
      }
    }

    setRemoteStream(null);
    setScribeOn(false);
    setRemoteJoined(false);
    setMode("standalone");
    setActiveRoomId(null);
    onClearRoom();
    if (endedRoomId) onCallEnded(endedRoomId);
  }

  /* ---------------- UI ---------------- */

  const transcriptPanel = (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border2}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.ink3,
            margin: "0 0 2px",
          }}
        >
          LIVE TRANSCRIPT
        </p>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>
          What&apos;s being said
        </p>
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", padding: "14px 16px" }}>
        {finalSegments.length === 0 && !partialText && (
          <p style={{ fontSize: 13, color: C.ink3, margin: 0 }}>
            Transcript will appear here once recording starts.
          </p>
        )}
        {finalSegments.map((seg, i) => (
          <p
            key={i}
            style={{
              fontSize: 14,
              color: C.ink,
              margin: "0 0 8px",
              lineHeight: 1.5,
            }}
          >
            {seg}
          </p>
        ))}
        {partialText && (
          <p
            style={{
              fontSize: 14,
              color: C.ink3,
              fontStyle: "italic",
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {partialText}
          </p>
        )}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );

  console.log(
    "[DR] render — mode:",
    mode,
    "remoteStream:",
    !!remoteStream,
    "activeRoomId:",
    activeRoomId,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @keyframes asp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(180,66,58,0.4); }
          70% { box-shadow: 0 0 0 12px rgba(180,66,58,0); }
        }
        .asp-rec { animation: asp-pulse 2s infinite; }
        @media (prefers-reduced-motion: reduce) { .asp-rec { animation: none; } }
      `}</style>

      {error && (
        <div
          style={{
            borderLeft: `3px solid ${C.danger}`,
            background: C.dangerBg,
            color: C.danger,
            borderRadius: 6,
            padding: "12px 16px",
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}

      {mode === "standalone" ? (
        <>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: 18,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              gap: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: C.ink3,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={isRecording}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 14,
                  background: C.bg,
                  color: C.ink,
                  width: "100%",
                }}
              >
                <option value="">No patient selected</option>
                {initialPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: C.ink3,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Appointment type
              </label>
              <input
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
                disabled={isRecording}
                placeholder="Follow-up"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "9px 12px",
                  fontSize: 14,
                  background: C.bg,
                  color: C.ink,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isRecording && (
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: C.ink2,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {mmss(elapsed)}
                </span>
              )}
              <button
                type="button"
                onClick={isRecording ? stopStandalone : startStandalone}
                className={isRecording ? "asp-rec" : ""}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  border: "none",
                  background: isRecording ? C.danger : C.accent,
                  color: C.surface,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                {isRecording ? (
                  <Square size={20} fill="currentColor" />
                ) : (
                  <Circle size={20} fill="currentColor" />
                )}
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  {isRecording ? "Stop" : "Record"}
                </span>
              </button>
            </div>
          </div>

          {transcriptPanel}
        </>
      ) : (
        <>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                aspectRatio: "4/3",
                objectFit: "cover",
                borderRadius: 6,
                background: C.ink,
                border: `1px solid ${C.border2}`,
              }}
            />
            <div style={{ position: "relative" }}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                  borderRadius: 6,
                  background: C.ink,
                  border: `1px solid ${C.border2}`,
                  display: "block",
                }}
              />
              {!remoteStream && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 6,
                    background: C.bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: C.ink3,
                  }}
                >
                  <Video size={28} strokeWidth={1.6} />
                  <p style={{ fontSize: 13, margin: 0 }}>
                    Waiting for patient to join…
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: 12,
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <CtrlBtn
              onClick={toggleMute}
              active={!isMuted}
              label={isMuted ? "Unmute" : "Mute"}
              icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            />
            <CtrlBtn
              onClick={toggleVideo}
              active={!isVideoOff}
              label={isVideoOff ? "Start video" : "Stop video"}
              icon={isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
            />
            <button
              type="button"
              onClick={toggleScribeInCall}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "none",
                borderRadius: 6,
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                background: scribeOn ? C.okBg : C.accentMut,
                color: scribeOn ? C.ok : C.accentDk,
              }}
            >
              <Radio size={16} strokeWidth={2.2} />
              Scribe: {scribeOn ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={endCall}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "none",
                borderRadius: 6,
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                background: C.danger,
                color: C.surface,
              }}
            >
              <PhoneOff size={16} strokeWidth={2.2} />
              End call
            </button>
          </div>

          {scribeOn && transcriptPanel}
        </>
      )}
    </div>
  );
}
