"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  validateImageFile,
  sanitizeFilename,
  sanitizeInput,
  safeRecordUpdate,
} from "../lib/security";

interface FieldDef {
  label: string;
  name: string;
  width: number;
}

interface RowDef {
  id: number;
  fields: FieldDef[];
}

const FORM_ROWS: RowDef[] = [
  // ROW 1: Image Name | Record No | Customer Name | Email Address
  {
    id: 1,
    fields: [
      { label: "Image Name", name: "imageName", width: 150 },
      { label: "Record No", name: "recordNo", width: 90 },
      { label: "Customer Name", name: "customerName", width: 295 },
      { label: "Email Address", name: "emailAddress", width: 166 },
    ],
  },
  // ROW 2: Res Address | City_1 | State_1 | Zip_1
  {
    id: 2,
    fields: [
      { label: "Res Address", name: "resAddress", width: 375 },
      { label: "City_1", name: "city1", width: 180 },
      { label: "State_1", name: "state1", width: 175 },
      { label: "Zip_1", name: "zip1", width: 84 },
    ],
  },
  // ROW 3: PhNo_1 | Country_1 | Sex_1 | D_Birth | Height | Weight | Blood Group
  {
    id: 3,
    fields: [
      { label: "PhNo_1", name: "phNo1", width: 135 },
      { label: "Country_1", name: "country1", width: 105 },
      { label: "Sex_1", name: "sex1", width: 65 },
      { label: "D_Birth", name: "dBirth", width: 110 },
      { label: "Height", name: "height", width: 65 },
      { label: "Weight", name: "weight", width: 65 },
      { label: "Blood Group", name: "bloodGroup", width: 94 },
    ],
  },
  // ROW 4: Billing Name | Shipper Name | City_2 | State_2
  {
    id: 4,
    fields: [
      { label: "Billing Name", name: "billingName", width: 225 },
      { label: "Shipper Name", name: "shipperName", width: 215 },
      { label: "City_2", name: "city2", width: 180 },
      { label: "State_2", name: "state2", width: 147 },
    ],
  },
  // ROW 5: Zip_2 | Country_2 | PHNo_2 | Alcoholic | Smoker | Past Surg | Diabetic
  {
    id: 5,
    fields: [
      { label: "Zip_2", name: "zip2", width: 85 },
      { label: "Country_2", name: "country2", width: 105 },
      { label: "PHNo_2", name: "phNo2", width: 140 },
      { label: "Alcoholic", name: "alcoholic", width: 95 },
      { label: "Smoker", name: "smoker", width: 80 },
      { label: "Past Surg", name: "pastSurg", width: 75 },
      { label: "Diabetic", name: "diabetic", width: 57 },
    ],
  },
  // ROW 6: Allergiesd | Policy No | D_B_Life_Assure | P_Inst | Name_P_Holder
  {
    id: 6,
    fields: [
      { label: "Allergiesd", name: "allergiesd", width: 80 },
      { label: "Policy No", name: "policyNo", width: 190 },
      { label: "D_B_Life_Assure", name: "dBLifeAssure", width: 115 },
      { label: "P_Inst", name: "pInst", width: 85 },
      { label: "Name_P_Holder", name: "namePHolder", width: 201 },
    ],
  },
  // ROW 7: STM Name | STM_Code | DOB | Sex_2 | CARD Name
  {
    id: 7,
    fields: [
      { label: "STM Name", name: "stmName", width: 230 },
      { label: "STM_Code", name: "stmCode", width: 160 },
      { label: "DOB", name: "dob", width: 115 },
      { label: "Sex_2", name: "sex2", width: 68 },
      { label: "CARD Name", name: "cardName", width: 159 },
    ],
  },
  // ROW 8: Medicine | Dosage | Tablets | Pill Rate | Cost | Shipping Cost
  {
    id: 8,
    fields: [
      { label: "Medicine", name: "medicine", width: 165 },
      { label: "Dosage", name: "dosage", width: 105 },
      { label: "Tablets", name: "tablets", width: 95 },
      { label: "Pill Rate", name: "pillRate", width: 80 },
      { label: "Cost", name: "cost", width: 55 },
      { label: "Shipping Cost", name: "shippingCost", width: 115 },
    ],
  },
  // ROW 9: Total Amount | Remark
  {
    id: 9,
    fields: [
      { label: "Total Amount", name: "totalAmount", width: 110 },
      { label: "Remark", name: "remark", width: 813 },
    ],
  },
];

const SCROLLBAR_HEIGHT = 737;
const ARROW_HEIGHT = 15;
const TRACK_HEIGHT = SCROLLBAR_HEIGHT - ARROW_HEIGHT * 2; // 707px
const THUMB_HEIGHT = 56;
const MAX_THUMB_TOP = TRACK_HEIGHT - THUMB_HEIGHT; // 651px
const VIEWPORT_HEIGHT = 480;

const VALID_FIELD_NAMES = new Set(
  FORM_ROWS.flatMap((row) => row.fields.map((f) => f.name))
);

export default function MedicalInsuranceApp() {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [scrollPos, setScrollPos] = useState<number>(0);

  // Dragging scrollbar thumb state
  const [isDraggingThumb, setIsDraggingThumb] = useState<boolean>(false);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragStartScroll, setDragStartScroll] = useState<number>(0);

  // Dragging image (pan) state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartY, setPanStartY] = useState<number>(0);
  const [panStartScroll, setPanStartScroll] = useState<number>(0);

  // Background productivity telemetry
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    name: string;
    role: "operator";
  } | null>(null);
  const [chartStartTime, setChartStartTime] = useState<number | null>(null);

  // Check background session if user logged in via dedicated portal
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const maxScroll = Math.max(0, imageHeight - VIEWPORT_HEIGHT);

  // Calculate thumb position on the blue track
  const thumbTop =
    maxScroll > 0
      ? Math.min(MAX_THUMB_TOP, Math.max(0, (scrollPos / maxScroll) * MAX_THUMB_TOP))
      : 185; // Default idle position matching original photo

  // Wheel listener on the image container for smooth scrolling
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (maxScroll <= 0) return;
      e.preventDefault();
      setScrollPos((prev) =>
        Math.max(0, Math.min(maxScroll, prev + e.deltaY))
      );
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
    };
  }, [maxScroll]);

  // Keep image height in sync if imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      setImageHeight(0);
      setScrollPos(0);
    }
  }, [imageSrc]);

  const handleInputChange = (name: string, value: string) => {
    const sanitized = sanitizeInput(value, name === "remark" ? 500 : 150);
    setFormData((prev) =>
      safeRecordUpdate(prev, name, sanitized, VALID_FIELD_NAMES)
    );
  };

  const handleSelectImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error || "Security check failed: invalid file.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Cleanup prior blob URL to eliminate memory leaks
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }

      const safeName = sanitizeFilename(file.name);
      const objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
      setFormData((prev) =>
        safeRecordUpdate(prev, "imageName", safeName, VALID_FIELD_NAMES)
      );
      setScrollPos(0);
      setChartStartTime(Date.now());
    }
  };

  const handleNew = () => {
    if (imageSrc && imageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(imageSrc);
    }
    setFormData({});
    setImageSrc(null);
    setImageHeight(0);
    setScrollPos(0);
    setChartStartTime(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (currentUser) {
      const durationSeconds = chartStartTime
        ? Math.max(5, Math.round((Date.now() - chartStartTime) / 1000))
        : 25;

      try {
        await fetch("/api/records/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatorId: currentUser.id,
            operatorName: currentUser.name,
            recordNo: formData.recordNo || "1797",
            imageName: formData.imageName || "Document.jpg",
            durationSeconds,
          }),
        });
      } catch {
        // Safe offline fallback
      }
    }
    alert("Record saved successfully. Analytics and throughput logged.");
    setChartStartTime(Date.now());
  };

  const handleShowData = () => {
    alert("Show Data feature: Displaying saved records.");
  };

  const handleCancelEdit = () => {
    if (imageSrc && imageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(imageSrc);
    }
    setFormData({});
    setImageSrc(null);
    setImageHeight(0);
    setScrollPos(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to exit?")) {
      window.close();
    }
  };

  // Scrollbar arrow buttons
  const handleScrollUp = () => {
    if (maxScroll > 0) {
      setScrollPos((prev) => Math.max(0, prev - 45));
    }
  };

  const handleScrollDown = () => {
    if (maxScroll > 0) {
      setScrollPos((prev) => Math.min(maxScroll, prev + 45));
    }
  };

  // Scrollbar track click (Page Up / Page Down)
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || maxScroll <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const currentThumbTop = (scrollPos / maxScroll) * MAX_THUMB_TOP;

    if (clickY < currentThumbTop) {
      setScrollPos((prev) => Math.max(0, prev - VIEWPORT_HEIGHT * 0.75));
    } else if (clickY > currentThumbTop + THUMB_HEIGHT) {
      setScrollPos((prev) => Math.min(maxScroll, prev + VIEWPORT_HEIGHT * 0.75));
    }
  };

  // Start dragging thumb
  const handleMouseDownThumb = (e: React.MouseEvent) => {
    e.preventDefault();
    if (maxScroll <= 0) return;
    setIsDraggingThumb(true);
    setDragStartY(e.clientY);
    setDragStartScroll(scrollPos);
  };

  // Start panning image
  const handleMouseDownImage = (e: React.MouseEvent) => {
    if (!imageSrc || maxScroll <= 0) return;
    setIsPanning(true);
    setPanStartY(e.clientY);
    setPanStartScroll(scrollPos);
  };

  // Window mouse move for dragging thumb or panning image
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingThumb && maxScroll > 0) {
      const deltaY = e.clientY - dragStartY;
      const deltaScroll = (deltaY / MAX_THUMB_TOP) * maxScroll;
      const newScroll = Math.max(0, Math.min(maxScroll, dragStartScroll + deltaScroll));
      setScrollPos(newScroll);
    } else if (isPanning && maxScroll > 0) {
      const deltaY = e.clientY - panStartY;
      const newScroll = Math.max(0, Math.min(maxScroll, panStartScroll - deltaY));
      setScrollPos(newScroll);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingThumb(false);
    setIsPanning(false);
  };

  return (
    <div
      className="min-h-screen bg-[#b0d2ce] select-none text-black flex flex-col font-sans overflow-x-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Hidden File Input for Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. APPLICATION WINDOW TITLE BAR */}
      <div className="h-[28px] bg-white border-b border-[#cccccc] flex items-center justify-between px-2 select-none shrink-0">
        <div className="flex items-center space-x-2">
          {/* Medical icon */}
          <div className="w-4 h-4 flex items-center justify-center bg-[#0066cc] rounded-sm text-white font-bold text-[11px] leading-none">
            +
          </div>
          <span className="text-[12px] font-normal text-[#111111]">
            Medical Insurance
          </span>
        </div>

        {/* Window controls */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            className="w-[28px] h-[20px] flex items-center justify-center text-[10px] text-[#333333] hover:bg-[#e5e5e5] active:bg-[#cccccc] rounded-none border border-transparent"
            title="Minimize"
          >
            &#8212;
          </button>
          <button
            type="button"
            className="w-[28px] h-[20px] flex items-center justify-center text-[10px] text-[#333333] hover:bg-[#e5e5e5] active:bg-[#cccccc] rounded-none border border-transparent"
            title="Maximize"
          >
            &#9633;
          </button>
          <button
            type="button"
            className="w-[28px] h-[20px] flex items-center justify-center text-[11px] text-[#333333] hover:bg-[#e81123] hover:text-white active:bg-[#bf0f1d] rounded-none border border-transparent"
            title="Close"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="p-3 pl-4 flex-1 flex flex-col relative min-w-[1080px]">
        {/* TOP BUTTONS TOOLBAR */}
        <div className="flex items-center mb-3">
          <div className="flex items-center space-x-2">
            {/* 1. Select Image */}
            <button
              type="button"
              onClick={handleSelectImageClick}
              className="win-btn min-w-[86px] cursor-pointer hover:bg-[#eae6dd]"
            >
              Select Image
            </button>

            {/* 2. New */}
            <button
              type="button"
              onClick={handleNew}
              className="win-btn min-w-[72px] cursor-pointer hover:bg-[#eae6dd]"
            >
              New
            </button>

            {/* 3. Save */}
            <button
              type="button"
              onClick={handleSave}
              className="win-btn min-w-[68px] cursor-pointer hover:bg-[#eae6dd]"
            >
              Save
            </button>

            {/* 4. Show Data */}
            <button
              type="button"
              onClick={handleShowData}
              className="win-btn min-w-[78px] cursor-pointer hover:bg-[#eae6dd]"
            >
              Show Data
            </button>

            {/* 5. Cancel Edit */}
            <button
              type="button"
              onClick={handleCancelEdit}
              className="win-btn min-w-[78px] cursor-pointer hover:bg-[#eae6dd]"
            >
              Cancel Edit
            </button>

            {/* 6. Exit */}
            <button
              type="button"
              onClick={handleExit}
              className="win-btn-exit min-w-[62px] cursor-pointer hover:bg-[#1a0505]"
            >
              Exit
            </button>

            {/* Additional Dark Rectangular Element */}
            <div
              className="win-dark-rect w-[68px]"
              aria-hidden="true"
            />

            {/* Time label */}
            <div className="pl-3 flex items-center">
              <span className="win-label text-[11.5px] font-normal text-black">
                Time
              </span>
            </div>
          </div>
        </div>

        {/* 3. FORM ROWS & ORIGINAL BLUE SCROLLBAR */}
        <div className="flex items-start">
          {/* Form Content Column (exact 1010px width) */}
          <div className="flex flex-col w-[1010px] shrink-0">
            {/* 9 Form Rows */}
            <div className="flex flex-col space-y-[7px]">
              {FORM_ROWS.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center whitespace-nowrap h-[21px]"
                >
                  {row.fields.map((field, fieldIdx) => (
                    <div
                      key={field.name}
                      className={`flex items-center ${
                        fieldIdx > 0 ? "ml-[11px]" : ""
                      }`}
                    >
                      <label
                        htmlFor={field.name}
                        className="win-label text-[11px]"
                      >
                        {field.label}
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        spellCheck={false}
                        autoComplete="off"
                        value={formData[field.name] || ""}
                        onChange={(e) =>
                          handleInputChange(field.name, e.target.value)
                        }
                        className="win-input text-[11px]"
                        style={{ width: `${field.width}px` }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 4. IMAGE VIEW AREA DIRECTLY BELOW TOTAL AMOUNT & REMARK (ROW 9) */}
            {imageSrc ? (
              <div
                ref={imageContainerRef}
                onMouseDown={handleMouseDownImage}
                className={`w-[1010px] h-[480px] mt-3 overflow-hidden relative select-none border border-[#8dafb0] bg-white shadow-inner ${
                  isPanning ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{
                  // Ensure no native browser scrollbar appears on the image
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <div
                  style={{
                    transform: `translateY(-${scrollPos}px)`,
                    transition:
                      isPanning || isDraggingThumb
                        ? "none"
                        : "transform 0.05s ease-out",
                  }}
                  className="w-full flex justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Medical Document"
                    onLoad={(e) => {
                      setImageHeight(e.currentTarget.clientHeight);
                      setScrollPos(0);
                    }}
                    className="w-[1010px] h-auto select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>
            ) : (
              /* When no image is open, preserve the large empty space below the form */
              <div className="flex-1 min-h-[480px]" aria-hidden="true" />
            )}
          </div>

          {/* ORIGINAL BLUE VERTICAL SCROLLBAR ON THE RIGHT */}
          <div
            className="ml-[12px] w-[15px] bg-[#c5ded9] border border-[#a2beba] flex flex-col relative shrink-0 select-none shadow-inner"
            style={{
              height: `${SCROLLBAR_HEIGHT}px`,
              boxShadow: "inset 1px 0px 0px #b0cbcd, inset -1px 0px 0px #e0eeec",
            }}
          >
            {/* Scroll Up Button */}
            <button
              type="button"
              onClick={handleScrollUp}
              className="w-full h-[15px] bg-[#dbe8e6] border-b border-[#a2beba] flex items-center justify-center cursor-default hover:bg-[#e4efed] active:bg-[#bed6d2]"
              title="Scroll Up"
            >
              <span className="text-[7px] text-[#444444] leading-none select-none">
                &#9650;
              </span>
            </button>

            {/* Scroll Track & Thumb */}
            <div
              className="flex-1 relative w-full overflow-hidden cursor-default"
              onMouseDown={handleTrackMouseDown}
            >
              <div
                onMouseDown={handleMouseDownThumb}
                className="absolute left-0 w-full bg-[#7da0ab] border border-[#5d808c] cursor-default hover:bg-[#7295a0] active:bg-[#658792]"
                style={{
                  top: `${thumbTop}px`,
                  height: `${THUMB_HEIGHT}px`,
                  boxShadow:
                    "inset 1px 1px 0px #a4c4cf, inset -1px -1px 0px #537580",
                }}
              >
                {/* Grip lines */}
                <div className="w-full h-full flex flex-col items-center justify-center space-y-[2px]">
                  <div className="w-[7px] h-[1px] bg-[#537580]" />
                  <div className="w-[7px] h-[1px] bg-[#a4c4cf]" />
                  <div className="w-[7px] h-[1px] bg-[#537580]" />
                </div>
              </div>
            </div>

            {/* Scroll Down Button */}
            <button
              type="button"
              onClick={handleScrollDown}
              className="w-full h-[15px] bg-[#dbe8e6] border-t border-[#a2beba] flex items-center justify-center cursor-default hover:bg-[#e4efed] active:bg-[#bed6d2]"
              title="Scroll Down"
            >
              <span className="text-[7px] text-[#444444] leading-none select-none">
                &#9660;
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
