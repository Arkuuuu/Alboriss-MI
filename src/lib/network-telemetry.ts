/**
 * Client-Side Network & WiFi Telemetry Collector
 * 
 * Collects:
 * 1. Network Information API (navigator.connection / getEffectiveConnectionType)
 *    - Downlink bandwidth (Mbps)
 *    - Round-Trip Time (RTT in ms)
 *    - Connection type (WiFi, Cellular, Ethernet)
 *    - Effective cellular speed tier (4G / 3G)
 * 2. WebRTC Local Network Adapter Discovery (Local IP address: 192.168.x.x / 10.x.x.x)
 * 3. Public IP and Network Online State
 */

import { NetworkTelemetry } from "@/types/auth";

export async function collectClientNetworkTelemetry(): Promise<NetworkTelemetry> {
  const telemetry: NetworkTelemetry = {
    networkOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    effectiveType: "4g",
    downlinkMbps: undefined,
    rttMs: undefined,
    connectionType: "wifi",
    saveData: false,
    localIp: undefined,
    publicIp: undefined,
  };

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return telemetry;
  }

  // 1. Network Information API (Chrome, Edge, Android)
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (connection) {
    telemetry.effectiveType = connection.effectiveType || "4g";
    telemetry.downlinkMbps = connection.downlink !== undefined ? Number(connection.downlink) : undefined;
    telemetry.rttMs = connection.rtt !== undefined ? Number(connection.rtt) : undefined;
    telemetry.saveData = !!connection.saveData;
    telemetry.connectionType = connection.type || (connection.downlink > 10 ? "wifi" : "cellular");
  }

  // 2. Discover Local Adapter IP via WebRTC ICE Candidates
  try {
    const localIp = await getLocalIPViaWebRTC();
    if (localIp) {
      telemetry.localIp = localIp;
    }
  } catch {
    // WebRTC may be restricted or blocked by some ad blockers
  }

  return telemetry;
}

/**
 * Extracts the client's local LAN IP address via WebRTC SDP candidate parsing
 */
function getLocalIPViaWebRTC(): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      const RTCPC =
        window.RTCPeerConnection ||
        (window as any).webkitRTCPeerConnection ||
        (window as any).mozRTCPeerConnection;

      if (!RTCPC) {
        resolve(undefined);
        return;
      }

      const pc = new RTCPC({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      let resolved = false;

      // Timeout after 1.5 seconds if ICE doesn't deliver
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try {
            pc.close();
          } catch {}
          resolve(undefined);
        }
      }, 1500);

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) return;
        const cand = event.candidate.candidate;
        // Parse IP from candidate string: candidate:... <ip> <port> typ host ...
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = ipRegex.exec(cand);
        if (match && match[1]) {
          const ip = match[1];
          // Filter out stun public server IP, we want local private or interface IPs
          if (
            ip.startsWith("192.168.") ||
            ip.startsWith("10.") ||
            ip.startsWith("172.16.") ||
            ip.startsWith("172.17.") ||
            ip.startsWith("172.18.") ||
            ip.startsWith("172.19.") ||
            ip.startsWith("172.20.") ||
            ip.startsWith("172.31.")
          ) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              try {
                pc.close();
              } catch {}
              resolve(ip);
            }
          }
        }
      };

      pc.createDataChannel("telemetry_probe");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(undefined);
          }
        });
    } catch {
      resolve(undefined);
    }
  });
}

