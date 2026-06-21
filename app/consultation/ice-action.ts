"use server";

// IceServer shape accepted by RTCPeerConnection.
type IceServer =
  | { urls: string | string[] }
  | { urls: string | string[]; username: string; credential: string };

/**
 * Returns ICE server config for WebRTC peer connections.
 * Always includes Google STUN (covers easy NAT).
 * Adds TURN if TURN_URL / TURN_USERNAME / TURN_CREDENTIAL env vars are set
 * (required for mobile networks, corporate/symmetric NAT, cross-carrier calls).
 *
 * Recommended TURN providers: Metered.ca (free tier), Cloudflare TURN,
 * Twilio NTS, or self-hosted Coturn.
 */
export async function getIceServers(): Promise<IceServer[]> {
  const servers: IceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];

  const url = process.env.TURN_URL;
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;

  if (url && username && credential) {
    servers.push({ urls: url, username, credential });
    // Add TLS variant automatically (TURN over TLS bypasses port-blocking firewalls)
    const tlsUrl = url.replace(/^turn:/, "turns:").replace(/:3478$/, ":5349");
    if (tlsUrl !== url) {
      servers.push({ urls: tlsUrl, username, credential });
    }
  }

  return servers;
}
