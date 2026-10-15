# LINE Number Manager — สเปก (ขั้นที่ 3)

## ข้อเท็จจริงที่ต้องยึด (จากการวิเคราะห์ขั้นที่ 1)
- LINE **ไม่มี** API/ช่องทางที่ได้รับอนุญาตสำหรับตรวจสถานะการยืนยันเบอร์ หรือจำนวนวันที่ต้องรอ และตรวจหลายเบอร์ไม่ได้
  - หลักฐาน: https://developers.line.biz/en/reference/messaging-api/ , https://help.line.me/line/smartphone/?contentId=20000104&lang=en (ข้อความ "Please wait XX day(s)" แสดงเฉพาะในแอป, "these restrictions cannot be lifted"), https://help.line.me/line/?contentId=20000372 ("cannot provide details such as how long the restrictions will last"), https://help.line.me/line/?contentId=20001192&lang=en (สมัครด้วยเบอร์ที่มีบัญชีอยู่ → บัญชีเดิมถูกลบ), https://terms.line.me/line_terms?lang=en ข้อ 15 (ห้าม BOT/technical means, reverse engineering, เก็บข้อมูลบุคคลที่สามโดยมิชอบ)
  - LINE notification messages (PNP) เป็น API ส่งข้อความ ไม่ใช่ API ตรวจสอบ, ต้องเป็นนิติบุคคลที่ได้รับอนุมัติ, ห้ามใช้เชิงพาณิชย์, ส่งได้ครั้งละ 1 เบอร์
- ดังนั้นเว็บนี้ **ห้าม** เรียกบริการภายนอกเพื่อตรวจเบอร์, ห้ามสร้างผลตรวจหรือจำนวนวันขึ้นเอง, ห้ามมีค่าตั้งต้นจำนวนวันรอ (เช่น 7 วัน) — จำนวนวันต้องมาจากผู้ใช้กรอก หรือจาก OCR ข้อความในภาพที่ผู้ใช้อัปโหลดแล้วผู้ใช้ยืนยัน
- คอลัมน์ "ตรวจอัตโนมัติ" ของทุกรายการแสดงค่าคงที่: `ไม่สามารถตรวจสอบได้ — LINE ไม่มีช่องทางที่ได้รับอนุญาต` (มีลิงก์ไปแท็บ "ข้อจำกัด")

## รูปแบบไฟล์
- `index.html` ไฟล์เดียว: CSS + `<script id="core">` (ฟังก์ชันบริสุทธิ์ ไม่แตะ DOM, export ทั้ง `window.LineCore` และ `module.exports` ถ้ามี) + `<script id="app">` (UI)
- ไลบรารีภายนอกตัวเดียว: Tesseract.js `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js` โหลดแบบ lazy ตอนใช้ OCR ครั้งแรก ภาษา `tha+eng`
- `tests/test-core.js` — node ไม่มี dependency: ดึงข้อความใน `<script id="core">` จาก index.html แล้วรันด้วย `vm` + assert. รัน `node tests/test-core.js`
- `README.md` (ไทย): วิธีเปิดใช้, ฟังก์ชัน, ข้อจำกัด, แนวทางพัฒนาต่อ
- `AGENTS.md`: กฎโปรเจกต์ (ข้อห้ามด้านบน, ห้าม window.confirm/alert/prompt — ใช้ dialog ในหน้าเอง, ห้าม commit `.local-test/`)
- `.gitignore`: `.local-test/`, `node_modules/`
- UI ภาษาไทยทั้งหมด

## ข้อมูล (localStorage key `lnm.v1`)
```
{ version: 1, settings: { soonDays: 3 }, records: [Record] }
Record = {
  id: string,
  phone: string,            // ตัวเลขล้วน เก็บเป็น string เสมอ รักษา 0 ด้านหน้า
  note: string,             // ชื่อ/หมายเหตุ
  status: 'unrecorded' | 'verified' | 'waiting' | 'failed',
      // ยังไม่บันทึกผล | ยืนยันสำเร็จ | ต้องรอ | ยืนยันไม่สำเร็จ/ข้อผิดพลาด
  message: string,          // ข้อความตอบกลับที่ผู้ใช้เห็นในแอป LINE (คัดลอก/OCR)
  error: string,            // สาเหตุ/ข้อผิดพลาด
  waitDays: number|null,    // จำนวนวันรอ — มีค่าก็ต่อเมื่อผู้ใช้กรอก/ยืนยันจาก OCR
  waitStart: 'YYYY-MM-DD'|null,  // วันที่เห็นข้อความ
  recheckDate: 'YYYY-MM-DD'|null,// = waitStart + waitDays (คำนวณ), ผู้ใช้แก้ทับได้
  source: 'manual' | 'ocr' | 'import',  // ที่มาของผลล่าสุด: ผู้ใช้กรอก | อ่านจากภาพที่ผู้ใช้ยืนยัน | นำเข้า CSV
  checkedAt: ISO datetime|null,  // เวลาที่ผู้ใช้บันทึกผลตรวจ
  createdAt, updatedAt: ISO datetime
}
```
- localStorage ทุกจุดอยู่ใน try/catch; ถ้าใช้ไม่ได้ให้แสดงแถบเตือน "ข้อมูลจะหายเมื่อปิดหน้า — ส่งออก CSV ไว้"
- ไม่เก็บรูปภาพ ไม่มีช่องรหัสผ่าน/OTP

## ฟังก์ชัน core (ต้องมีเทสต์ครบ)
- `thaiDigitsToArabic(s)` ๐-๙ → 0-9
- `normalizePhone(raw)` → `{ok:true, phone, warning?}` | `{ok:false, error}`
  - ลบช่องว่าง - . ( ) / และ `'` นำหน้า, `="..."` ของ Excel
  - `+66` / `66` + 9 หลัก → `0` + 9 หลัก
  - ผ่าน: 10 หลักขึ้นต้น 06/08/09 (มือถือ), 9 หลักขึ้นต้น 02–07 (บ้าน)
  - 9 หลักขึ้นต้น 6/8/9 → เติม 0 พร้อม warning "เติมเลข 0 ด้านหน้าที่หายไป"
  - อื่น ๆ → error ภาษาไทยบอกเหตุผล
- `parsePhoneList(text)` แยกตามบรรทัด/คอมมา/เซมิโคลอน/แท็บ → รายการ `{raw, ok, phone|error, warning}`
- `classifyIncoming(items, existingPhones)` → แต่ละรายการได้ `kind: 'new'|'dup-existing'|'dup-input'|'invalid'`
- `parseCSV(text)` RFC4180 (quote, "" escape, newline ในช่อง, CRLF, BOM) → array of arrays
- `toCSV(rows)` quote เมื่อจำเป็น
- `recordsToCSV(records)` — ใส่ BOM, หัวคอลัมน์ไทยคงที่, คอลัมน์เบอร์เขียนเป็น `="0812345678"` เพื่อให้ Excel คง 0; มีคอลัมน์ที่มา และคอลัมน์ "ตรวจอัตโนมัติ" ค่าคงที่
- `csvToRecords(text)` → `{rows:[partial record], issues:[]}` รู้จักหัวคอลัมน์ของตัวเอง + ชื่อทั่วไป (phone, เบอร์, เบอร์โทร, tel, mobile); ไม่มีหัว → คอลัมน์แรกคือเบอร์. round-trip export→import ต้องได้ข้อมูลเดิมครบ (phone, note, status, message, error, waitDays, waitStart, recheckDate, source, checkedAt)
- `addDays(isoDate, n)`, `todayISO(date?)` ใช้วันที่ท้องถิ่น ไม่ใช่ UTC
- `computeRecheckDate(waitStart, waitDays)` → null ถ้าข้อมูลไม่ครบ
- `dueState(record, today, soonDays)` → `'overdue'|'today'|'soon'|'later'|'none'`
- `extractFromOcrText(text)` → `{ phones:[{raw, phone, ok, warning}], waitDays: number|null, waitMatch: string|null }`
  - หาเบอร์ที่มีช่องว่าง/ขีดคั่น, +66, เลขไทย
  - วันรอ: `รอ\s*(\d+)\s*วัน`, `(\d+)\s*วัน`, `wait\s*(\d+)\s*day`, `(\d+)\s*day\(s\)` — ถ้าเจอหลายค่าไม่ตรงกัน → waitDays null + ระบุว่ากำกวม
- `filterRecords(records, {q, status, source, due, today, soonDays})`
- `mergeRecords(existing, incoming, mode)` mode `'skip'|'overwrite'` สำหรับนำเข้า

## UI (แท็บ)
1. **รายการเบอร์** — สรุปตัวเลข (ทั้งหมด/ต้องรอ/ถึงกำหนด/ใกล้ถึง), กล่อง "ถึงกำหนดตรวจซ้ำ / ใกล้ถึงกำหนด", ค้นหา + กรองสถานะ/ที่มา/กำหนด + เรียง, ตาราง (มือถือ <640px เป็นการ์ด), เลือกหลายรายการ → ลบ/เปลี่ยนสถานะ, แก้ไข/ลบรายแถว, ปุ่ม "บันทึกผลตรวจ" ต่อแถว (ฟอร์ม: สถานะ, ข้อความตอบกลับ, จำนวนวันรอ, วันที่เห็นข้อความ, วันนัดตรวจซ้ำที่คำนวณ/แก้ได้, ข้อผิดพลาด)
   - ป้ายที่มาชัดเจน: "ผู้ใช้กรอก" / "อ่านจากภาพ (ผู้ใช้ยืนยัน)" / "นำเข้า CSV"
2. **เพิ่มเบอร์** — textarea วางหลายเบอร์ + ไฟล์ CSV → ตารางพรีวิว (ใหม่/ซ้ำ/ไม่ถูกต้อง/เติม 0) → ปุ่มยืนยันเพิ่ม; CSV มีตัวเลือกข้าม/เขียนทับเบอร์ที่มีอยู่
3. **อ่านจากภาพ (OCR)** — อัปโหลด/ลากวาง/วางจากคลิปบอร์ด หลายภาพ, แสดงภาพคู่กับข้อความที่อ่านได้, ความเชื่อมั่นเฉลี่ย; < 70 หรือมีตัวเลขความเชื่อมั่นต่ำ → แจ้ง "อ่านไม่ชัด โปรดตรวจ"; ตารางพรีวิวเบอร์ที่พบ (แก้ได้, เลือกได้) + จำนวนวันรอที่พบ (แก้ได้, ว่างได้) + ข้อความ → บันทึก (source 'ocr'). คำเตือน: "ไม่ใช่การตรวจสถานะอัตโนมัติ อ่านเฉพาะข้อความในภาพของคุณ" และ "อย่าอัปโหลดภาพที่มีรหัส OTP"
4. **ส่งออก** — CSV ทั้งหมด / ตามตัวกรองปัจจุบัน / เฉพาะที่ต้องตรวจซ้ำ (overdue+today+soon) / เฉพาะสถานะต้องรอ; ชื่อไฟล์มีวันที่
5. **ข้อจำกัด** — สรุปผลวิเคราะห์ 5 ข้อพร้อมลิงก์หลักฐาน, เหตุผลที่ตรวจอัตโนมัติไม่ได้, ล้างข้อมูลทั้งหมด (ยืนยันผ่าน dialog ในหน้า)

## เกณฑ์คุณภาพ
- ทุกปุ่มต้องทำงาน; ไม่มีปุ่มหลอก
- รองรับมือถือ (ไม่มี horizontal scroll ทั้งหน้า ที่ 360px), โหมดมืด
- ทุก dialog เป็น in-page (`<dialog>` หรือ div) — ห้าม window.confirm/alert/prompt
- escape HTML ทุกข้อความที่มาจากผู้ใช้/OCR/CSV (กัน XSS)
