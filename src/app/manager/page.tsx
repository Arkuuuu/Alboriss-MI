"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OperatorAnalytics, LoginAuditEntry, Employee, PracticeImage, CandidateQASummary } from "@/types/auth";

interface ManagerData {
  overview: {
    totalChartsCompleted: number;
    averageChartsPerMinute: number;
    activeOperatorsCount: number;
    totalEmployeesCount: number;
  };
  operators: OperatorAnalytics[];
  auditLogs: LoginAuditEntry[];
}

export default function ManagerPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<ManagerData | null>(null);
  const [employees, setEmployees] = useState<Omit<Employee, "passwordHash">[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"productivity" | "employees" | "images" | "quality" | "audit">("productivity");

  // Practice Pool & QA Leaderboard states
  const [practiceImages, setPracticeImages] = useState<PracticeImage[]>([]);
  const [qaLeaderboard, setQaLeaderboard] = useState<CandidateQASummary[]>([]);

  // Dump Image form state
  const [dumpFileName, setDumpFileName] = useState("");
  const [dumpImageDataUrl, setDumpImageDataUrl] = useState("");
  const [dumpFileSize, setDumpFileSize] = useState("");
  const [dumpRecordNo, setDumpRecordNo] = useState("1797");
  const [dumpCustomerName, setDumpCustomerName] = useState("Renate Eh Emdog");
  const [dumpTotalAmount, setDumpTotalAmount] = useState("$191.00");
  const [dumpGroundTruthJson, setDumpGroundTruthJson] = useState("");
  const [dumpSubmitting, setDumpSubmitting] = useState(false);
  const [dumpMessage, setDumpMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // New employee creation form state
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpUser, setNewEmpUser] = useState("");
  const [newEmpPass, setNewEmpPass] = useState("");
  const [empCreating, setEmpCreating] = useState(false);
  const [empMessage, setEmpMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check existing session & fetch data on load
  const checkSessionAndFetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/manager/analytics");
      if (res.status === 401) {
        setIsAuthenticated(false);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load manager telemetry");
      const json = await res.json();
      setData(json.data);
      setIsAuthenticated(true);
      setError(null);

      // Fetch employees
      fetchEmployees();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error connecting to telemetry service");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/manager/employees");
      if (res.ok) {
        const json = await res.json();
        setEmployees(json.employees || []);
      }
    } catch {
      // Quiet fail
    }
  };

  const fetchPracticeImages = async () => {
    try {
      const res = await fetch("/api/manager/images");
      if (res.ok) {
        const json = await res.json();
        setPracticeImages(json.images || []);
      }
    } catch {
      // Quiet fail
    }
  };

  const fetchQaLeaderboard = async () => {
    try {
      const res = await fetch("/api/manager/qa");
      if (res.ok) {
        const json = await res.json();
        setQaLeaderboard(json.qaLeaderboard || []);
      }
    } catch {
      // Quiet fail
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDumpFileName(file.name);
      setDumpFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      const reader = new FileReader();
      reader.onload = () => {
        setDumpImageDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDumpImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setDumpMessage(null);
    setDumpSubmitting(true);

    try {
      if (!dumpImageDataUrl) {
        throw new Error("Please select an image file to dump into the practice pool.");
      }

      let parsedGt: Record<string, string> = {
        recordNo: dumpRecordNo,
        customerName: dumpCustomerName,
        totalAmount: dumpTotalAmount,
        imageName: dumpFileName,
      };

      if (dumpGroundTruthJson.trim()) {
        try {
          parsedGt = { ...parsedGt, ...JSON.parse(dumpGroundTruthJson) };
        } catch {
          throw new Error("Invalid Ground Truth JSON format. Please verify syntax.");
        }
      }

      const res = await fetch("/api/manager/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: dumpFileName,
          imageDataUrl: dumpImageDataUrl,
          fileSize: dumpFileSize || "120 KB",
          groundTruth: parsedGt,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload image.");
      }

      setDumpMessage({
        type: "success",
        text: `Image "${dumpFileName}" successfully dumped into practice pool!`,
      });

      setDumpFileName("");
      setDumpImageDataUrl("");
      setDumpFileSize("");
      setDumpGroundTruthJson("");
      fetchPracticeImages();
    } catch (err: unknown) {
      setDumpMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dump image.",
      });
    } finally {
      setDumpSubmitting(false);
    }
  };

  const handleDeletePracticeImage = async (id: string) => {
    if (!window.confirm("Remove this image from the candidate practice pool?")) return;
    try {
      const res = await fetch(`/api/manager/images/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPracticeImages((prev) => prev.filter((img) => img.id !== id));
      }
    } catch {
      alert("Failed to delete image.");
    }
  };

  useEffect(() => {
    checkSessionAndFetchData();
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkSessionAndFetchData();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);

    try {
      const res = await fetch("/api/manager/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Authentication failed");
      }

      setIsAuthenticated(true);
      setLoginPassword("");
      await checkSessionAndFetchData();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/manager/logout", { method: "POST" });
    setIsAuthenticated(false);
    setData(null);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpMessage(null);
    setEmpCreating(true);

    try {
      const res = await fetch("/api/manager/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEmpName,
          username: newEmpUser,
          password: newEmpPass,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create employee");
      }

      setEmpMessage({ type: "success", text: `Employee "${newEmpName}" created with username "${newEmpUser}".` });
      setNewEmpName("");
      setNewEmpUser("");
      setNewEmpPass("");
      fetchEmployees();
    } catch (err: unknown) {
      setEmpMessage({ type: "error", text: err instanceof Error ? err.message : "Error creating employee" });
    } finally {
      setEmpCreating(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/manager/employees/${id}`, { method: "PATCH" });
      if (res.ok) {
        fetchEmployees();
      }
    } catch {
      // Quiet fail
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee "${name}"?`)) return;
    try {
      const res = await fetch(`/api/manager/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEmployees();
      }
    } catch {
      // Quiet fail
    }
  };

  // 1. UN-AUTHENTICATED STATE: MANAGER VERIFICATION GATEWAY
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] flex items-center justify-center p-4 font-sans select-none">
        <div className="max-w-md w-full bg-[#131b2e] border border-[#1e293b] rounded-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg shadow-lg shadow-cyan-900/30">
              MP
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Manager Verification Gateway
            </h1>
            <p className="text-xs text-[#94a3b8] mt-1">
              Restricted portal — authorized management access only
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleManagerLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-[#cbd5e1] mb-1.5">
                Manager ID
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="manager"
                className="w-full h-10 px-3 rounded-lg bg-[#0a0f1d] border border-[#334155] text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#cbd5e1] mb-1.5">
                Security Passkey
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3 rounded-lg bg-[#0a0f1d] border border-[#334155] text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full h-10 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {loginSubmitting ? "Authenticating..." : "Verify & Access Portal"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#1e293b] text-center">
            <Link
              href="/"
              className="text-xs text-[#64748b] hover:text-[#94a3b8] transition"
            >
              ← Return to Application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. LOADING STATE
  if (isAuthenticated === null || (loading && !data)) {
    return (
      <div className="min-h-screen bg-[#090d16] text-[#94a3b8] flex items-center justify-center font-sans text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span>Verifying manager security credentials...</span>
        </div>
      </div>
    );
  }

  // 3. AUTHENTICATED STATE: FULL MANAGER OVERSIGHT CENTER
  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] font-sans">
      {/* Top Header */}
      <header className="border-b border-[#1e293b] bg-[#0f172a]/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            M
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                Manager Operations & Verification Center
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Supabase & Vercel Ready
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Employee Management, Home Practice Telemetry & Live CPM Oversight
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={checkSessionAndFetchData}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-[#1e293b] hover:bg-[#334155] text-white rounded font-medium transition flex items-center space-x-1"
          >
            <span>{loading ? "Refreshing..." : "↻ Refresh"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded font-medium transition"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* 1. KEY METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          {/* Charts Per Minute (CPM) */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
              Throughput Speed
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {data ? data.overview.averageChartsPerMinute : "—"}
              </span>
              <span className="text-xs font-medium text-[#94a3b8]">charts / min</span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-2">
              Average speed across all active practice sessions
            </p>
          </div>

          {/* Total Charts Completed */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Total Completed
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {data ? data.overview.totalChartsCompleted : "—"}
              </span>
              <span className="text-xs font-medium text-[#94a3b8]">charts</span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-2">
              Completed home practice records
            </p>
          </div>

          {/* Managed Employees Count */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              Authorized Staff
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">
                {employees.length}
              </span>
              <span className="text-xs font-medium text-[#94a3b8]">employees</span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-2">
              Unique credentials issued by Manager
            </p>
          </div>

          {/* Identity Verification */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              Home Practice Telemetry
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">Active</span>
              <span className="text-xs font-medium text-emerald-400 font-semibold">
                Photo + IP + Device
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-2">
              Full device, IP, and webcam capture enforced
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-[#1e293b] mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("productivity")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === "productivity"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Operator Productivity & Speed (CPM)
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === "employees"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Employee Credentials Management ({employees.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("images");
              fetchPracticeImages();
            }}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === "images"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Practice Image Pool & Dumps ({practiceImages.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("quality");
              fetchQaLeaderboard();
            }}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === "quality"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Quality Analyst (QA) Leaderboard & Accuracy
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === "audit"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Home Practice Attendance & Device Audit ({data?.auditLogs.length || 0})
          </button>
        </div>

        {/* TAB 1: OPERATOR PRODUCTIVITY TABLE */}
        {activeTab === "productivity" && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#1e293b]">
              <h2 className="text-sm font-bold text-white">
                Live Operator Speed & Completion Rates
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Real-time tracking of charts completed per minute (CPM)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0a0f1d] text-[#94a3b8] text-xs uppercase tracking-wider border-b border-[#1e293b]">
                  <tr>
                    <th className="py-3.5 px-6 font-semibold">Operator</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold">Completed Charts</th>
                    <th className="py-3.5 px-6 font-semibold">Active Time</th>
                    <th className="py-3.5 px-6 font-semibold">
                      Speed (Charts / Min)
                    </th>
                    <th className="py-3.5 px-6 font-semibold">Avg Time / Chart</th>
                    <th className="py-3.5 px-6 font-semibold">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {data?.operators && data.operators.length > 0 ? (
                    data.operators.map((op) => (
                      <tr key={op.operatorId} className="hover:bg-[#131b2e]/60 transition">
                        <td className="py-4 px-6 font-medium text-white flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xs font-bold">
                            {op.operatorName.charAt(0)}
                          </div>
                          <div>
                            <div>{op.operatorName}</div>
                            <div className="text-[11px] text-[#64748b]">
                              ID: {op.operatorId}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              op.status === "online"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : op.status === "idle"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                op.status === "online"
                                  ? "bg-emerald-400 animate-pulse"
                                  : op.status === "idle"
                                  ? "bg-amber-400"
                                  : "bg-slate-500"
                              }`}
                            />
                            {op.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-white">
                          {op.totalCompleted}
                        </td>
                        <td className="py-4 px-6 text-[#cbd5e1]">
                          {op.totalActiveMinutes} mins
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                              op.chartsPerMinute >= 1.8
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                                : op.chartsPerMinute >= 1.0
                                ? "bg-blue-950 text-blue-300 border border-blue-700"
                                : "bg-orange-950 text-orange-300 border border-orange-700"
                            }`}
                          >
                            {op.chartsPerMinute} CPM
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#cbd5e1]">
                          {op.averageSecondsPerChart}s
                        </td>
                        <td className="py-4 px-6 text-xs text-[#94a3b8]">
                          {new Date(op.lastActive).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#64748b]">
                        No practice charts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: EMPLOYEE CREDENTIALS MANAGEMENT */}
        {activeTab === "employees" && (
          <div className="space-y-6">
            {/* Create New Employee Form */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-white mb-1">
                Create Unique Employee Credentials
              </h2>
              <p className="text-xs text-[#94a3b8] mb-4">
                Issue unique login credentials for employees practicing from home
              </p>

              {empMessage && (
                <div
                  className={`mb-4 p-3 rounded text-xs ${
                    empMessage.type === "success"
                      ? "bg-emerald-950/70 border border-emerald-800 text-emerald-300"
                      : "bg-red-950/70 border border-red-800 text-red-300"
                  }`}
                >
                  {empMessage.text}
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
                <div>
                  <label className="block text-xs font-medium text-[#cbd5e1] mb-1">
                    Employee Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full h-9 px-3 rounded-lg bg-[#0a0f1d] border border-[#334155] text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cbd5e1] mb-1">
                    Unique Username / Operator ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmpUser}
                    onChange={(e) => setNewEmpUser(e.target.value)}
                    placeholder="e.g. operator3"
                    className="w-full h-9 px-3 rounded-lg bg-[#0a0f1d] border border-[#334155] text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#cbd5e1] mb-1">
                    Assigned Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newEmpPass}
                    onChange={(e) => setNewEmpPass(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full h-9 px-3 rounded-lg bg-[#0a0f1d] border border-[#334155] text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={empCreating}
                    className="w-full h-9 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow transition disabled:opacity-50"
                  >
                    {empCreating ? "Creating..." : "+ Add Employee"}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Employees List */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#1e293b] flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Authorized Employee Roster
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Active employee accounts able to log in to the portal
                  </p>
                </div>
                <span className="text-xs text-[#64748b]">
                  Total: {employees.length} accounts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0a0f1d] text-[#94a3b8] text-xs uppercase tracking-wider border-b border-[#1e293b]">
                    <tr>
                      <th className="py-3 px-6 font-semibold">Employee</th>
                      <th className="py-3 px-6 font-semibold">Unique Username</th>
                      <th className="py-3 px-6 font-semibold">Account Status</th>
                      <th className="py-3 px-6 font-semibold">Date Created</th>
                      <th className="py-3 px-6 font-semibold">Last Login</th>
                      <th className="py-3 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#131b2e]/60 transition">
                        <td className="py-3.5 px-6 font-medium text-white">
                          <div>{emp.name}</div>
                          <div className="text-[11px] text-[#64748b]">ID: {emp.id}</div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-cyan-300 text-xs">
                          {emp.username}
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              emp.status === "active"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {emp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-xs text-[#cbd5e1]">
                          {new Date(emp.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-[#cbd5e1]">
                          {emp.lastLoginAt
                            ? new Date(emp.lastLoginAt).toLocaleString()
                            : "Never logged in"}
                        </td>
                        <td className="py-3.5 px-6 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp.id)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                              emp.status === "active"
                                ? "bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800"
                                : "bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800"
                            }`}
                          >
                            {emp.status === "active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HOME PRACTICE IDENTITY & DEVICE AUDIT LOG */}
        {activeTab === "audit" && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#1e293b]">
              <h2 className="text-sm font-bold text-white">
                Home Practice Attendance & Device Telemetry Audit
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Every login stores a live webcam snapshot, IP address, geographic location, and device details
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0a0f1d] text-[#94a3b8] text-xs uppercase tracking-wider border-b border-[#1e293b]">
                  <tr>
                    <th className="py-3.5 px-6 font-semibold">Verification Photo</th>
                    <th className="py-3.5 px-6 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-6 font-semibold">Employee</th>
                    <th className="py-3.5 px-6 font-semibold">Client IP & Location</th>
                    <th className="py-3.5 px-6 font-semibold">Device & Environment</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {data?.auditLogs && data.auditLogs.length > 0 ? (
                    data.auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#131b2e]/60 transition">
                        <td className="py-3 px-6">
                          {log.photoDataUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(log.photoDataUrl)}
                              className="relative group block w-16 h-12 rounded border border-[#334155] overflow-hidden bg-black focus:outline-none"
                              title="Click to view full login picture"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={log.photoDataUrl}
                                alt={`Login snapshot for ${log.username}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold transition">
                                VIEW
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-[#64748b] font-mono">
                              No Photo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-xs text-[#cbd5e1] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 font-medium text-white">
                          <div>{log.username}</div>
                          <div className="text-[11px] text-[#64748b]">
                            {log.userId}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <div className="font-mono text-xs text-cyan-300">
                            {log.ipAddress}
                          </div>
                          <div className="text-[11px] text-[#94a3b8]">
                            {log.location?.city ? `${log.location.city}, ` : ""}
                            {log.location?.country || "Home Network"}
                          </div>
                        </td>
                        <td className="py-3 px-6 text-xs text-[#cbd5e1]">
                          <div className="font-medium text-white">
                            {log.device?.os || "PC"} — {log.device?.browser || "Browser"}
                          </div>
                          <div className="text-[11px] text-[#94a3b8]">
                            Res: {log.device?.screenResolution || "Unknown"} | TZ: {log.device?.timezone || "UTC"}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              log.status === "success"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#64748b]">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PRACTICE IMAGE POOL & DUMPS */}
        {activeTab === "images" && (
          <div className="space-y-6">
            {/* Dump Form */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-white mb-1">
                Dump Practice Charts into Candidate Pool
              </h2>
              <p className="text-xs text-[#94a3b8] mb-5">
                Upload scanned insurance charts for candidates to practice on. Candidates will select from this library in their simulated Windows Open dialog.
              </p>

              {dumpMessage && (
                <div
                  className={`p-3 rounded-lg text-xs mb-4 ${
                    dumpMessage.type === "success"
                      ? "bg-emerald-950/80 border border-emerald-700 text-emerald-300"
                      : "bg-red-950/80 border border-red-700 text-red-300"
                  }`}
                >
                  {dumpMessage.text}
                </div>
              )}

              <form onSubmit={handleDumpImage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload / Image Picker */}
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                      Select Chart Image (JPEG, PNG, WebP, BMP):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="w-full text-xs text-[#94a3b8] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                    />
                    {dumpFileName && (
                      <p className="text-[11px] text-cyan-400 mt-1 font-mono">
                        Selected: {dumpFileName} ({dumpFileSize})
                      </p>
                    )}
                  </div>

                  {/* Image Filename Display Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                      Practice File Name (as displayed in candidate dialog):
                    </label>
                    <input
                      type="text"
                      required
                      value={dumpFileName}
                      onChange={(e) => setDumpFileName(e.target.value)}
                      placeholder="e.g. MI 27_K-1 (90).jpeg"
                      className="w-full h-9 px-3 bg-[#090d16] border border-[#1e293b] rounded-lg text-xs text-white placeholder-[#475569] focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {/* Ground Truth Configuration */}
                <div className="border border-[#1e293b] rounded-lg p-4 bg-[#090d16]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Ground Truth Key Data (For Quality Analyst Accuracy Scoring)
                      </span>
                      <span className="text-[11px] text-[#64748b]">
                        Expected correct values that candidates will be graded against.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const sampleGt = {
                          recordNo: "1802",
                          customerName: "David M. Richardson",
                          emailAddress: "david.r@globalmail.com",
                          resAddress: "405 Lexington Ave, Suite 12",
                          city1: "NEW YORK",
                          state1: "NY",
                          zip1: "10174",
                          phNo1: "212-555-0199",
                          country1: "US",
                          sex1: "MALE",
                          dBirth: "08/14/1962",
                          height: "178",
                          weight: "182",
                          bloodGroup: "O+",
                          billingName: "David M. Richardson",
                          shipperName: "Metro Logistics Express",
                          city2: "NEW YORK",
                          state2: "NY",
                          zip2: "10174",
                          country2: "US",
                          phNo2: "212-555-0188",
                          alcoholic: "NO",
                          smoker: "NO",
                          pastSurg: "NO",
                          diabetic: "NO",
                          allergiesd: "PENICILLIN",
                          policyNo: "POL-NY-98234-A",
                          dBLifeAssure: "08/14/1962",
                          pInst: "$300.00",
                          namePHolder: "David M. Richardson",
                          stmName: "St. Jude Medical Group",
                          stmCode: "SJM-NYC-04",
                          dob: "08/14/1962",
                          sex2: "MALE",
                          cardName: "Chase Health Care",
                          medicine: "LIPITOR",
                          dosage: "20 MG",
                          tablets: "90",
                          pillRate: "$2.10",
                          cost: "$189.00",
                          shippingCost: "$15.00",
                          totalAmount: "$204.00",
                          remark: "Approved prescription Lipitor 20 MG 90 tablets total $204.00",
                        };
                        setDumpGroundTruthJson(JSON.stringify(sampleGt, null, 2));
                        setDumpRecordNo(sampleGt.recordNo);
                        setDumpCustomerName(sampleGt.customerName);
                        setDumpTotalAmount(sampleGt.totalAmount);
                      }}
                      className="px-2.5 py-1 text-xs bg-[#1e293b] hover:bg-[#334155] text-cyan-300 border border-cyan-800/60 rounded font-medium transition"
                    >
                      ⚡ Auto-Fill Sample Medical Chart Key (42 fields)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#94a3b8] mb-1">
                        Expected Record No:
                      </label>
                      <input
                        type="text"
                        value={dumpRecordNo}
                        onChange={(e) => setDumpRecordNo(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[#090d16] border border-[#1e293b] rounded text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#94a3b8] mb-1">
                        Expected Customer Name:
                      </label>
                      <input
                        type="text"
                        value={dumpCustomerName}
                        onChange={(e) => setDumpCustomerName(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[#090d16] border border-[#1e293b] rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#94a3b8] mb-1">
                        Expected Total Amount:
                      </label>
                      <input
                        type="text"
                        value={dumpTotalAmount}
                        onChange={(e) => setDumpTotalAmount(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[#090d16] border border-[#1e293b] rounded text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#94a3b8] mb-1">
                      Full Field Ground Truth JSON (Optional / Advanced):
                    </label>
                    <textarea
                      rows={3}
                      value={dumpGroundTruthJson}
                      onChange={(e) => setDumpGroundTruthJson(e.target.value)}
                      placeholder='{ "emailAddress": "...", "resAddress": "...", "medicine": "...", "cost": "..." }'
                      className="w-full p-2 bg-[#090d16] border border-[#1e293b] rounded text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={dumpSubmitting}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow text-xs transition disabled:opacity-50"
                  >
                    {dumpSubmitting ? "Uploading & Initializing..." : "Dump Practice Image to Pool"}
                  </button>
                </div>
              </form>
            </div>

            {/* Current Pool List */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Available Practice Charts ({practiceImages.length})
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Images currently accessible in candidate workstation dialogs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchPracticeImages}
                  className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] text-xs text-white rounded transition"
                >
                  ↻ Refresh Pool
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e293b] bg-[#090d16]/50 text-xs font-semibold text-[#94a3b8]">
                      <th className="py-3 px-6">Preview</th>
                      <th className="py-3 px-6">File Name</th>
                      <th className="py-3 px-6">File Size</th>
                      <th className="py-3 px-6">Ground Truth Status</th>
                      <th className="py-3 px-6">Dumped At</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {practiceImages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#64748b] text-xs">
                          No practice charts uploaded yet. Use form above to dump images.
                        </td>
                      </tr>
                    ) : (
                      practiceImages.map((img) => (
                        <tr key={img.id} className="hover:bg-[#1e293b]/30 transition">
                          <td className="py-3 px-6">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.imageUrl}
                              alt={img.fileName}
                              className="w-16 h-10 object-cover rounded border border-[#334155] bg-black"
                            />
                          </td>
                          <td className="py-3 px-6 font-mono text-xs text-cyan-300 font-semibold">
                            {img.fileName}
                          </td>
                          <td className="py-3 px-6 text-xs text-[#94a3b8]">
                            {img.fileSize || "120 KB"}
                          </td>
                          <td className="py-3 px-6 text-xs">
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ✓ {Object.keys(img.groundTruth || {}).length || 42} Fields Verified
                            </span>
                          </td>
                          <td className="py-3 px-6 text-xs text-[#94a3b8]">
                            {new Date(img.uploadedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeletePracticeImage(img.id)}
                              className="px-2.5 py-1 text-xs text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded font-medium transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QUALITY ANALYST (QA) LEADERBOARD & ACCURACY */}
        {activeTab === "quality" && (
          <div className="space-y-6">
            {/* Policy Banner */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-sm">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xl">🎯</span>
                <h2 className="text-base font-bold text-white">
                  Candidate Quality Standard: Strictly Maintain 95%+ Accuracy
                </h2>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Candidates practicing data entry must achieve and maintain an average accuracy score of at least <strong>95.0%</strong>. Every completed image evaluates 40+ medical insurance fields against strict ground truth data. Discrepancies and cumulative mistakes are tracked in real-time.
              </p>
            </div>

            {/* QA Table */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Candidate Quality Analyst Accuracy Leaderboard
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Performance metrics, mistake counts, and 95%+ qualification audit
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchQaLeaderboard}
                  className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] text-xs text-white rounded transition"
                >
                  ↻ Refresh QA Data
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e293b] bg-[#090d16]/50 text-xs font-semibold text-[#94a3b8]">
                      <th className="py-3.5 px-6">Candidate</th>
                      <th className="py-3.5 px-6">Completed Charts</th>
                      <th className="py-3.5 px-6">Total Mistakes Made</th>
                      <th className="py-3.5 px-6">Average Accuracy</th>
                      <th className="py-3.5 px-6">Strict Standard Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {qaLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#64748b] text-xs">
                          No candidate charts completed yet. Metrics will appear automatically as practice charts are saved.
                        </td>
                      </tr>
                    ) : (
                      qaLeaderboard.map((item) => {
                        const isQual = item.averageAccuracy >= 95.0;
                        return (
                          <tr key={item.operatorId} className="hover:bg-[#1e293b]/30 transition">
                            <td className="py-3.5 px-6">
                              <div className="font-semibold text-white text-xs">
                                {item.operatorName || item.operatorId}
                              </div>
                              <div className="text-[11px] text-[#64748b] font-mono">
                                ID: {item.operatorId}
                              </div>
                            </td>
                            <td className="py-3.5 px-6 text-xs text-[#cbd5e1] font-mono font-bold">
                              {item.completedCount} charts
                            </td>
                            <td className="py-3.5 px-6 text-xs font-mono font-bold text-red-400">
                              {item.totalMistakes} mistakes
                            </td>
                            <td className="py-3.5 px-6">
                              <span
                                className={`text-base font-bold font-mono ${
                                  isQual ? "text-emerald-400" : "text-red-400"
                                }`}
                              >
                                {item.averageAccuracy}%
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded text-xs font-bold ${
                                  isQual
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-red-950 text-red-400 border border-red-800"
                                }`}
                              >
                                {isQual
                                  ? "✓ QUALIFIED (>= 95.0%)"
                                  : "✗ WARNING / BELOW 95%"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal to view enlarged login photo */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-white text-sm">
                  Identity Verification Snapshot
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="text-[#94a3b8] hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="rounded-lg overflow-hidden border border-[#1e293b] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto}
                  alt="Login snapshot"
                  className="w-full h-auto max-h-[360px] object-contain"
                />
              </div>
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
