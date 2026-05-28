"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";

export type AppTheme = "light" | "dark";
export type AppLanguage = "th" | "en";

const translations = {
  th: {
    actual: "Actual",
    assemblyCheck: "Assembly Check",
    cancel: "ยกเลิก",
    cancelUpload: "ยกเลิกการอัปโหลด",
    ceremonyBoard: "Ceremony board",
    ceremonyDate: "Ceremony Date",
    clear: "Clear",
    clearAll: "ล้างข้อมูลทั้งหมด",
    clearFailed: "ล้างไม่สำเร็จ",
    close: "ปิด",
    customer: "Customer",
    dark: "Dark",
    delivery: "Delivery",
    department: "แผนก",
    editSummaryProject: "Edit Summary Project",
    fileRequiredOffice: "ไฟล์ Office — เปิดในแท็บใหม่เพื่อใช้โปรแกรมบนเครื่อง",
    fileUnsupported:
      "ไม่สามารถแสดงตัวอย่างแบบฝังในเบราว์เซอร์ได้เท่า PDF กรุณาเปิดในแท็บใหม่หรือดาวน์โหลดไปเปิดด้วย Microsoft Office",
    hasFiles: "มีไฟล์อัปโหลดแล้ว",
    language: "Language",
    light: "Light",
    meetingInfo: "ข้อมูลการประชุม",
    noFiles: "ยังไม่มีไฟล์ อัปโหลดเพื่อแสดงในการประชุม",
    noUpload: "ยังไม่มีไฟล์อัปโหลด",
    openFile: "เปิดไฟล์",
    openInNewTab: "เปิดในแท็บใหม่",
    previewPdf: "แสดงตัวอย่าง PDF ในแอป",
    price: "Price",
    projectInformation: "Project information",
    projectName: "Project Name",
    projectNamePlaceholder: "ชื่อโปรเจ็กต์",
    projectNo: "Project No.",
    projectNoPlaceholder: "เลขที่โปรเจ็กต์",
    quality: "Quality",
    qualityPlaceholder: "ตัวอย่าง: 95 หรือ 99.5",
    pricePlaceholder: "ตัวอย่าง: 1500000",
    actualPlaceholder: "ตัวอย่าง: 1285000",
    remove: "ลบ",
    removeFailed: "ลบไฟล์ไม่สำเร็จ",
    save: "บันทึก",
    saveFailed: "บันทึกไม่สำเร็จ",
    saveSummaryFailed: "บันทึก Summary Project ไม่สำเร็จ",
    saved: "บันทึกแล้ว",
    saving: "กำลังบันทึก…",
    selectDate: "Select date",
    shared: "หัวข้อร่วม",
    sharedShort: "Shared",
    summaryProject: "Summary Project",
    summaryProjectOpenDrawer: "เปิดหน้าต่างสรุปโครงการ (มุมมองอ่านง่าย)",
    summaryProjectEditFromDrawer: "แก้ไขข้อมูล",
    theme: "Theme",
    today: "Today",
    upload: "อัปโหลดไฟล์",
    uploadFailed: "อัปโหลดไม่สำเร็จ",
    uploading: "กำลังอัปโหลด…",
    uploadHint: "PDF, Word, Excel, PowerPoint, CSV, TXT, รูปภาพ — อัปโหลดได้หลายไฟล์ต่อครั้ง",
    uploadInvalid:
      "รองรับเฉพาะ .pdf, .doc, .docx, .odt, .rtf, .xls, .xlsx, .ods, .csv, .ppt, .pptx, .odp, .txt และรูปภาพ",
    uploadVideoTopicOnly: "อัปโหลดวิดีโอได้เฉพาะในหน้าต่างวิดีโอเท่านั้น ไม่สามารถอัปโหลดในหัวข้อแผนก",
    uploadInvalidVideo:
      "รองรับเฉพาะไฟล์วิดีโอ เช่น .mp4, .webm, .mkv, .mov, .avi, .m4v, .ogg/.ogv — บางรูปแบบอาจเล่นในเบราว์เซอร์ไม่ได้ขึ้นกับ codec",
    uploadVideoTooLarge: "ไฟล์วิดีโอใหญ่เกิน 5 GB",
    confirmClear: "ยืนยันการเคลียร์",
    confirmClearDescription:
      "จะลบข้อมูลโปรเจ็กต์ในหัวข้อด้านบนและไฟล์ที่อัปโหลดทั้งหมด การกระทำนี้ใช้สำหรับเริ่มประชุมครั้งใหม่",
    confirmDeleteAll: "ยืนยันลบทั้งหมด",
    clearing: "กำลังลบ…",
    fullScreenPreview: "เปิดดู / เต็มจอ",
    loadingPdf: "กำลังโหลด PDF…",
    pdfLoadFailed: "ไม่สามารถโหลด PDF ได้",
    previousPage: "หน้าก่อนหน้า",
    nextPage: "หน้าถัดไป",
    currentPage: "หน้าปัจจุบัน",
    zoomIn: "ขยาย",
    zoomOut: "ย่อ",
    resetZoom: "รีเซ็ตซูม",
    rotatePage: "หมุนหน้า",
    moreActions: "ตัวเลือกเพิ่มเติม",
    pdfHandTool: "มือ — ลากเพื่อเลื่อนดู",
    pdfCtrlWheelHint: "Ctrl + เลื่อนล้อเพื่อซูม",
    presenterPointer: "ตัวชี้สำหรับนำเสนอ",
    previewImage: "ดูตัวอย่างรูปภาพ",
    loadingImage: "กำลังโหลดรูปภาพ…",
    imageLoadFailed: "ไม่สามารถโหลดรูปภาพได้",
    resetView: "รีเซ็ตมุมมอง",
    previewConverted: "แปลงเอกสารเป็น PDF เพื่อแสดงในแอป",
    convertingDocument: "กำลังแปลงเอกสารเป็น PDF…",
    convertingHint: "การแปลงครั้งแรกอาจใช้เวลาสักครู่ ระบบจะแคชผลลัพธ์ไว้ให้ใช้ครั้งต่อไป",
    converterUnavailable: "ไม่พบ LibreOffice บนเซิร์ฟเวอร์ — ติดตั้ง LibreOffice หรือกำหนด LIBREOFFICE_PATH",
    converterFailed: "แปลงเอกสารเป็น PDF ไม่สำเร็จ",
    rename: "เปลี่ยนชื่อ",
    videoLibrary: "วิดีโอ",
    uploadVideo: "อัปโหลดวิดีโอ",
    noVideosYet: "ยังไม่มีวิดีโอ",
    backToVideoList: "รายการวิดีโอ",
    newFileName: "ชื่อที่แสดง",
    renameFailed: "เปลี่ยนชื่อไม่สำเร็จ",
    confirmDeleteVideo: "ลบวิดีโอนี้หรือไม่?",
    confirmDeleteVideoDescription: "ไฟล์จะถูกลบถาวรจากคลังวิดีโอ",
    confirmDeleteVideoAction: "ลบวิดีโอ",
    deletingVideo: "กำลังลบ…",
    loadingVideo: "กำลังโหลดวิดีโอ…",
    videoPlayError: "เล่นวิดีโอไม่สำเร็จ",
    videoPlayer: "เล่นวิดีโอ",
    videoPlayAction: "เล่น",
    videoPause: "หยุดชั่วคราว",
    videoMute: "ปิดเสียง",
    videoUnmute: "เปิดเสียง",
    videoVolume: "ระดับเสียง",
    videoSeek: "ตำแหน่งเล่น",
    videoLoop: "เล่นซ้ำ",
    videoPlaybackSpeed: "ความเร็ววิดีโอ",
    videoFullscreen: "เต็มจอ",
    videoExitFullscreen: "ออกจากเต็มจอ",
    videoExpandPanel: "ขยายเต็มพื้นที่ (กว้าง/สูง 100%)",
    videoShrinkPanel: "ย่อหน้าต่างเล็ก",
    toggleVideoPanel: "เปิดหรือปิดหน้าต่างวิดีโอ",
  },
  en: {
    actual: "Actual",
    assemblyCheck: "Assembly Check",
    cancel: "Cancel",
    cancelUpload: "Cancel upload",
    ceremonyBoard: "Ceremony board",
    ceremonyDate: "Ceremony Date",
    clear: "Clear",
    clearAll: "Clear all data",
    clearFailed: "Unable to clear data",
    close: "Close",
    customer: "Customer",
    dark: "Dark",
    delivery: "Delivery",
    department: "Department",
    editSummaryProject: "Edit Summary Project",
    fileRequiredOffice: "Office file — open in a new tab to use local apps",
    fileUnsupported:
      "This Office file cannot be embedded like a PDF. Open it in a new tab or download it for Microsoft Office.",
    hasFiles: "Files uploaded",
    language: "Language",
    light: "Light",
    meetingInfo: "Meeting info",
    noFiles: "No files yet. Upload documents for the meeting.",
    noUpload: "No files uploaded",
    openFile: "Open file",
    openInNewTab: "Open in new tab",
    previewPdf: "PDF preview in app",
    price: "Price",
    projectInformation: "Project information",
    projectName: "Project Name",
    projectNamePlaceholder: "Project name",
    projectNo: "Project No.",
    projectNoPlaceholder: "Project number",
    quality: "Quality",
    qualityPlaceholder: "e.g. 95 or 99.5",
    pricePlaceholder: "e.g. 1500000",
    actualPlaceholder: "e.g. 1285000.50",
    remove: "Delete",
    removeFailed: "Unable to delete file",
    save: "Save",
    saveFailed: "Unable to save",
    saveSummaryFailed: "Unable to save Summary Project",
    saved: "Saved",
    saving: "Saving...",
    selectDate: "Select date",
    shared: "Shared topic",
    sharedShort: "Shared",
    summaryProject: "Summary Project",
    summaryProjectOpenDrawer: "Open summary dialog (easy-read view)",
    summaryProjectEditFromDrawer: "Edit values",
    theme: "Theme",
    today: "Today",
    upload: "Upload files",
    uploadFailed: "Upload failed",
    uploading: "Uploading...",
    uploadHint: "PDF, Word, Excel, PowerPoint, CSV, TXT, images — multiple files allowed",
    uploadInvalid:
      "Only .pdf, .doc, .docx, .odt, .rtf, .xls, .xlsx, .ods, .csv, .ppt, .pptx, .odp, .txt and images are supported",
    uploadVideoTopicOnly: "Video uploads are only allowed in the video library panel, not in department topics",
    uploadInvalidVideo:
      "Only video files are supported here, e.g. .mp4, .webm, .mkv, .mov, .avi, .m4v, .ogg/.ogv — playback depends on browser and codecs",
    uploadVideoTooLarge: "Video file exceeds the 5 GB limit",
    confirmClear: "Confirm clear",
    confirmClearDescription:
      "This will delete project info and all uploaded files. Use this to start the next meeting.",
    confirmDeleteAll: "Confirm delete all",
    clearing: "Clearing...",
    fullScreenPreview: "Open / full screen",
    loadingPdf: "Loading PDF...",
    pdfLoadFailed: "Failed to load PDF",
    previousPage: "Previous page",
    nextPage: "Next page",
    currentPage: "Current page",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
    rotatePage: "Rotate page",
    moreActions: "More actions",
    pdfHandTool: "Hand — drag to pan",
    pdfCtrlWheelHint: "Ctrl + scroll wheel to zoom",
    presenterPointer: "Presenter pointer",
    previewImage: "Image preview",
    loadingImage: "Loading image...",
    imageLoadFailed: "Failed to load image",
    resetView: "Reset view",
    previewConverted: "Converted to PDF for in-app preview",
    convertingDocument: "Converting document to PDF...",
    convertingHint: "First conversion may take a moment. Results are cached for next time.",
    converterUnavailable: "LibreOffice not found on the server — install it or set LIBREOFFICE_PATH",
    converterFailed: "Failed to convert document to PDF",
    rename: "Rename",
    videoLibrary: "Videos",
    uploadVideo: "Upload video",
    noVideosYet: "No videos yet",
    backToVideoList: "Video list",
    newFileName: "Display name",
    renameFailed: "Could not rename",
    confirmDeleteVideo: "Delete this video?",
    confirmDeleteVideoDescription: "The file will be permanently removed from the video library.",
    confirmDeleteVideoAction: "Delete video",
    deletingVideo: "Deleting...",
    loadingVideo: "Loading video...",
    videoPlayError: "Could not play video",
    videoPlayer: "Video player",
    videoPlayAction: "Play",
    videoPause: "Pause",
    videoMute: "Mute",
    videoUnmute: "Unmute",
    videoVolume: "Volume",
    videoSeek: "Playback position",
    videoLoop: "Loop playback",
    videoPlaybackSpeed: "Playback speed",
    videoFullscreen: "Full screen",
    videoExitFullscreen: "Exit full screen",
    videoExpandPanel: "Expand panel to fill area (100% width & height)",
    videoShrinkPanel: "Shrink panel to floating window",
    toggleVideoPanel: "Toggle video library",
  },
} as const;

type TranslationKey = keyof (typeof translations)["en"];

type AppPreferencesContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  setTheme: (theme: AppTheme) => void;
  t: (key: TranslationKey) => string;
  theme: AppTheme;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

function isTheme(value: string | null): value is AppTheme {
  return value === "light" || value === "dark";
}

function isLanguage(value: string | null): value is AppLanguage {
  return value === "th" || value === "en";
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [language, setLanguageState] = useState<AppLanguage>("th");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ceremony-theme");
    const storedLanguage = window.localStorage.getItem("ceremony-language");

    queueMicrotask(() => {
      if (isTheme(storedTheme)) setThemeState(storedTheme);
      if (isLanguage(storedLanguage)) setLanguageState(storedLanguage);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [language, theme]);

  const value = useMemo<AppPreferencesContextValue>(() => {
    const setTheme = (nextTheme: AppTheme) => {
      window.localStorage.setItem("ceremony-theme", nextTheme);
      setThemeState(nextTheme);
    };

    const setLanguage = (nextLanguage: AppLanguage) => {
      window.localStorage.setItem("ceremony-language", nextLanguage);
      setLanguageState(nextLanguage);
    };

    return {
      language,
      setLanguage,
      setTheme,
      t: (key) => translations[language][key],
      theme,
    };
  }, [language, theme]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return context;
}

export function PreferenceControls() {
  const { language, setLanguage, setTheme, t, theme } = useAppPreferences();
  const isDark = theme === "dark";
  const isEnglish = language === "en";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <LanguageToggle
        checked={isEnglish}
        onCheckedChange={(checked) => setLanguage(checked ? "en" : "th")}
        aria-label={`${t("language")}: ${language.toUpperCase()}`}
      />
      <ThemeToggle
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={`${t("theme")}: ${isDark ? t("dark") : t("light")}`}
      />
    </div>
  );
}
