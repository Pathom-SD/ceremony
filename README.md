# AIT – Ceremony Activity

เว็บแอปสำหรับห้องประชุม Ceremony: แสดงหัวข้อตามแผนก อัปโหลดเอกสาร/รูปภาพ และอัปเดตรายการไฟล์แบบเรียลไทม์ผ่าน WebSocket (Socket.IO) รองรับ preview ในแอปทั้ง PDF, เอกสาร Office (แปลงเป็น PDF อัตโนมัติ) และรูปภาพ

## ความต้องการของระบบ

- Node.js LTS
- รันบนเครื่องหนึ่งเป็น “เซิร์ฟเวอร์” แล้วให้เครื่องอื่นใน LAN เข้าที่ `http://<IP-เครื่องเซิร์ฟเวอร์>:3000`
- **การแปลงเอกสารเป็น PDF** (สำหรับ preview Word/Excel/PowerPoint/CSV/TXT ฯลฯ) ใช้ได้สองแบบ (ถ้าไม่ตั้งอะไรเลย จะพยายามหา `soffice` บนเครื่องที่รันแอป):
  1. **Gotenberg (แนะนำเมื่อรัน Docker)** — ตั้ง env **`GOTENBERG_URL`** เป็น URL ฐานของบริการ Gotenberg (ไม่มี trailing slash) แอปจะเรียก `POST /forms/libreoffice/convert` แทนการ spawn `soffice`  
  2. **LibreOffice บนเครื่องเดียวกับแอป** — ตั้ง **`LIBREOFFICE_PATH`** ชี้ไปที่ไฟล์ `soffice` / `soffice.exe` หรือปล่อยว่างให้ระบบหาค่าเริ่มต้น (Windows/macOS/Linux ตาม README เดิม)

**หมายเหตุ:** คอนเทนเนอร์ **`linuxserver/libreoffice`** ที่เปิดผ่านพอร์ตเช่น `3333` เป็น **เว็บสำหรับใช้ LibreOffice แบบ remote desktop** ไม่ใช่ API แปลงไฟล์ — แอป Ceremony **ไม่สามารถชี้ `LIBREOFFICE_PATH` หรือพอร์ตนั้นให้แปลงอัตโนมัติได้** ถ้าต้องการ preview Office ใน Ceremony ขณะใช้ Docker ให้ใช้ **Gotenberg** (service `gotenberg` ใน `docker-compose.yml` หรือรัน `gotenberg/gotenberg:8` แยกแล้วตั้ง `GOTENBERG_URL`)

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

## รันด้วย Docker

รูป production ใช้ Node 22 (Alpine) ร่วมกับ `server.mjs` เหมือน `npm run start` โดยมี entrypoint สร้างโฟลเดอร์ `storage` และตั้งสิทธิ์ให้ user ที่รันแอป (ให้อัปโหลดและบันทึกไฟล์ได้เมื่อใช้ volume)

จากโฟลเดอร์โปรเจกต์:

```bash
docker compose up --build -d
```

เปิด `http://localhost:3000` (หรือ `http://<IP-เครื่อง>:3000` จากเครื่องอื่นใน LAN)

- **Volume**: `docker-compose.yml` แมป volume ชื่อ `ceremony-storage` ไปที่ `/app/storage` เพื่อให้ session, ดัชนีไฟล์ และไฟล์อัปโหลดคงอยู่หลังรีสตาร์ทคอนเทนเนอร์
- **Gotenberg**: มี service `gotenberg` (รูป `gotenberg/gotenberg:8`) และตั้ง **`GOTENBERG_URL=http://gotenberg:3000`** ให้ `ceremony` แปลง Office→PDF อัตโนมัติ (อยู่ network เดียวกัน ไม่จำเป็นต้อง publish พอร์ต Gotenberg ออก host)
- **พอร์ต / bind**: ค่าเริ่มต้นคือ `PORT=3000`, `LISTEN_HOST=0.0.0.0` (ปรับใน `environment` ของ compose ได้)
- **ตัวแปรสภาพแวดล้อมอื่นๆ**: ถ้าไม่ใช้ Gotenberg ให้ลบ `GOTENBERG_URL` ออกจาก compose แล้วตั้ง `LIBREOFFICE_PATH` บน image/เครื่องที่รัน `ceremony` (ต้องมี binary `soffice` จริงใน container/host)
- **Reverse proxy**: ถ้าวางหลัง Nginx/Caddy/Traefik ต้องเปิด WebSocket และ proxy path `/socket.io/` ให้ถึงแอป ไม่งั้นรายการไฟล์อาจไม่อัปเดตแบบเรียลไทม์
- **อัปโหลดวิดีโอใหญ่ (>1 GB)**: ไฟล์ชั่วคราวต้องอยู่ volume เดียวกับ `storage/uploads` (`storage/uploads/.tmp`) — อย่าใช้ `/tmp` ของคอนเทนเนอร์ เพราะ `rename` ข้าม device จะ fallback เป็น `copyFile` ช้ามากและอาจ timeout
- **Cloudflare**: proxy มาตรฐานจำกัด body ต่อ request ~**100 MB** (413 จาก Cloudflare) — แอปแยกไฟล์ >90 MB เป็นหลาย chunk 50 MB ไปที่ `POST /api/topics/.../files/chunks` อัตโนมัติ; ถ้ามี Nginx/Traefik หน้าแอป (ไม่ใช่ Cloudflare) ตั้ง `client_max_body_size` อย่างน้อย **5g** สำหรับอัปโหลดแบบไม่แยก chunk

รันแบบ build image เอง (ไม่ผ่าน compose):

```bash
docker build -t ceremony .
docker run --rm -p 3000:3000 \
  -e GOTENBERG_URL=http://host.docker.internal:3000 \
  ceremony
```

(ตัวอย่างนี้สมมติว่า Gotenberg ฟังบนพอร์ต 3000 ที่ host — ปรับ URL ให้ตรงกับที่รันจริง; บน Linux อาจใช้ IP ของ host แทน `host.docker.internal`)

## การเก็บข้อมูล

- `storage/session.json` — ข้อมูลการประชุม (Project Name, No., Customer, Ceremony Date)
- `storage/file-index.json` — ดัชนีไฟล์ที่อัปโหลด
- `storage/uploads/<topicId>/` — ไบนารีไฟล์จริง
- `storage/cache/pdf/<fileId>.pdf` — PDF ที่แปลงจากเอกสาร Office (cache อัตโนมัติ)

โฟลเดอร์ `storage/uploads` และ `storage/cache` ถูก ignore โดย git

เมื่อใช้ Docker Compose ข้อมูลใน `storage` จะอยู่ภายใต้ `/app/storage` ในคอนเทนเนอร์ และถูกเก็บผ่าน volume `ceremony-storage` (ไม่หายเมื่อลบคอนเทนเนอร์ ถ้าไม่ลบ volume)

## ปุ่มเคลียร์ข้อมูลทั้งหมด

ลบ session + ดัชนีไฟล์ + ไฟล์ใน `storage/uploads` แล้ว broadcast ไปยัง client ทั้งหมด (ยืนยันครั้งเดียวใน UI)

## รูปแบบไฟล์ที่รองรับ

| ประเภท | นามสกุล |
|--------|---------|
| PDF | `.pdf` |
| เอกสาร Word | `.doc`, `.docx`, `.odt`, `.rtf` |
| สเปรดชีต | `.xls`, `.xlsx`, `.ods`, `.csv` |
| งานนำเสนอ | `.ppt`, `.pptx`, `.odp` |
| ข้อความ | `.txt` |
| รูปภาพ | `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` |

## การ preview

- **PDF / เอกสาร Office / TXT / CSV**: ใช้ viewer ของแอป (pdf.js) — มีซูม, หมุนทีละหน้า, pan, presenter pointer
  - ไฟล์ที่ไม่ใช่ PDF จะถูกแปลงเป็น PDF ครั้งแรกแล้วเก็บ cache ไว้ — ผ่าน **Gotenberg** ถ้ามี `GOTENBERG_URL` หรือผ่าน **soffice ในเครื่อง** ถ้าไม่มี
  - ถ้าไม่มีตัวแปลงที่ใช้งานได้หรือแปลงไม่สำเร็จ ระบบจะแสดงข้อความบอกใน viewer
- **รูปภาพ**: viewer แสดงตัวอย่างได้ทั้ง zoom, pan, rotate

## เทคโนโลยี

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Socket.IO — custom entry `server.mjs` รวม HTTP server กับ Next request handler
