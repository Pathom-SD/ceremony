/** ไม่ import โมดูลอื่น — ใช้จาก next.config.ts ได้ */
const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

export const CEREMONY_VIDEOS_TOPIC_ID = "ceremony-videos";

/** ขีดอัปโหลดวิดีโอในห้องสมุด ceremony-videos */
export const MAX_CEREMONY_VIDEO_UPLOAD_BYTES = 5 * GiB;

/** ขีดอัปโหลดไฟล์เอกสาร/รูปในหัวข้อแผนก */
export const MAX_TOPIC_FILE_UPLOAD_BYTES = 100 * MiB;

/** ค่าเดียวกับ `experimental.proxyClientMaxBodySize` ใน next.config (ค่าเริ่มต้น Next คือ 10MB) */
export const NEXT_PROXY_MAX_BODY_SIZE = "5gb" as const;

export const NEXT_PROXY_MAX_BODY_BYTES = MAX_CEREMONY_VIDEO_UPLOAD_BYTES;
