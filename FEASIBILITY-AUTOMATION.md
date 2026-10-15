# ความเป็นไปได้ในการตรวจสถานะเบอร์ LINE แบบอัตโนมัติ

วันที่ตรวจ: 2026-10-15
ผลโดยสรุป: **ยังไม่สามารถตรวจสอบอัตโนมัติได้**. วิธีที่ใช้ได้และไม่ผิดกฎคือให้เจ้าของเบอร์แคปหน้าจอเอง แล้วให้แอปอ่านด้วย OCR (แอปทำแบบนี้อยู่แล้ว)

---

## 1. ขอบเขตและวิธีการ

**สิ่งที่ทำ**
- อ่านเฉพาะเอกสารสาธารณะ ได้แก่ LINE Help Center, LINE Terms of Use, นโยบายความเป็นส่วนตัวของ LY Corporation, LINE Developers Agreement, เอกสาร Android/Google Play, MDN, caniuse, Chrome Developers และเอกสาร Tesseract
- เปิด URL หลักซ้ำอีกรอบ (2026-10-15) เพื่อหาข้อโต้แย้ง หลักฐานที่ยืนยันซ้ำไม่ได้ถูกลดระดับหรือตัดออก (ดูหัวข้อท้ายเอกสาร)

**สิ่งที่ไม่ได้ทำ และเหตุผล**
- **ไม่ได้ทดลองกรอกเบอร์โทรเข้า LINE** ไม่ว่าจะผ่านแอป เว็บ หรือ flow ยืนยันตัวตน เพราะ
  - LINE Terms of Use บทที่ 1 ข้อ 15(5) ห้าม "wrongfully operating the Services by using BOT, cheat tools or other technical means" และห้าม "making unreasonable inquiries or requests to us, such as by repeatedly asking the same question"
  - ข้อ 15(8) ห้ามเก็บข้อมูลของบุคคลอื่นโดยมิชอบ ข้อ 15(12) และ 15(14) ห้ามใช้หรือได้มาซึ่งบัญชีของผู้อื่น และข้อ 15(16) ห้ามช่วยเหลือหรือเตรียมการทำสิ่งเหล่านี้
  - LINE Help 20001192 ระบุว่า "If you register a phone number that is already registered to another LINE account, the original LINE account associated with that phone number will be deleted." การทดลองจึงอาจทำให้บัญชีของเจ้าของเบอร์ถูกลบจริง
  - LINE Help 20000104 ระบุว่าความพยายามยืนยันเบอร์ที่เกินจำนวนครั้งเป็นสาเหตุของการถูกจำกัดเอง การทดลองจึงทำให้สถานะที่เราต้องการวัดเปลี่ยนไป
- ไม่ได้ล็อกอินเข้าแบบฟอร์มขอข้อมูลส่วนบุคคล (contact-cc.line.me/detailId/14179) เพราะหน้านั้นพาไปหน้า LINE Login
- ไม่ได้ใช้ endpoint ภายใน ไม่ได้ทำ reverse engineering และไม่ได้ใช้เทคนิคหลบเลี่ยงใด ๆ

---

## 2. "อ่านข้อความที่มีอยู่แล้ว" กับ "ส่งคำขอตรวจเบอร์ใหม่"

| แนวทาง | ผล | หลักฐาน |
|---|---|---|
| **(ก) อ่านข้อความที่แสดงบนจอของเจ้าของเบอร์อยู่แล้ว** (เช่น "Please wait XX day(s) then try again") ผ่านการแคปหน้าจอแล้ว OCR | **ทำได้ และไม่พบข้อห้ามโดยตรง** โดยมีเงื่อนไขว่าเจ้าของเบอร์เป็นคนแคปและส่งให้เอง | ไม่พบข้อใดใน Terms ที่ห้ามแคปหน้าจอหรือ OCR หน้าจอของตัวเอง (ไม่พบหลักฐานว่าห้าม) ความเสี่ยงจะเกิดก็ต่อเมื่อเป็นการเก็บข้อมูลบุคคลอื่นโดยมิชอบตามข้อ 15(8) |
| **(ข) ระบบส่งเบอร์เข้า flow ยืนยันของ LINE เอง** เพื่อดูว่าติดข้อจำกัดหรือไม่ และกี่วัน | **ทำไม่ได้: ขัด Terms โดยตรงและอาจสร้างความเสียหาย** | ข้อ 15(5) (BOT/วิธีทางเทคนิค, ส่งคำขอซ้ำ ๆ), 15(8), 4.1, 4.4, 15(12), 15(14), 15(16), บทที่ 2 ข้อ 3(5)/(6) และ Help 20001192 (บัญชีเดิมถูกลบ) |

ข้อความใน Terms ที่ยืนยันซ้ำแล้ว (https://terms.line.me/line_terms?lang=en):
- 15(5): "act of wrongfully operating the Services by using BOT, cheat tools or other technical means" และ "act of making unreasonable inquiries or requests to us, such as by repeatedly asking the same question" (ทั้งสองวลีอยู่ในข้อ (5) ซึ่งเนื้อหาหลักคือการขัดขวางเซิร์ฟเวอร์และบริการ)
- 15(8): "act of wrongfully collecting, accumulating, disclosing or providing information related to third parties"
- 15(12): "act of Using the Services by using another User's account;"
- 15(14): "act of acquiring accounts or passwords from others or disclosing or providing accounts or passwords to others"
- 15(16): "act of assisting or facilitating any act corresponding to each of the preceding items, or act of preparing the same;"
- 4.1: "When registering an account, you are obligated to (1) register true and accurate information"
- 4.4: "An account is for exclusive use and belongs solely to the User of such account."
- บทที่ 2 ข้อ 3(6): "using the software in a manner that is not within the purpose for which the software is provided"

หมายเหตุ: Terms ไม่มีข้อที่พูดถึง "การใช้เบอร์ที่ไม่ใช่ของตัวเอง" ตรง ๆ ข้อ 4.1, 4.4, 15(12) และ 15(14) เป็นข้อที่ใกล้เคียงที่สุด

---

## 3. ช่องทางที่ได้รับอนุญาตที่ตรวจแล้ว

### 3.1 ฝ่ายช่วยเหลือของ LINE (Help / Contact)
**ผล: ไม่ใช่ช่องทางที่จะได้สถานะหรือจำนวนวันที่เหลือ**
- https://help.line.me/line/smartphone/?contentId=20000104&lang=en
  - "Try again after the displayed number of days as these restrictions cannot be lifted."
  - "Even if you contact us, we cannot send you a verification code directly for security reasons."
- https://help.line.me/line/smartphone/?contentId=50001359&lang=en
  - ถ้าติดต่อก่อนพ้นข้อจำกัด "we will reply to you with the same information in this Help article."
  - "we cannot directly provide you with detailed information" (ด้วยเหตุผลด้านความปลอดภัย)

### 3.2 สิทธิขอเข้าถึงข้อมูลส่วนบุคคล (Privacy / PDPA)
**ผล: มีช่องทางจริง แต่ใช้ได้เฉพาะเจ้าของข้อมูลที่ยืนยันตัวตนแล้ว ทีละคำขอ และไม่มีหลักฐานว่าจะได้ข้อมูลสถานะการยืนยันเบอร์**
- https://www.lycorp.co.jp/en/company/privacypolicy/
  - ให้ยื่นผ่าน "Personal Data Disclosure Procedure"
  - "After verification of your identity, we will respond to your request within a reasonable period of time"
  - ข้อยกเว้นที่อาจปฏิเสธได้ เช่น "disclosure is likely to seriously impede the proper execution of our business" และกรณีที่ยืนยันตัวตนไม่ผ่าน
  - อาจเก็บค่าธรรมเนียม: "we may charge a fee, in accordance with the procedures defined separately"
  - ตัวแทนในประเทศไทย: Tilleke & Gibbins Digital Solutions Co., Ltd. (Attn: LY Corporation), โทร +662-056-5566, digital@tilleke.com
  - นโยบายไม่ได้กล่าวถึงข้อมูลสถานะการยืนยันเบอร์หรือข้อจำกัดเลย (ไม่พบหลักฐานทั้งสองทาง) ที่บอกว่า LINE อาจปฏิเสธโดยอ้างความปลอดภัยหรือผลกระทบต่อธุรกิจเป็นเพียง**การอนุมาน**
- https://contact-cc.line.me/detailId/14179 ตอบกลับเป็น 302 ไปยัง access.line.me/oauth2/v2.1/authorize (scope=openid profile email phone) แปลว่าคำขอผูกกับตัวตนของเจ้าของบัญชี ส่วนเนื้อหาแบบฟอร์มยังไม่ได้ตรวจเพราะไม่ได้ล็อกอิน

### 3.3 โปรแกรมพาร์ทเนอร์ / LINE Biz
**ผล: ไม่พบหลักฐาน (ยืนยันซ้ำไม่ได้)**
- https://www.linebiz.com/jp/partner-offer/ ถูก redirect ไป https://www.lycbiz.com/jp/partner-offer/ ซึ่งตอบ 403 รอบตรวจซ้ำจึงอ่านเนื้อหาไม่ได้ จากการค้นรอบแรกไม่พบว่าพาร์ทเนอร์มีสิทธิ์ดูสถานะการยืนยันเบอร์หรือข้อจำกัดบัญชี ข้อนี้จึงถือเป็น "ไม่พบหลักฐาน" ระดับความมั่นใจต่ำ
- LINE Developers Agreement (https://terms2.line.me/LINE_Developers_Agreement?lang=en) จำกัดการใช้ Platform ไว้เฉพาะ "purpose ... expressly permitted" ห้ามหลบเลี่ยงข้อจำกัด (4.6) และกำหนดให้ "retrieve data only with the user's explicit consent" (8.2) ไม่พบ API สาธารณะที่ให้ตรวจสถานะเบอร์ (ไม่พบหลักฐาน)

**สรุปข้อ 3:** ทุกช่องทางทางการใช้ได้ทีละคำขอโดยเจ้าของบัญชีที่ยืนยันตัวตนแล้ว ไม่มีช่องทางใดเหมาะกับเว็บแอปที่ต้องตรวจหลายเบอร์

---

## 4. Browser/UI automation

**ผล: ไม่ได้พิสูจน์ว่าทำได้ และไม่ได้ทดลอง**

สิ่งที่พิสูจน์ได้จากเอกสาร:
- การยืนยันเบอร์ทำได้เฉพาะในแอปบนเครื่องหลัก: "You can only use this feature on your main device (typically your smartphone)." (Help 20000104)
- "You cannot create a new LINE account from LINE for PC." (https://help.line.me/line/chrome/pc?lang=en&contentId=50001182)
- การสมัครด้วยเบอร์ยังเปิดให้เฉพาะ "Users that live in Hong Kong, Japan, Korea, Taiwan, or Thailand" ประเทศอื่นหยุดตั้งแต่เวอร์ชัน 13.11.0 (Help 20001192)
- ไม่พบหน้าเว็บสาธารณะของ LINE ที่ใช้ยืนยันเบอร์ได้ (ไม่พบหลักฐานว่ามี) จึงไม่มีหน้าเว็บให้ทำ browser automation ตั้งแต่แรก
- การควบคุม UI ของแอป LINE อัตโนมัติเพื่อส่งเบอร์เข้าไปตรวจ เข้าข่าย Terms 15(5) และบทที่ 2 ข้อ 3(6)

สิ่งที่ยังไม่รู้:
- ไม่รู้ว่า LINE มีระบบตรวจจับ automation แบบใด และไม่ได้ตรวจสอบ เพราะอยู่นอกขอบเขตและผิดกฎ

---

## 5. การอ่านจากหน้าจอ (screenshot / OCR)

**ผล: เป็นวิธีเดียวที่ทำได้จริงและถูกต้อง และแอปทำแบบนี้อยู่แล้ว** โดยมีหลักว่าเจ้าของเบอร์แคปหน้าจอของตัวเอง แล้วส่งภาพเข้าเว็บแอปเอง ไม่มีขั้นตอนใดที่ควบคุม LINE อัตโนมัติ

ข้อเท็จจริงที่ยืนยันซ้ำแล้ว:
- **Tesseract มีโมเดลภาษาไทย**: ตารางภาษามีแถว "tha Thai x x x x x x" (https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html)
- **Tesseract.js** ทำ OCR ในเบราว์เซอร์ได้ แต่ "does not modify the Tesseract recognition model to improve accuracy" (https://github.com/naptha/tesseract.js) ความแม่นยำจึงขึ้นกับเอนจิน Tesseract
- **เคล็ดลับเพิ่มความแม่นยำ**: "Tesseract works best on images which have a DPI of at least 300 dpi" ควรครอปเฉพาะบริเวณข้อความ เลือก PSM ให้เหมาะ และจำกัดตัวอักษรเป็นตัวเลขเมื่ออ่านจำนวนวัน (https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)
- **Android: แชร์ภาพเข้า PWA** ได้ผ่าน Web Share Target แต่ "your web app has to be installed before it will show up as a potential target" และ manifest ต้องใช้ POST กับ multipart/form-data (https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
- **iOS Live Text** ใช้คัดลอกข้อความจากภาพได้ ต้องใช้ iPhone XS/XR ขึ้นไปและ iOS 15 ขึ้นไป (https://support.apple.com/120004) ยังไม่ได้ตรวจว่ารองรับภาษาไทยหรือไม่

วิธีที่ไม่เหมาะ:
- **getDisplayMedia (แคปจอจากเบราว์เซอร์)**: caniuse ระบุว่า Chrome for Android, Safari on iOS และ Firefox for Android "Not supported" (https://caniuse.com/mdn-api_mediadevices_getdisplaymedia) ส่วนบนเดสก์ท็อป "cannot be persisted for reuse. The user must be prompted for permission every time." (MDN)
- **Android MediaProjection**: "Your app must request user consent before each media projection session." บน Android 14 ขึ้นไปต้องมี foreground service ชนิด mediaProjection (https://developer.android.com/media/grow/media-projection)
- **Android Accessibility Service**: Google Play กำหนดว่า "The tools must support people with disabilities as their primary purpose." และ "Deceptive and non-declared uses of these APIs may result in a suspension of your app and/or termination of your developer account." (https://support.google.com/googleplay/android-developer/answer/10964491) นอกจากนี้ยังเท่ากับการอ่าน UI ของแอปอื่น จึงไม่ควรใช้

ข้อควรทำ: ให้ผู้ใช้ยืนยันหรือแก้ตัวเลขที่ OCR อ่านได้ทุกครั้งก่อนบันทึก

---

## 6. ข้อจำกัดที่พิสูจน์ได้

1. ข้อจำกัด "Please wait XX day(s)" ยกเลิกก่อนกำหนดไม่ได้: "these restrictions cannot be lifted" (Help 20000104)
2. ฝ่ายช่วยเหลือไม่ส่งรหัสยืนยันให้โดยตรงและไม่ให้รายละเอียด (Help 20000104, 50001359)
3. การยืนยันเบอร์ทำได้เฉพาะในแอปบนเครื่องหลัก และสร้างบัญชีจาก LINE for PC ไม่ได้ (Help 20000104, 50001182)
4. การลงทะเบียนเบอร์ที่มีบัญชีอยู่แล้วจะลบบัญชีเดิม (Help 20001192)
5. ห้ามใช้ BOT หรือวิธีทางเทคนิค และห้ามส่งคำขอซ้ำ ๆ โดยไม่สมเหตุสมผล (Terms 15(5))
6. ห้ามเก็บข้อมูลบุคคลที่สามโดยมิชอบ และห้ามช่วยหรือเตรียมการ (Terms 15(8), 15(16))
7. LY อาจดำเนินการกับทุกบัญชีของผู้ใช้: "if you have registered multiple accounts, measures may be taken on all of those accounts" (Terms 17.1)
8. คำขอข้อมูลส่วนบุคคลต้องยืนยันตัวตน อาจถูกปฏิเสธ และอาจมีค่าธรรมเนียม (LY Privacy Policy)
9. การแคปจอผ่านเบราว์เซอร์บนมือถือไม่รองรับ (caniuse) และ MediaProjection ต้องขอความยินยอมทุกครั้ง (Android Developers)

---

## 7. การทดลองขั้นต่อไปที่มีเหตุผลและถูกต้อง

1. **เจ้าของเบอร์ยื่นคำขอเปิดเผยข้อมูลของตัวเอง** ผ่าน Personal Data Disclosure Procedure หรือผ่านตัวแทนในไทย (digital@tilleke.com) โดยถามตรง ๆ ว่าจะเปิดเผยสถานะข้อจำกัดการยืนยันเบอร์และวันสิ้นสุดได้หรือไม่ แล้วบันทึกคำตอบไว้เป็นหลักฐาน
2. **ถาม LINE / LY Corporation เป็นลายลักษณ์อักษร** ว่ามีช่องทางสำหรับธุรกิจหรือพาร์ทเนอร์ในการตรวจสถานะเบอร์ (โดยได้รับความยินยอมจากเจ้าของ) หรือไม่ ถ้าไม่มีคำตอบเป็นทางการ ให้ถือว่าไม่มี
3. **ทดสอบความแม่นยำของ OCR ด้วยภาพที่เจ้าของแคปเอง** ใช้เบอร์ของผู้ใช้เองเพียงเบอร์เดียวที่ข้อความแสดงอยู่แล้วตามปกติ ห้ามจงใจกดยืนยันเพื่อให้เกิดข้อความ ทดสอบหลายขนาดจอและทั้งภาษาไทยและอังกฤษ แล้ววัดอัตราการอ่านตัวเลขวันถูกต้อง
4. ตรวจว่า iOS Live Text รองรับภาษาไทยหรือไม่ จากหน้า Apple feature availability
5. ปรับ OCR ในแอป: ครอปบริเวณข้อความ ขยายภาพให้ได้ราว 300 DPI จำกัดตัวอักษรเป็นตัวเลข และให้ผู้ใช้ยืนยันตัวเลข

**ห้ามทำ**: ส่งเบอร์เข้า flow ยืนยันของ LINE ไม่ว่าจะด้วยมือซ้ำ ๆ หรือแบบอัตโนมัติ, ใช้ bot หรือ emulator, ใช้เบอร์ของผู้อื่น, ใช้ endpoint ภายใน

---

## 8. สถานะในเว็บ

> **ยังไม่สามารถตรวจสอบอัตโนมัติได้**
> สถานะของแต่ละเบอร์ต้องมาจากภาพหน้าจอที่เจ้าของเบอร์แคปและส่งเอง แล้วผู้ใช้ยืนยันตัวเลขที่อ่านได้

---

## ข้อกล่าวอ้างที่ถูกหักล้างหรือลดระดับ

| ข้อกล่าวอ้างเดิม | ผลตรวจซ้ำ |
|---|---|
| หน้า LINE Biz Partner Program ไม่มีฟีเจอร์ตรวจสถานะเบอร์ | **ลดระดับ**: URL ถูก redirect ไป lycbiz.com ซึ่งตอบ 403 อ่านไม่ได้ จึงเหลือเพียง "ไม่พบหลักฐาน" ระดับความมั่นใจต่ำ |
| Terms 15(5) เป็นข้อห้ามเรื่อง BOT โดยเฉพาะ | **ปรับถ้อยคำ**: ยืนยันแล้วว่ามีวลีเรื่อง BOT และคำขอซ้ำ ๆ แต่ข้อ (5) เป็นข้อรวมที่เนื้อหาหลักคือการขัดขวางเซิร์ฟเวอร์และบริการ |
| Web Share Target ต้องใช้ "Chrome on Android 76+" | **ลดระดับ**: ตัวเลข 76 มาจากคำแนะนำของเดโมเท่านั้น หน้าเอกสารไม่มีตารางรองรับเบราว์เซอร์ |
| นโยบายความเป็นส่วนตัวให้ "สิทธิเข้าถึง" ข้อมูลสถานะการยืนยันเบอร์ | **ลดระดับ**: นโยบายพูดถึง Disclosure Procedure ทั่วไป ไม่กล่าวถึงข้อมูลสถานะการยืนยันเบอร์ ส่วนที่ว่า LINE จะปฏิเสธเป็นเพียงการอนุมาน |
| iOS Shortcuts: Get Latest Screenshot แล้ว Extract Text | **ลดระดับ**: แหล่งข้อมูลเป็นเว็บบุคคลที่สาม ไม่ใช่เอกสาร Apple และไม่ได้ตรวจซ้ำ |
| iOS ReplayKit | **ตัดออก**: ไม่มีหลักฐาน หน้าเอกสาร Apple เปิดไม่ได้ |
| Live Text รองรับภาษาไทย | **ไม่ยืนยัน**: ยังไม่ได้ตรวจหน้า availability |
| ไม่มีหน้าเว็บยืนยันเบอร์ของ LINE | **คงไว้แบบระวัง**: เป็นการ "ไม่พบ" ไม่ใช่การพิสูจน์ว่าไม่มี |
