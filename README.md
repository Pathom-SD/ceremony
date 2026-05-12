# AIT – Ceremony Activity

เว็บแอปสำหรับห้องประชุม Ceremony: แสดงหัวข้อตามแผนก อัปโหลด PDF / PPTX / XLSX และอัปเดตรายการไฟล์แบบเรียลไทม์ผ่าน WebSocket (Socket.IO)

## ความต้องการของระบบ

- Node.js LTS
- รันบนเครื่องหนึ่งเป็น “เซิร์ฟเวอร์” แล้วให้เครื่องอื่นใน LAN เข้าที่ `http://<IP-เครื่องเซิร์ฟเวอร์>:3000`

## คำสั่ง

```bash
npm install
npm run dev      # พัฒนา — ใช้ server.mjs (Next + Socket.IO)
npm run build
npm run start    # production — bind 0.0.0.0 ตามค่าเริ่มต้น
```

### พอร์ตและการฟังบน LAN

- ค่าเริ่มต้น: พอร์ต `3000`, bind `0.0.0.0` (ตั้ง `PORT` / `LISTEN_HOST` ได้)
- บน Windows เปิด Windows Defender Firewall ให้ inbound TCP ตามพอร์ตที่ใช้

ตัวอย่าง PowerShell (โฟลเดอร์โปรเจกต์):

```powershell
$env:PORT = "3000"
$env:LISTEN_HOST = "0.0.0.0"
npm run start
```

จากนั้นเปิดบนเครื่องอื่น: `http://<IPv4-ของเครื่องห้องประชุม>:3000`

## การเก็บข้อมูล

- `storage/session.json` — ข้อมูลการประชุม (Project Name, No., Customer, Ceremony Date)
- `storage/file-index.json` — ดัชนีไฟล์ที่อัปโหลด
- `storage/uploads/<topicId>/` — ไบนารีไฟล์จริง

โฟลเดอร์ `storage/uploads` ถูก ignore โดย git (ยกเว้น `.gitkeep`)

## ปุ่มเคลียร์ข้อมูลทั้งหมด

ลบ session + ดัชนีไฟล์ + ไฟล์ใน `storage/uploads` แล้ว broadcast ไปยัง client ทั้งหมด

ถ้าตั้งค่า environment variable `CEREMONY_CLEAR_SECRET` บนเซิร์ฟเวอร์ จะต้องใส่ค่าเดียวกันในช่อง “รหัสลับ” ในขั้นตอนยืนยันครั้งสุดท้าย และส่งเป็น header `x-ceremony-clear-secret`

## ข้อจำกัดการ preview

- **PDF**: แสดงตัวอย่างเต็มจอในแอปได้ (iframe ไปที่ API ส่ง `Content-Disposition: inline`)
- **PPTX / XLSX**: เบราว์เซอร์ไม่รองรับ preview แบบเดียวกับ PDF ในแอป — ใช้ปุ่ม “เปิดในแท็บใหม่” / “เปิดไฟล์” เพื่อเปิดด้วยโปรแกรมบนเครื่อง

## เทคโนโลยี

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Socket.IO — custom entry `server.mjs` รวม HTTP server กับ Next request handler
