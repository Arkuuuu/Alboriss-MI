"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DeviceTelemetry, LocationTelemetry } from "@/types/auth";

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
  const [cameraApproved, setCameraApproved] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationTelemetry | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Attempt optional location
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: Number(pos.coords.latitude.toFixed(4)),
            longitude: Number(pos.coords.longitude.toFixed(4)),
            source: "browser_gps",
          });
        },
        () => {},
        { timeout: 5000 }
      );
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraApproved(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraApproved(false);
      setCameraError(
        "Camera permission is required. Please grant camera access in your browser to verify your identity."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoDataUrl(dataUrl);
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!photoDataUrl) {
      setLoginError("Mandatory Check: You must capture a verification photo before logging in.");
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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Login failed");
      }

      stopCamera();
      // Redirect directly to the medical insurance application
      router.push("/");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#b0d2ce] flex items-center justify-center p-4 font-sans select-none text-black">
      <div className="bg-[#e4edea] border-2 border-[#54737a] w-full max-w-md shadow-2xl rounded-none">
        {/* Title Bar */}
        <div className="bg-[#245d82] text-white px-3 py-1.5 flex justify-between items-center text-xs font-bold">
          <span>Medical Insurance — Employee Verification</span>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {loginError && (
            <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-[11px]">
              {loginError}
            </div>
          )}

          {/* Credentials */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#113344] mb-1">
                Unique Operator ID / Username:
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. operator1"
                className="w-full h-7 px-2 text-xs bg-[#bee2f1] border border-[#7597a4] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-[#556677]">
                Credentials issued by your manager
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#113344] mb-1">
                Password:
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-7 px-2 text-xs bg-[#bee2f1] border border-[#7597a4] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Live Camera Snapshot & Telemetry Notice */}
          <div className="border border-[#7898a5] p-2 bg-[#d7e7e4]">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-[11px] text-[#003366]">
                Mandatory Live Photo & Telemetry Check:
              </span>
              <span className="text-[10px] text-[#556677]">
                Home Practice Security
              </span>
            </div>

            <p className="text-[10px] text-[#334455] mb-2 leading-tight">
              By logging in, you approve camera capture of your picture. Your IP address, approximate location, and device details are recorded for security and attendance tracking.
            </p>

            <div className="relative w-full h-[180px] bg-black flex items-center justify-center overflow-hidden border border-[#556677]">
              {photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDataUrl}
                  alt="Captured face snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-black/85 p-3 text-red-300 text-[11px] flex flex-col items-center justify-center text-center space-y-2">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="win-btn px-2 py-1 text-[10px]"
                  >
                    Grant Camera Access
                  </button>
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div className="mt-2 flex justify-between items-center">
              {!photoDataUrl ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraApproved}
                  className="win-btn px-3 py-1 font-semibold text-[11px] hover:bg-[#eae6dd] disabled:opacity-50"
                >
                  📸 Approve & Capture Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="win-btn px-3 py-1 text-[11px] hover:bg-[#eae6dd]"
                >
                  ↻ Retake Photo
                </button>
              )}

              <span className="text-[10px] text-[#445566]">
                {photoDataUrl ? "✓ Photo Verified" : "Capture picture to unlock login"}
              </span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-[#a2beba]">
            <button
              type="submit"
              disabled={isSubmitting || !photoDataUrl}
              className="win-btn px-6 py-1.5 text-xs font-bold text-[#002244] bg-[#dbe8e6] hover:bg-[#d0dfdd] disabled:opacity-50"
            >
              {isSubmitting ? "Authenticating..." : "Login to Terminal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

