"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DeviceTelemetry,
  LocationTelemetry,
  NetworkTelemetry,
  FaceVerificationTelemetry,
} from "@/types/auth";
import { FaceLivenessEngine, FaceAnalysisResult, LivenessAnalysisResult } from "@/lib/face-liveness";
import { collectClientNetworkTelemetry } from "@/lib/network-telemetry";

function detectOS(ua: string): string {
  if (/Windows NT 10.0/i.test(ua)) return "Windows 10 / 11";
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  return "Unknown OS";
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Google Chrome";
  if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Apple Safari";
  return "Browser";
}

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // Permission states
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [locationPermission, setLocationPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [networkPermission, setNetworkPermission] = useState<"pending" | "granted">("pending");

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Telemetry state
  const [location, setLocation] = useState<LocationTelemetry | null>(null);
  const [networkTelemetry, setNetworkTelemetry] = useState<NetworkTelemetry | null>(null);

  // Biometric & Face Detection state
  const [faceResult, setFaceResult] = useState<FaceAnalysisResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessAnalysisResult | null>(null);
  const [verifiedSnapshotData, setVerifiedSnapshotData] = useState<FaceVerificationTelemetry | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const livenessEngineRef = useRef<FaceLivenessEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Face Engine & Telemetry on Mount
  useEffect(() => {
    livenessEngineRef.current = new FaceLivenessEngine();

    // 1. Gather Network & WiFi Telemetry
    refreshNetworkTelemetry();

    // 2. Request Location Permission
    requestLocationPermission();

    // 3. Start Camera & Face Tracking
    startCamera();

    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const refreshNetworkTelemetry = async () => {
    try {
      const net = await collectClientNetworkTelemetry();
      setNetworkTelemetry(net);
      setNetworkPermission("granted");
    } catch {
      setNetworkTelemetry({ networkOnline: true, connectionType: "wifi" });
      setNetworkPermission("granted");
    }
  };

  const requestLocationPermission = () => {
    setLocationError(null);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy),
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
            speed: pos.coords.speed ? Math.round(pos.coords.speed) : null,
            source: "browser_gps",
          });
          setLocationPermission("granted");
        },
        (err) => {
          setLocationPermission("denied");
          setLocationError(
            err.code === 1
              ? "Location permission was denied. Home practice security mandates precise GPS verification. Please allow location access in your browser."
              : "Unable to retrieve GPS coordinates. Please ensure device location is enabled."
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationPermission("denied");
      setLocationError("Geolocation is not supported by your browser.");
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam not supported by your browser.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraPermission("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          startFaceTrackingLoop();
        };
      }
    } catch {
      setCameraPermission("denied");
      setCameraError(
        "Camera permission is required. Please grant camera access in your browser to verify human identity."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Continuous Computer Vision Face Detection & Liveness Loop
  const startFaceTrackingLoop = useCallback(() => {
    let lastProcessed = 0;
    const engine = livenessEngineRef.current;

    const loop = async (timestamp: number) => {
      // Throttle CV analysis to ~12-15 fps to conserve CPU while remaining responsive
      if (timestamp - lastProcessed > 70 && videoRef.current && engine) {
        lastProcessed = timestamp;

        if (videoRef.current.readyState >= 2) {
          const face = await engine.detectFace(videoRef.current);
          setFaceResult(face);

          const live = engine.verifyLiveness(videoRef.current, face);
          setLivenessResult(live);

          // Render visual reticle & status overlay on canvas
          drawOverlay(face, live);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // Draw Dynamic Real-Time Bounding Box & HUD Guide
  const drawOverlay = (face: FaceAnalysisResult, live: LivenessAnalysisResult) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Oval biometric guide in center
    const ovalX = w / 2;
    const ovalY = h / 2 - 10;
    const radiusX = w * 0.22;
    const radiusY = h * 0.35;

    let guideColor = "#ef4444"; // Red (No face or spoof)
    if (live.isStaticPhoto || live.isScreenSpoof) {
      guideColor = "#dc2626";
    } else if (live.livenessPassed) {
      guideColor = "#22c55e"; // Green (Verified)
    } else if (face.faceDetected) {
      guideColor = "#f59e0b"; // Amber (Face found, analyzing liveness)
    }

    // Draw central oval guide
    ctx.beginPath();
    ctx.ellipse(ovalX, ovalY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.lineWidth = live.livenessPassed ? 4 : 2;
    ctx.setLineDash(live.livenessPassed ? [] : [6, 4]);
    ctx.strokeStyle = guideColor;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Face Box if detected
    if (face.faceDetected && face.faceBox) {
      const scaleX = w / 240;
      const scaleY = h / 180;
      const bx = face.faceBox.x * scaleX;
      const by = face.faceBox.y * scaleY;
      const bw = face.faceBox.width * scaleX;
      const bh = face.faceBox.height * scaleY;

      // Draw bounding box corners
      ctx.lineWidth = 3;
      ctx.strokeStyle = guideColor;
      const cornerLen = Math.min(24, bw * 0.2);

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerLen);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerLen, by);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by);
      ctx.lineTo(bx + bw, by);
      ctx.lineTo(bx + bw, by + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bx, by + bh - cornerLen);
      ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + cornerLen, by + bh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerLen, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerLen);
      ctx.stroke();

      // Draw animated scanning line inside face box
      const scanY = by + (Math.sin(Date.now() / 250) * 0.5 + 0.5) * bh;
      ctx.beginPath();
      ctx.moveTo(bx, scanY);
      ctx.lineTo(bx + bw, scanY);
      ctx.strokeStyle = guideColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // Capture Verified Snapshot
  const captureVerifiedSnapshot = () => {
    if (!videoRef.current || !faceResult?.faceDetected || !livenessResult?.livenessPassed) {
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhotoDataUrl(dataUrl);

    setVerifiedSnapshotData({
      faceDetected: true,
      livenessPassed: true,
      livenessScore: livenessResult.livenessScore,
      isStaticPhoto: false,
      isScreenSpoof: false,
      blinkDetected: livenessResult.blinkDetected,
      motionVariance: livenessResult.motionVariance,
      biometricSignature: livenessResult.biometricSignature,
      timestamp: new Date().toISOString(),
    });
  };

  const retakeSnapshot = () => {
    setPhotoDataUrl(null);
    setVerifiedSnapshotData(null);
    if (livenessEngineRef.current) {
      livenessEngineRef.current.reset();
    }
    if (!streamRef.current) {
      startCamera();
    }
  };

  const gatherDeviceTelemetry = (): DeviceTelemetry => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
    const width = typeof window !== "undefined" ? window.screen.width : 0;
    const height = typeof window !== "undefined" ? window.screen.height : 0;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language || "en";
    const platform = navigator.platform || "PC";

    return {
      os: detectOS(ua),
      browser: detectBrowser(ua),
      screenResolution: `${width} x ${height}`,
      deviceMemory: memory,
      hardwareConcurrency: cores,
      timezone: tz,
      language: lang,
      platform,
      userAgent: ua,
    };
  };

  const isFormReadyToSubmit =
    username.trim().length >= 3 &&
    password.length >= 6 &&
    photoDataUrl !== null &&
    verifiedSnapshotData?.livenessPassed === true &&
    locationPermission === "granted" &&
    location !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Strict validation gates
    if (!photoDataUrl || !verifiedSnapshotData) {
      setLoginError("Mandatory Check: Live face verification and snapshot are required.");
      return;
    }

    if (locationPermission !== "granted" || !location) {
      setLoginError("Mandatory Check: Precise GPS Location permission must be granted.");
      return;
    }

    try {
      setIsSubmitting(true);
      const deviceTelemetry = gatherDeviceTelemetry();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          photoDataUrl,
          device: deviceTelemetry,
          location,
          network: networkTelemetry,
          faceVerification: verifiedSnapshotData,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Login failed");
      }

      stopCamera();
      // Redirect to Data Entry Application
      router.push("/");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine HUD badge status
  const getHudBadge = () => {
    if (livenessResult?.isStaticPhoto) {
      return {
        bg: "bg-red-600",
        text: "⚠️ STATIC PHOTO SPOOF DETECTED",
        sub: "Printed photo detected. Live human face required.",
      };
    }
    if (livenessResult?.isScreenSpoof) {
      return {
        bg: "bg-red-600",
        text: "⚠️ SCREEN DISPLAY SPOOF DETECTED",
        sub: "Digital screen reflection detected. Live human face required.",
      };
    }
    if (livenessResult?.livenessPassed) {
      return {
        bg: "bg-emerald-600",
        text: "✓ LIVE HUMAN FACE VERIFIED (100%)",
        sub: "Identity confirmed. Click capture button below.",
      };
    }
    if (faceResult?.faceDetected) {
      return {
        bg: "bg-amber-600",
        text: "🔍 FACE DETECTED — ANALYZING LIVENESS...",
        sub: livenessResult?.blinkDetected
          ? "Micro-motion verified. Hold still..."
          : "Please blink your eyes naturally to verify liveness.",
      };
    }
    return {
      bg: "bg-red-800",
      text: "❌ NO HUMAN FACE DETECTED",
      sub: "Please position your face directly inside the oval guide.",
    };
  };

  const hud = getHudBadge();

  return (
    <div className="min-h-screen bg-[#b0d2ce] flex items-center justify-center p-3 font-sans select-none text-black">
      <div className="bg-[#e4edea] border-2 border-[#54737a] w-full max-w-xl shadow-2xl rounded-none">
        {/* Title Bar */}
        <div className="bg-[#245d82] text-white px-3 py-1.5 flex justify-between items-center text-xs font-bold">
          <span>Medical Insurance — Secure Operator Biometric Clearance Terminal</span>
          <span className="text-[10px] bg-[#163b52] px-2 py-0.5 rounded font-mono">
            PORTAL SECURITY v2.4
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {loginError && (
            <div className="p-2.5 bg-red-100 border-2 border-red-500 text-red-800 text-[11px] font-medium rounded-none shadow-sm flex items-start space-x-2">
              <span className="text-red-600 text-sm">⛔</span>
              <div>
                <p className="font-bold">Authentication Blocked:</p>
                <p>{loginError}</p>
              </div>
            </div>
          )}

          {/* MANDATORY SECURITY CLEARANCE CHECKLIST */}
          <div className="border border-[#7898a5] bg-[#dbe8e6] p-2.5 space-y-1.5">
            <div className="flex justify-between items-center border-b border-[#a9c4c1] pb-1">
              <span className="font-bold text-[11px] text-[#003366] flex items-center gap-1.5">
                <span>🛡️</span> Mandatory Home Practice Security Clearance:
              </span>
              <span className="text-[10px] text-[#556677] font-semibold">
                All 3 Clearances Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
              {/* 1. Camera & Biometrics */}
              <div
                className={`p-2 border ${
                  verifiedSnapshotData?.livenessPassed
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                    : cameraPermission === "granted"
                    ? "bg-amber-50 border-amber-500 text-amber-900"
                    : "bg-red-50 border-red-400 text-red-900"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>1. Biometrics</span>
                  <span>
                    {verifiedSnapshotData?.livenessPassed
                      ? "✓ PASSED"
                      : cameraPermission === "granted"
                      ? "SCANNING"
                      : "REQUIRED"}
                  </span>
                </div>
                <div className="text-[9px] mt-0.5 truncate">
                  {verifiedSnapshotData?.livenessPassed
                    ? "Live face verified"
                    : cameraPermission === "granted"
                    ? "Awaiting live verification"
                    : "Camera blocked"}
                </div>
              </div>

              {/* 2. GPS Location */}
              <div
                className={`p-2 border ${
                  locationPermission === "granted" && location
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                    : "bg-red-50 border-red-400 text-red-900"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>2. GPS Location</span>
                  <span>{locationPermission === "granted" ? "✓ GRANTED" : "REQUIRED"}</span>
                </div>
                <div className="text-[9px] mt-0.5 truncate">
                  {location ? (
                    `Lat: ${location.latitude}, Lon: ${location.longitude}`
                  ) : (
                    <button
                      type="button"
                      onClick={requestLocationPermission}
                      className="underline font-bold text-blue-700 hover:text-blue-900"
                    >
                      Authorize Location Access
                    </button>
                  )}
                </div>
              </div>

              {/* 3. WiFi & Network Telemetry */}
              <div
                className={`p-2 border ${
                  networkPermission === "granted"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                    : "bg-amber-50 border-amber-500 text-amber-900"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>3. WiFi & Network</span>
                  <span>✓ CAPTURED</span>
                </div>
                <div className="text-[9px] mt-0.5 truncate">
                  {networkTelemetry?.connectionType?.toUpperCase() || "WIFI"} •{" "}
                  {networkTelemetry?.effectiveType || "4G"} •{" "}
                  {networkTelemetry?.localIp || "LAN Active"}
                </div>
              </div>
            </div>

            {locationError && (
              <div className="p-1.5 bg-red-100 border border-red-300 text-red-700 text-[10px] mt-1 flex justify-between items-center">
                <span>{locationError}</span>
                <button
                  type="button"
                  onClick={requestLocationPermission}
                  className="win-btn px-2 py-0.5 text-[9px] font-bold shrink-0 ml-2"
                >
                  Retry Location
                </button>
              </div>
            )}
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#e8f2f0] p-2.5 border border-[#a2beba]">
            <div>
              <label className="block text-[11px] font-bold text-[#113344] mb-1">
                Unique Operator ID / Username:
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. operator1"
                className="w-full h-7 px-2 text-xs bg-[#ffffff] border border-[#7597a4] focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
              />
              <span className="text-[9px] text-[#556677]">
                Issued by Manager
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#113344] mb-1">
                Password:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-7 px-2 text-xs bg-[#ffffff] border border-[#7597a4] focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-[9px] text-[#556677]">
                Single-session shift authentication
              </span>
            </div>
          </div>

          {/* LIVE CAMERA & BIOMETRIC FACE DETECTOR FEED */}
          <div className="border border-[#7898a5] p-2.5 bg-[#d7e7e4]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-[11px] text-[#003366] flex items-center gap-1">
                <span>📷</span> Live Human Face Identification & Anti-Spoofing:
              </span>
              <span className="text-[10px] text-[#2c4c5e] font-mono">
                {verifiedSnapshotData ? "STATUS: SNAPSHOT LOCKED" : "STATUS: LIVE RECOGNITION"}
              </span>
            </div>

            {/* Video Container with Canvas Overlay */}
            <div className="relative w-full h-[240px] bg-black flex items-center justify-center overflow-hidden border-2 border-[#334455] shadow-inner">
              {photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <div className="relative w-full h-full">
                  <img
                    src={photoDataUrl}
                    alt="Captured biometric verification"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-600/95 text-white px-2.5 py-1 text-[10px] font-bold rounded shadow flex items-center gap-1">
                    <span>✓</span> LIVE FACE VERIFIED
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/75 text-emerald-300 font-mono text-[9px] px-2 py-0.5 rounded">
                    Liveness Score: {Math.round((verifiedSnapshotData?.livenessScore || 0.95) * 100)}% • Anti-Spoof Cleared
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />

                  {/* Real-time Diagnostic HUD Banner */}
                  <div className="absolute top-2 inset-x-2 flex flex-col items-center pointer-events-none">
                    <div
                      className={`${hud.bg} text-white px-3 py-1 text-[11px] font-bold tracking-wide rounded-sm shadow-md transition-colors`}
                    >
                      {hud.text}
                    </div>
                    <div className="bg-black/75 text-gray-200 text-[10px] px-2.5 py-0.5 rounded-sm mt-1">
                      {hud.sub}
                    </div>
                  </div>

                  {/* Real-time Telemetry Overlay Corner */}
                  <div className="absolute bottom-1.5 left-2 bg-black/70 text-gray-300 font-mono text-[9px] px-2 py-0.5 rounded pointer-events-none">
                    Skin Ratio: {((faceResult?.skinRatio || 0) * 100).toFixed(0)}% | S-Dev:{" "}
                    {livenessResult?.motionVariance || "0.0"} | Blink:{" "}
                    {livenessResult?.blinkDetected ? "YES" : "NO"}
                  </div>
                </div>
              )}

              {/* Camera permission failure prompt */}
              {cameraError && (
                <div className="absolute inset-0 bg-black/90 p-4 text-red-200 text-xs flex flex-col items-center justify-center text-center space-y-2 z-20">
                  <p className="font-bold text-red-400">CAMERA ACCESS BLOCKED</p>
                  <p className="text-[11px]">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="win-btn px-4 py-1.5 text-xs font-bold text-black bg-[#bee2f1]"
                  >
                    Grant Camera Access
                  </button>
                </div>
              )}
            </div>

            {/* Biometric Controls */}
            <div className="mt-2.5 flex flex-wrap justify-between items-center gap-2">
              {!photoDataUrl ? (
                <button
                  type="button"
                  onClick={captureVerifiedSnapshot}
                  disabled={!livenessResult?.livenessPassed || !faceResult?.faceDetected}
                  className="win-btn px-4 py-1.5 font-bold text-xs bg-[#bfe5de] hover:bg-[#aee0d7] disabled:opacity-40 disabled:cursor-not-allowed text-[#002244] shadow"
                >
                  📸 Approve & Capture Verified Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={retakeSnapshot}
                  className="win-btn px-3 py-1 text-xs hover:bg-[#eae6dd]"
                >
                  ↻ Retake Biometric Scan
                </button>
              )}

              <div className="text-[10px] text-right font-medium">
                {photoDataUrl ? (
                  <span className="text-emerald-700 font-bold">
                    ✓ Photo snapshot approved & ready for submission
                  </span>
                ) : livenessResult?.livenessPassed ? (
                  <span className="text-emerald-700 font-bold animate-pulse">
                    ✓ Human presence confirmed — Click Approve & Capture
                  </span>
                ) : (
                  <span className="text-red-700 font-bold">
                    * Face verification strictly required to enable login
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON & POLICY BANNER */}
          <div className="pt-2 border-t border-[#a2beba] flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-[10px] text-[#445566]">
              {!isFormReadyToSubmit ? (
                <span className="text-red-600 font-semibold">
                  ⚠️ Complete ID/Password, GPS location, and Live Face scan to proceed.
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  ✓ All security clearances verified. Ready for sign-in.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormReadyToSubmit}
              className="win-btn px-6 py-2 text-xs font-bold text-[#002244] bg-[#dbe8e6] hover:bg-[#d0dfdd] disabled:opacity-40 disabled:cursor-not-allowed shadow transition"
            >
              {isSubmitting ? "Authenticating Clearance..." : "Login to Terminal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
