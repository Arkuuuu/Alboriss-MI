"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OperatorAnalytics, LoginAuditEntry, Employee } from "@/types/auth";

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
  const [activeTab, setActiveTab] = useState<"productivity" | "employees" | "audit">("productivity");

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
        <div className="flex space-x-2 border-b border-[#1e293b] mb-6">
          <button
            onClick={() => setActiveTab("productivity")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 ${
              activeTab === "productivity"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Operator Productivity & Speed (CPM)
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 ${
              activeTab === "employees"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-[#94a3b8] hover:text-white"
            }`}
          >
            Employee Credentials Management ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-4 text-sm font-semibold transition border-b-2 ${
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
