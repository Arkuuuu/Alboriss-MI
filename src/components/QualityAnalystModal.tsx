"use client";

import React, { useState } from "react";
import { QualityAuditResult } from "@/types/auth";

interface QualityAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: QualityAuditResult | null;
}

export default function QualityAnalystModal({
  isOpen,
  onClose,
  result,
}: QualityAnalystModalProps) {
  const [filterMode, setFilterMode] = useState<"mistakes" | "all">("mistakes");

  if (!isOpen || !result) return null;

  const mistakesList = result.discrepancies.filter((d) => !d.isMatch);
  const displayList = filterMode === "mistakes" ? mistakesList : result.discrepancies;

  const isPassed = result.accuracyPercent >= 95.0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 select-none font-sans text-xs">
      <div
        className="w-[720px] bg-[#d4d0c8] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          boxShadow: "3px 3px 0px #000000, inset 1px 1px 0px #dfdfdf",
        }}
      >
        {/* Title Bar */}
        <div className="bg-[#1b435d] text-white px-3 py-1 flex items-center justify-between font-bold text-xs select-none">
          <div className="flex items-center space-x-1.5">
            <span>🛡️</span>
            <span>Quality Analyst — Chart Audit & Accuracy Verification</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-4 h-4 bg-[#d4d0c8] text-black font-bold text-[10px] flex items-center justify-center border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3 overflow-y-auto">
          {/* Mandatory Requirement Banner */}
          <div
            className={`p-2.5 border border-l-4 ${
              isPassed
                ? "bg-[#e8f5e9] border-[#81c784] border-l-[#2e7d32] text-[#1b5e20]"
                : "bg-[#ffebee] border-[#e57373] border-l-[#c62828] text-[#b71c1c]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm flex items-center space-x-1">
                <span>{isPassed ? "✅" : "⚠️"}</span>
                <span>
                  {isPassed
                    ? "QUALITY REQUIREMENT MET (>= 95.0%)"
                    : "STRICT REQUIREMENT WARNING: BELOW 95.0% ACCURACY"}
                </span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white border">
                Current Image: {result.accuracyPercent}%
              </span>
            </div>
            <p className="text-[11px] leading-tight">
              {isPassed
                ? `Excellent precision. Your data entry achieved ${result.accuracyPercent}% accuracy on this chart, meeting the mandatory organizational 95%+ standard.`
                : `Candidates must strictly maintain 95%+ accuracy. Your accuracy on this chart is ${result.accuracyPercent}% with ${result.mistakesCount} mistake(s). Review discrepancy details below.`}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] p-2 text-center">
              <span className="text-[10px] text-[#555555] block">This Image Accuracy</span>
              <span
                className={`text-xl font-bold font-mono ${
                  isPassed ? "text-[#2e7d32]" : "text-[#c62828]"
                }`}
              >
                {result.accuracyPercent}%
              </span>
              <span className="text-[9px] text-[#777777] block mt-0.5">Threshold: 95.0%+</span>
            </div>

            <div className="bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] p-2 text-center">
              <span className="text-[10px] text-[#555555] block">Mistakes This Image</span>
              <span className="text-xl font-bold font-mono text-[#d32f2f]">
                {result.mistakesCount}
              </span>
              <span className="text-[9px] text-[#777777] block mt-0.5">
                of {result.totalFields} fields
              </span>
            </div>

            <div className="bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] p-2 text-center">
              <span className="text-[10px] text-[#555555] block">Cumulative Accuracy</span>
              <span
                className={`text-xl font-bold font-mono ${
                  result.cumulativeAccuracy >= 95 ? "text-[#2e7d32]" : "text-[#d32f2f]"
                }`}
              >
                {result.cumulativeAccuracy}%
              </span>
              <span className="text-[9px] text-[#777777] block mt-0.5">Overall Career</span>
            </div>

            <div className="bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] p-2 text-center">
              <span className="text-[10px] text-[#555555] block">Mistakes So Far</span>
              <span className="text-xl font-bold font-mono text-[#555555]">
                {result.cumulativeMistakes}
              </span>
              <span className="text-[9px] text-[#777777] block mt-0.5">
                Across {result.totalImagesCompleted} charts
              </span>
            </div>
          </div>

          {/* Discrepancy Breakdown Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#113344] text-[11px]">
                Quality Audit Field Comparison:
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setFilterMode("mistakes")}
                  className={`px-2 py-0.5 text-[10px] border ${
                    filterMode === "mistakes"
                      ? "bg-[#316ac5] text-white font-bold border-[#0a246a]"
                      : "bg-[#e0ded8] text-black border-[#a0a0a0]"
                  }`}
                >
                  Mistakes Only ({mistakesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-2 py-0.5 text-[10px] border ${
                    filterMode === "all"
                      ? "bg-[#316ac5] text-white font-bold border-[#0a246a]"
                      : "bg-[#e0ded8] text-black border-[#a0a0a0]"
                  }`}
                >
                  All Evaluated Fields ({result.discrepancies.length})
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] max-h-[220px] overflow-y-auto">
              {displayList.length === 0 ? (
                <div className="p-6 text-center text-[#2e7d32] font-semibold">
                  🎉 Flawless! 0 mistakes detected on this chart.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#e8ebed] border-b border-[#cccccc] text-[#333333] sticky top-0">
                      <th className="p-1.5 font-bold w-36">Field</th>
                      <th className="p-1.5 font-bold">Your Entry</th>
                      <th className="p-1.5 font-bold">Expected (Ground Truth)</th>
                      <th className="p-1.5 font-bold w-20 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayList.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-[#ececec] ${
                          item.isMatch ? "hover:bg-[#f9f9f9]" : "bg-[#fff2f2] hover:bg-[#ffe6e6]"
                        }`}
                      >
                        <td className="p-1.5 font-medium text-[#223344]">{item.label}</td>
                        <td className="p-1.5 font-mono text-[#111111] break-all">
                          {item.actual || <span className="text-[#999999] italic">(Empty)</span>}
                        </td>
                        <td className="p-1.5 font-mono text-[#003366] break-all">
                          {item.expected || <span className="text-[#999999] italic">(Empty)</span>}
                        </td>
                        <td className="p-1.5 text-center">
                          {item.isMatch ? (
                            <span className="text-[#2e7d32] font-bold text-[10px]">
                              ✓ Match
                            </span>
                          ) : (
                            <span className="text-[#c62828] font-bold text-[10px]">
                              ✗ Mistake
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#ece9d8] border-t border-[#b5b1a6] p-2 flex items-center justify-between">
          <div className="text-[10px] text-[#555555]">
            Completed chart has been archived to your personal <strong>Completed</strong> folder.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1 bg-[#d4d0c8] font-bold text-xs border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
          >
            Acknowledge & Next Image
          </button>
        </div>
      </div>
    </div>
  );
}
