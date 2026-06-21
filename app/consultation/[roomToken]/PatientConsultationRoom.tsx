"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { getIceServers } from "@/app/consultation/ice-action";

type RoomStatus = "WAITING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

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
};

type CallStatus = "waiting" | "connecting" | "connected" | "ended";

export default function PatientConsultationRoom({
  roomToken,
  patientName,
  doctorName,
  // clinicName,
  initialStatus,
}: {
  roomToken: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  initialStatus: RoomStatus;
}) {
  const [callStatus, setCallStatus] = useState<CallStatus>(
    initialStatus === "COMPLETED" ? "ended" : "waiting",
  );
  // "normal" = doctor ended / patient left intentionally; "dropped" = connection failed unexpectedly.
  const [callEndReason, setCallEndReason] = useState<"normal" | "dropped">("normal");

  const [reportReady, setReportReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const joinedRef = useRef(false);

  async function joinCall() {
    setCallStatus("connecting");
    setError(null);

    let localStream = localStreamRef.current;
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = localStream;
      } catch (e) {
        setError("Camera and microphone access are required to join.");
        setCallStatus("waiting");
        joinedRef.current = false;
        return;
      }
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    // Candidates received before setRemoteDescription must be buffered and drained after.
    const pendingCandidates: RTCIceCandidateInit[] = [];
    const drainCandidates = async () => {
      const toApply = pendingCandidates.splice(0);
      if (toApply.length)
      for (const c of toApply) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
        }
      }
    };
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream!));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setCallStatus("connected");
        setError(null);
      }
      // "disconnected" is transient (network hiccup) — only end on "failed"
      if (s === "failed") {
        setCallEndReason("dropped");
        setCallStatus("ended");
      }
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "failed") {
        setTimeout(() => {
          if (pc.iceConnectionState === "failed") {
            setCallEndReason("dropped");
            setCallStatus("ended");
          }
        }, 10000);
      }
    };

    const supabase = getSupabaseBrowserClient();

    const channelName = `consultation:${roomToken}`;
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
      }
    };

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      if (payload.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await drainCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "answer", sdp: answer },
        });
      } else if (payload.type === "ice-candidate") {
        if (!pc.remoteDescription) {
          pendingCandidates.push(payload.candidate as RTCIceCandidateInit);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
          }
        }
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "patient-joined" },
        });
      }
    });
  }

  // Poll room status while waiting; when ACTIVE, join.
  useEffect(() => {
    if (callStatus !== "waiting") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/consultation/${roomToken}`);
        const data = await res.json();
        if (data.status === "ACTIVE" && !joinedRef.current) {
          joinedRef.current = true;
          clearInterval(interval);
          void joinCall();
        }
        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setCallEndReason("normal");
          setCallStatus("ended");
        }
      } catch (e) {
      }
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, roomToken]);

  useEffect(() => {
    if (callStatus !== "ended") return;
    let active = true;
    const check = async () => {
      try {
        const res = await fetch(`/api/consultation/${roomToken}`);
        const data = await res.json();
        if (!active) return;
        setReportReady(!!data.hasSoapNote);
        // If a dropped call was actually followed by doctor completing the session,
        // promote the reason to "normal" so the patient sees the right screen.
        if (data.status === "COMPLETED") setCallEndReason("normal");
      } catch {
        /* ignore */
      }
    };
    check();
    // Poll quickly at first (catches doctor ending call right after a drop), then slow down.
    const fast = setInterval(check, 3000);
    const slow = setTimeout(() => {
      clearInterval(fast);
      setInterval(check, 15000);
    }, 30000);
    return () => {
      active = false;
      clearInterval(fast);
      clearTimeout(slow);
    };
  }, [callStatus, roomToken]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callStatus]);

  useEffect(() => {
    if (previewOn && previewVideoRef.current && localStreamRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [previewOn]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      channelRef.current?.unsubscribe();
    };
  }, []);

  async function checkConnection() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setPreviewOn(true);
    } catch {
      setError(
        "We couldn't access your camera or microphone. Please allow permissions and try again.",
      );
    }
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
  function leave() {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.unsubscribe();
    setCallEndReason("normal");
    setCallStatus("ended");
  }

  /* ---------- UI states ---------- */

  if (callStatus === "waiting") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: C.surface,
            border: `1px solid ${C.border2}`,
            borderRadius: 6,
            padding: 28,
            boxShadow: "0 8px 24px rgba(40,30,20,0.06)",
          }}
        >
          <style>{`@keyframes pcr-dot{0%,100%{opacity:1}50%{opacity:.3}}.pcr-pulse{animation:pcr-dot 1.2s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.pcr-pulse{animation:none}}`}</style>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: C.ink3,
              margin: "0 0 6px",
            }}
          >
            YOUR CONSULTATION
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            Hello, {patientName}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span
              className="pcr-pulse"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.accent,
              }}
            />
            <span style={{ fontSize: 13, color: C.ink2 }}>
              Waiting for {doctorName} to start
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: C.ink2,
              margin: "0 0 20px",
              lineHeight: 1.55,
            }}
          >
            Your consultation with {doctorName} is being prepared. You&apos;ll
            be connected automatically when the doctor is ready.
          </p>

          {previewOn ? (
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                borderRadius: 6,
                background: C.ink,
                marginBottom: 12,
              }}
            />
          ) : (
            <button
              type="button"
              onClick={checkConnection}
              style={{
                background: C.accent,
                color: C.surface,
                border: "none",
                borderRadius: 6,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Check your connection
            </button>
          )}
          {error && (
            <p style={{ fontSize: 13, color: C.danger, margin: "12px 0 0" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (callStatus === "connecting") {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <style>{`@keyframes pcr-spin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: `3px solid ${C.border2}`,
            borderTopColor: C.accent,
            animation: "pcr-spin 1s linear infinite",
          }}
        />
        <p style={{ fontSize: 14, color: C.ink2 }}>
          Connecting to your doctor…
        </p>
      </div>
    );
  }

  if (callStatus === "ended") {
    const wrapperStyle: React.CSSProperties = {
      display: "flex",
      justifyContent: "center",
      padding: "48px 24px",
    };
    const cardStyle: React.CSSProperties = {
      maxWidth: 480,
      width: "100%",
      background: C.surface,
      border: `1px solid ${C.border2}`,
      borderRadius: 6,
      padding: 28,
      textAlign: "center",
      boxShadow: "0 8px 24px rgba(40,30,20,0.06)",
    };
    const rejoinBtn = (
      <button
        type="button"
        onClick={() => {
          joinedRef.current = false;
          setCallEndReason("normal");
          setCallStatus("waiting");
        }}
        style={{
          display: "inline-block",
          background: C.accent,
          color: C.surface,
          border: "none",
          borderRadius: 6,
          padding: "10px 18px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Return to waiting room
      </button>
    );

    if (callEndReason === "dropped") {
      return (
        <div style={wrapperStyle}>
          <div style={{ ...cardStyle, border: `1px solid ${C.danger}33` }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: C.danger,
                margin: "0 0 6px",
              }}
            >
              CONNECTION LOST
            </p>
            <h1
              style={{ fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 12px" }}
            >
              Call was interrupted
            </h1>
            <p
              style={{ fontSize: 14, color: C.ink2, margin: "0 0 22px", lineHeight: 1.55 }}
            >
              Your connection to {doctorName} dropped unexpectedly. You can
              return to the waiting room to reconnect if the consultation is
              still ongoing.
            </p>
            {rejoinBtn}
            {reportReady && (
              <div style={{ marginTop: 16 }}>
                <Link
                  href={`/consultation/${roomToken}/report`}
                  style={{
                    fontSize: 13,
                    color: C.accent,
                    textDecoration: "underline",
                  }}
                >
                  View visit summary (available)
                </Link>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Normal intentional end
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: C.ink3,
              margin: "0 0 6px",
            }}
          >
            CONSULTATION COMPLETE
          </p>
          <h1
            style={{ fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 12px" }}
          >
            Your visit is done
          </h1>
          <p
            style={{ fontSize: 14, color: C.ink2, margin: "0 0 22px", lineHeight: 1.55 }}
          >
            Thank you for your consultation with {doctorName}.
            {reportReady
              ? " Your visit summary is ready below."
              : " Your doctor is preparing your visit summary — check back shortly."}
          </p>

          {reportReady ? (
            <Link
              href={`/consultation/${roomToken}/report`}
              style={{
                display: "inline-block",
                background: C.accent,
                color: C.surface,
                borderRadius: 6,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View your visit summary
            </Link>
          ) : (
            <span
              style={{
                display: "inline-block",
                background: C.bg,
                color: C.ink3,
                borderRadius: 6,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Summary being prepared…
            </span>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                joinedRef.current = false;
                setCallEndReason("normal");
                setCallStatus("waiting");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: C.ink3,
                fontSize: 12.5,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Call dropped? Return to waiting room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // connected

  return (
    <div style={{ position: "relative", minHeight: "70vh", padding: 16 }}>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "70vh",
          objectFit: "cover",
          borderRadius: 6,
          background: C.ink,
          border: `1px solid ${C.border2}`,
        }}
      />
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          bottom: 90,
          right: 28,
          width: 160,
          borderRadius: 6,
          border: `2px solid ${C.surface}`,
          objectFit: "cover",
          background: C.ink,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 12,
          display: "flex",
          gap: 14,
          boxShadow: "0 8px 24px rgba(40,30,20,0.1)",
        }}
      >
        <button
          type="button"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          style={{
            border: `1px solid ${isMuted ? C.danger : C.border2}`,
            background: isMuted ? C.dangerBg : C.surface,
            color: isMuted ? C.danger : C.ink2,
            borderRadius: 6,
            padding: 10,
            cursor: "pointer",
          }}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          title={isVideoOff ? "Start video" : "Stop video"}
          style={{
            border: `1px solid ${isVideoOff ? C.danger : C.border2}`,
            background: isVideoOff ? C.dangerBg : C.surface,
            color: isVideoOff ? C.danger : C.ink2,
            borderRadius: 6,
            padding: 10,
            cursor: "pointer",
          }}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
        <button
          type="button"
          onClick={leave}
          title="End call"
          style={{
            border: "none",
            background: C.danger,
            color: C.surface,
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <PhoneOff size={16} /> End
        </button>
      </div>
    </div>
  );
}
