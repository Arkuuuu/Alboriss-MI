"use client";

import React, { useState, useEffect } from "react";
import { PracticeImage } from "@/types/auth";

interface CompletedPracticeImage extends PracticeImage {
  accuracyPercent?: number;
  mistakesCount?: number;
  completedAt?: string;
}

interface WindowsOpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: PracticeImage) => void;
}

export default function WindowsOpenDialog({
  isOpen,
  onClose,
  onSelectImage,
}: WindowsOpenDialogProps) {
  const [currentFolder, setCurrentFolder] = useState<"pending" | "completed">("pending");
  const [pendingImages, setPendingImages] = useState<PracticeImage[]>([]);
  const [completedImages, setCompletedImages] = useState<CompletedPracticeImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PracticeImage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"icons" | "details">("details");

  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/images");
      if (res.ok) {
        const json = await res.json();
        setPendingImages(json.pending || []);
        setCompletedImages(json.completed || []);
      }
    } catch (err) {
      console.error("Failed to load practice images:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
      setSelectedImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentList = currentFolder === "pending" ? pendingImages : completedImages;

  const handleOpenSelected = () => {
    if (selectedImage) {
      onSelectImage(selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-center p-2 select-none font-sans text-xs">
      {/* 3D Classic Windows Dialog Box */}
      <div
        className="w-[620px] bg-[#d4d0c8] border-2 border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] shadow-2xl flex flex-col"
        style={{
          boxShadow: "2px 2px 0px #000000, inset 1px 1px 0px #dfdfdf",
        }}
      >
        {/* Title Bar */}
        <div className="bg-[#0a246a] text-white px-2 py-1 flex items-center justify-between font-bold text-xs select-none">
          <div className="flex items-center space-x-1.5">
            <span className="text-[13px]">🖼️</span>
            <span>Open Practice Document</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              className="w-4 h-4 bg-[#d4d0c8] text-black font-bold text-[10px] flex items-center justify-center border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
              title="Help"
            >
              ?
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-4 h-4 bg-[#d4d0c8] text-black font-bold text-[10px] flex items-center justify-center border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dialog Body */}
        <div className="p-2 space-y-2">
          {/* Top Bar: Look In Dropdown & Folder View Tools */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-black font-medium">Look in:</span>
              <div className="relative">
                <select
                  value={currentFolder}
                  onChange={(e) => {
                    setCurrentFolder(e.target.value as "pending" | "completed");
                    setSelectedImage(null);
                  }}
                  className="bg-white border border-[#7f9db9] h-6 px-1.5 text-xs text-black focus:outline-none cursor-pointer pr-6"
                >
                  <option value="pending">
                    📁 Pending Practice Images ({pendingImages.length})
                  </option>
                  <option value="completed">
                    📁 Completed Folder ({completedImages.length})
                  </option>
                </select>
              </div>
            </div>

            {/* Folder Tools */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "details" ? "icons" : "details")}
                className="px-2 h-6 bg-[#d4d0c8] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040] flex items-center space-x-1"
                title="Toggle View"
              >
                <span>{viewMode === "details" ? "📋 Details" : "🔲 Icons"}</span>
              </button>
              <button
                type="button"
                onClick={fetchImages}
                className="px-2 h-6 bg-[#d4d0c8] border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
                title="Refresh Folder"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Main Area: Left Quick Navigation + Right File Viewport */}
          <div className="flex space-x-2">
            {/* Left Quick Navigation (Places Bar) */}
            <div className="w-[120px] bg-[#ece9d8] border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] p-1 flex flex-col space-y-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentFolder("pending");
                  setSelectedImage(null);
                }}
                className={`p-2 flex flex-col items-center justify-center text-center border ${
                  currentFolder === "pending"
                    ? "bg-[#316ac5] text-white border-[#000000]"
                    : "bg-[#d4d0c8] text-black border-transparent hover:bg-[#e0ded8]"
                }`}
              >
                <span className="text-xl">📂</span>
                <span className="font-semibold text-[10px] mt-0.5">Pending Images</span>
                <span className="text-[9px] opacity-80">({pendingImages.length} ready)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentFolder("completed");
                  setSelectedImage(null);
                }}
                className={`p-2 flex flex-col items-center justify-center text-center border ${
                  currentFolder === "completed"
                    ? "bg-[#316ac5] text-white border-[#000000]"
                    : "bg-[#d4d0c8] text-black border-transparent hover:bg-[#e0ded8]"
                }`}
              >
                <span className="text-xl">📁</span>
                <span className="font-semibold text-[10px] mt-0.5">Completed Folder</span>
                <span className="text-[9px] opacity-80">({completedImages.length} done)</span>
              </button>

              {/* Status info */}
              <div className="mt-auto p-1 text-[9px] text-[#444444] bg-[#f0ede4] border border-[#a0a0a0] leading-tight">
                Practice pool synchronized with Manager portal.
              </div>
            </div>

            {/* Right File Viewport */}
            <div className="flex-1 bg-white border border-t-[#404040] border-l-[#404040] border-r-[#ffffff] border-b-[#ffffff] h-[220px] overflow-y-auto p-1">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-[#666666]">
                  Loading practice files...
                </div>
              ) : currentList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[#777777] p-4 text-center">
                  <span className="text-2xl mb-1">📭</span>
                  <span className="font-semibold">
                    {currentFolder === "pending"
                      ? "No pending practice images available."
                      : "No completed images yet."}
                  </span>
                  <span className="text-[10px] text-[#888888] mt-1">
                    {currentFolder === "pending"
                      ? "Images dumped from the Manager Portal will appear here."
                      : "Once you complete and save a chart, it moves to this folder automatically."}
                  </span>
                </div>
              ) : viewMode === "details" ? (
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#f0ede4] border-b border-[#d4d0c8] text-[#333333]">
                      <th className="p-1 font-semibold">Name</th>
                      <th className="p-1 font-semibold w-20">Size</th>
                      {currentFolder === "completed" && (
                        <>
                          <th className="p-1 font-semibold w-24">Accuracy</th>
                          <th className="p-1 font-semibold w-20">Mistakes</th>
                        </>
                      )}
                      <th className="p-1 font-semibold w-28">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((img) => {
                      const isSelected = selectedImage?.id === img.id;
                      const comp = img as CompletedPracticeImage;
                      return (
                        <tr
                          key={img.id}
                          onClick={() => setSelectedImage(img)}
                          onDoubleClick={() => {
                            setSelectedImage(img);
                            onSelectImage(img);
                            onClose();
                          }}
                          className={`cursor-pointer ${
                            isSelected
                              ? "bg-[#0a246a] text-white"
                              : "hover:bg-[#eef3f8] text-black"
                          }`}
                        >
                          <td className="p-1 flex items-center space-x-1.5 truncate">
                            <span className="text-[12px]">📄</span>
                            <span className="font-medium truncate">{img.fileName}</span>
                          </td>
                          <td className={`p-1 ${isSelected ? "text-white" : "text-[#555555]"}`}>
                            {img.fileSize || "120 KB"}
                          </td>
                          {currentFolder === "completed" && (
                            <>
                              <td className="p-1 font-semibold">
                                <span
                                  className={`px-1 py-0.5 rounded text-[10px] ${
                                    (comp.accuracyPercent ?? 100) >= 95
                                      ? isSelected
                                        ? "bg-green-700 text-white"
                                        : "bg-green-100 text-green-800"
                                      : isSelected
                                      ? "bg-red-700 text-white"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {comp.accuracyPercent !== undefined
                                    ? `${comp.accuracyPercent}%`
                                    : "100%"}
                                </span>
                              </td>
                              <td className={`p-1 ${isSelected ? "text-white" : "text-[#555555]"}`}>
                                {comp.mistakesCount ?? 0}
                              </td>
                            </>
                          )}
                          <td className={`p-1 truncate ${isSelected ? "text-white" : "text-[#555555]"}`}>
                            JPEG/PNG Image
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-4 gap-2 p-1">
                  {currentList.map((img) => {
                    const isSelected = selectedImage?.id === img.id;
                    return (
                      <div
                        key={img.id}
                        onClick={() => setSelectedImage(img)}
                        onDoubleClick={() => {
                          setSelectedImage(img);
                          onSelectImage(img);
                          onClose();
                        }}
                        className={`p-1.5 flex flex-col items-center justify-center text-center border cursor-pointer ${
                          isSelected
                            ? "bg-[#0a246a] text-white border-[#000000]"
                            : "hover:bg-[#eef3f8] border-transparent text-black"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt={img.fileName}
                          className="w-16 h-12 object-cover border border-[#999999] bg-white mb-1"
                        />
                        <span className="text-[10px] truncate max-w-full font-medium">
                          {img.fileName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls: File Name, File Type, Open, Cancel */}
          <div className="pt-1 border-t border-[#b5b1a6] flex items-center justify-between">
            <div className="space-y-1.5 flex-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="w-16 text-right text-[11px] text-black">File name:</span>
                <input
                  type="text"
                  readOnly
                  value={selectedImage ? selectedImage.fileName : ""}
                  placeholder="Select a practice image..."
                  className="flex-1 bg-white border border-[#7f9db9] h-6 px-1.5 text-xs text-black focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-16 text-right text-[11px] text-black">Files of type:</span>
                <select
                  disabled
                  className="flex-1 bg-[#ece9d8] border border-[#7f9db9] h-6 px-1.5 text-xs text-[#555555] cursor-default"
                >
                  <option>Medical Chart Images (*.jpg; *.jpeg; *.png; *.bmp)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-1.5 w-24">
              <button
                type="button"
                disabled={!selectedImage}
                onClick={handleOpenSelected}
                className={`h-6 font-semibold text-xs border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] ${
                  selectedImage
                    ? "bg-[#d4d0c8] text-black hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
                    : "bg-[#d4d0c8] text-[#888888] cursor-not-allowed opacity-60"
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-6 font-semibold text-xs bg-[#d4d0c8] text-black border border-t-[#ffffff] border-l-[#ffffff] border-r-[#404040] border-b-[#404040] hover:bg-[#e4e0d8] active:border-t-[#404040] active:border-l-[#404040]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
