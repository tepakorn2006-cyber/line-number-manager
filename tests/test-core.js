'use strict';
// Core tests: node tests/test-core.js  (no dependencies)
// Extracts <script id="core"> from index.html and runs it inside node:vm.
process.env.TZ = 'Asia/Bangkok'; // UTC+7 so UTC-vs-local date bugs show up

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /<script id="core">([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.error('ไม่พบ <script id="core"> ใน index.html'); process.exit(1); }

const sandbox = { module: { exports: {} }, console };
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, { filename: 'index.html#core' });
const C = sandbox.module.exports;

// Objects come from another realm; compare as plain JSON values.
const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const eq = (a, b, msg) => assert.deepStrictEqual(plain(a), plain(b), msg);

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failures.push(name); console.error('FAIL ' + name + '\n  ' + (e && e.message ? e.message.split('\n').join('\n  ') : e)); }
}

// ---------- exports ----------
const REQUIRED = ['thaiDigitsToArabic', 'normalizePhone', 'parsePhoneList', 'classifyIncoming', 'parseCSV', 'toCSV',
  'recordsToCSV', 'csvToRecords', 'addDays', 'todayISO', 'computeRecheckDate', 'dueState', 'extractFromOcrText',
  'filterRecords', 'mergeRecords'];
test('exports every SPEC core function', () => {
  for (const f of REQUIRED) assert.strictEqual(typeof C[f], 'function', f);
});
test('core does not touch DOM / window is optional', () => {
  assert.strictEqual(typeof sandbox.window, 'undefined');
});
test('also attaches window.LineCore when window exists', () => {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(m[1], sb);
  assert.strictEqual(typeof sb.window.LineCore.normalizePhone, 'function');
});

// ---------- thaiDigitsToArabic ----------
test('thaiDigitsToArabic converts all digits', () => {
  assert.strictEqual(C.thaiDigitsToArabic('๐๑๒๓๔๕๖๗๘๙'), '0123456789');
  assert.strictEqual(C.thaiDigitsToArabic('โทร ๐๘๑-๒๓๔-๕๖๗๘'), 'โทร 081-234-5678');
  assert.strictEqual(C.thaiDigitsToArabic(null), '');
  assert.strictEqual(C.thaiDigitsToArabic(123), '123');
});

// ---------- normalizePhone ----------
const ok = (raw, phone) => {
  const r = C.normalizePhone(raw);
  assert.strictEqual(r.ok, true, 'expected ok for ' + JSON.stringify(raw) + ' got ' + JSON.stringify(r));
  assert.strictEqual(r.phone, phone, 'phone for ' + JSON.stringify(raw));
  assert.strictEqual(typeof r.phone, 'string');
  return r;
};
const bad = (raw) => {
  const r = C.normalizePhone(raw);
  assert.strictEqual(r.ok, false, 'expected error for ' + JSON.stringify(raw) + ' got ' + JSON.stringify(r));
  assert.ok(typeof r.error === 'string' && /[฀-๿]/.test(r.error), 'Thai error message for ' + raw);
  return r;
};
test('normalizePhone keeps leading zero, no warning', () => {
  const r = ok('0812345678', '0812345678');
  assert.ok(!r.warning);
  ok('0612345678', '0612345678');
  ok('0912345678', '0912345678');
});
test('normalizePhone strips separators', () => {
  ok('081-234-5678', '0812345678');
  ok('081 234 5678', '0812345678');
  ok('(081) 234.5678', '0812345678');
  ok('081/234/5678', '0812345678');
  ok('  0812345678  ', '0812345678');
  ok('081 234 5678', '0812345678');
});
test('normalizePhone +66 / 66', () => {
  ok('+66812345678', '0812345678');
  ok('+66 81 234 5678', '0812345678');
  ok('66812345678', '0812345678');
  ok('+66-81-234-5678', '0812345678');
  ok('+66 0812345678', '0812345678');
  ok('+6621234567', '021234567'); // landline with country code
  bad('+1 415 555 0100');
});
test('normalizePhone Thai digits', () => {
  ok('๐๘๑๒๓๔๕๖๗๘', '0812345678');
  ok('๐๘๑-๒๓๔-๕๖๗๘', '0812345678');
  ok('+๖๖๘๑๒๓๔๕๖๗๘', '0812345678');
});
test("normalizePhone Excel =\"...\" and ' prefix", () => {
  ok('="0812345678"', '0812345678');
  ok('= "081-234-5678"', '0812345678');
  ok("'0812345678", '0812345678');
  ok("'812345678", '0812345678');
});
test('normalizePhone 9 digits missing zero -> warning', () => {
  for (const raw of ['812345678', '612345678', '912345678', '81-234-5678']) {
    const r = C.normalizePhone(raw);
    assert.strictEqual(r.ok, true, raw);
    assert.strictEqual(r.phone, '0' + raw.replace(/-/g, ''));
    assert.strictEqual(r.warning, 'เติมเลข 0 ด้านหน้าที่หายไป');
  }
});
test('normalizePhone landlines 02-07 (9 digits)', () => {
  for (const p of ['021234567', '031234567', '041234567', '051234567', '061234567', '071234567']) {
    const r = ok(p, p);
    assert.ok(!r.warning);
  }
  ok('02-123-4567', '021234567');
});
test('normalizePhone invalid inputs', () => {
  bad('');
  bad('   ');
  bad(null);
  bad('abc');
  bad('081234567a');
  bad('12345');           // too short
  bad('08123456789');     // 11 digits
  bad('0112345678');      // 10 digits wrong prefix
  bad('0212345678');      // 10 digits landline prefix
  bad('1812345678');      // 10 digits not starting 0
  bad('081234567');       // 9 digits starting 08 (mobile missing a digit)
  bad('011234567');       // 9 digits 01
  bad('001234567');
  bad('112345678');       // 9 digits starting 1
  bad('5123456789012');
});
test('normalizePhone error mentions digit count for wrong length', () => {
  assert.ok(/11/.test(C.normalizePhone('08123456789').error));
  assert.ok(/5/.test(C.normalizePhone('12345').error));
});

// ---------- parsePhoneList ----------
test('parsePhoneList splits by newline/comma/semicolon/tab and skips blanks', () => {
  const r = C.parsePhoneList('0812345678\n081-111-2222, 0899999999;0612345678\t812345678\r\n\n  \nabc');
  eq(r.map((x) => x.raw), ['0812345678', '081-111-2222', '0899999999', '0612345678', '812345678', 'abc']);
  eq(r.map((x) => x.ok), [true, true, true, true, true, false]);
  assert.strictEqual(r[1].phone, '0811112222');
  assert.strictEqual(r[4].phone, '0812345678');
  assert.strictEqual(r[4].warning, 'เติมเลข 0 ด้านหน้าที่หายไป');
  assert.ok(r[5].error);
  assert.strictEqual(r[5].phone, null);
  assert.strictEqual(r[0].warning, null);
  assert.strictEqual(r[0].error, null);
});
test('parsePhoneList empty', () => {
  eq(C.parsePhoneList(''), []);
  eq(C.parsePhoneList(null), []);
});

// ---------- classifyIncoming ----------
test('classifyIncoming new / dup-existing / dup-input / invalid', () => {
  const items = C.parsePhoneList('0812345678\n0899999999\n081-234-5678\nxyz\n812345678\n0611111111\n0899999999');
  const r = C.classifyIncoming(items, ['0899999999']);
  eq(r.map((x) => x.kind), ['new', 'dup-existing', 'dup-input', 'invalid', 'dup-input', 'new', 'dup-existing']);
  assert.strictEqual(r[0].phone, '0812345678'); // original fields kept
});
test('classifyIncoming accepts Set and record arrays', () => {
  const items = C.parsePhoneList('0812345678\n0899999999');
  eq(C.classifyIncoming(items, new Set(['0812345678'])).map((x) => x.kind), ['dup-existing', 'new']);
  eq(C.classifyIncoming(items, [{ phone: '0899999999' }]).map((x) => x.kind), ['new', 'dup-existing']);
  eq(C.classifyIncoming(items, null).map((x) => x.kind), ['new', 'new']);
});

// ---------- parseCSV / toCSV ----------
test('parseCSV basic + trailing newline', () => {
  eq(C.parseCSV('a,b,c\n1,2,3\n'), [['a', 'b', 'c'], ['1', '2', '3']]);
  eq(C.parseCSV('a,b'), [['a', 'b']]);
  eq(C.parseCSV(''), []);
});
test('parseCSV quotes, escaped quotes, commas, newlines in field', () => {
  eq(C.parseCSV('"a,1","he said ""hi""","line1\nline2"\nx,"",z'),
    [['a,1', 'he said "hi"', 'line1\nline2'], ['x', '', 'z']]);
});
test('parseCSV CRLF and CRLF inside quotes', () => {
  eq(C.parseCSV('a,b\r\n1,"x\r\ny"\r\n'), [['a', 'b'], ['1', 'x\r\ny']]);
});
test('parseCSV BOM and empty fields', () => {
  eq(C.parseCSV('﻿เบอร์,note\r\n0812345678,\r\n,'), [['เบอร์', 'note'], ['0812345678', ''], ['', '']]);
});
test('parseCSV Excel style ="..." field', () => {
  eq(C.parseCSV('"=""0812345678""",x'), [['="0812345678"', 'x']]);
});
test('toCSV quotes only when needed and round-trips', () => {
  const rows = [['a', 'b,c', 'say "x"', 'l1\nl2', '', ' pad '], ['ไทย', null, undefined, 7]];
  const s = C.toCSV(rows);
  assert.ok(s.startsWith('a,"b,c","say ""x""","l1\nl2",," pad "'));
  eq(C.parseCSV(s), [['a', 'b,c', 'say "x"', 'l1\nl2', '', ' pad '], ['ไทย', '', '', '7']]);
});

// ---------- dates ----------
test('todayISO uses local date, not UTC', () => {
  // 2026-01-14T18:00Z is 2026-01-15 01:00 in Bangkok
  assert.strictEqual(C.todayISO(new Date(Date.UTC(2026, 0, 14, 18, 0))), '2026-01-15');
  assert.strictEqual(C.todayISO(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  assert.strictEqual(C.todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(C.todayISO()));
});
test('addDays across month/year ends and leap years', () => {
  assert.strictEqual(C.addDays('2026-01-31', 1), '2026-02-01');
  assert.strictEqual(C.addDays('2026-12-28', 7), '2027-01-04');
  assert.strictEqual(C.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(C.addDays('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(C.addDays('2026-02-28', 1), '2026-03-01');
  assert.strictEqual(C.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(C.addDays('2027-01-01', -1), '2026-12-31');
  assert.strictEqual(C.addDays('2026-10-15', 0), '2026-10-15');
  assert.strictEqual(C.addDays('2026-10-15', 365), '2027-10-15');
});
test('addDays invalid input -> null', () => {
  assert.strictEqual(C.addDays('2026-02-30', 1), null);
  assert.strictEqual(C.addDays('15/10/2026', 1), null);
  assert.strictEqual(C.addDays(null, 1), null);
  assert.strictEqual(C.addDays('2026-10-15', NaN), null);
  assert.strictEqual(C.addDays('2026-10-15', 1.5), null);
});
test('computeRecheckDate', () => {
  assert.strictEqual(C.computeRecheckDate('2026-10-15', 7), '2026-10-22');
  assert.strictEqual(C.computeRecheckDate('2026-12-30', 3), '2027-01-02');
  assert.strictEqual(C.computeRecheckDate('2026-10-15', 0), '2026-10-15');
  assert.strictEqual(C.computeRecheckDate('2026-10-15', '5'), '2026-10-20');
  assert.strictEqual(C.computeRecheckDate('2026-10-15', null), null);
  assert.strictEqual(C.computeRecheckDate('2026-10-15', ''), null);
  assert.strictEqual(C.computeRecheckDate('2026-10-15', undefined), null);
  assert.strictEqual(C.computeRecheckDate(null, 7), null);
  assert.strictEqual(C.computeRecheckDate('', 7), null);
  assert.strictEqual(C.computeRecheckDate('2026-10-15', -1), null);
  assert.strictEqual(C.computeRecheckDate('2026-10-15', 'abc'), null);
});

// ---------- dueState ----------
test('dueState boundaries', () => {
  const r = (d, status) => ({ status: status || 'waiting', recheckDate: d });
  const T = '2026-10-15';
  assert.strictEqual(C.dueState(r('2026-10-14'), T, 3), 'overdue');
  assert.strictEqual(C.dueState(r('2025-12-31'), T, 3), 'overdue');
  assert.strictEqual(C.dueState(r('2026-10-15'), T, 3), 'today');
  assert.strictEqual(C.dueState(r('2026-10-16'), T, 3), 'soon');
  assert.strictEqual(C.dueState(r('2026-10-18'), T, 3), 'soon');   // exactly soonDays
  assert.strictEqual(C.dueState(r('2026-10-19'), T, 3), 'later');  // soonDays + 1
  assert.strictEqual(C.dueState(r('2026-10-16'), T, 0), 'later');
  assert.strictEqual(C.dueState(r(null), T, 3), 'none');
  assert.strictEqual(C.dueState(r(''), T, 3), 'none');
  assert.strictEqual(C.dueState(r('bad'), T, 3), 'none');
  assert.strictEqual(C.dueState(null, T, 3), 'none');
});
test('dueState across year end and status', () => {
  assert.strictEqual(C.dueState({ status: 'waiting', recheckDate: '2027-01-02' }, '2026-12-31', 3), 'soon');
  assert.strictEqual(C.dueState({ status: 'waiting', recheckDate: '2026-12-31' }, '2027-01-01', 3), 'overdue');
  assert.strictEqual(C.dueState({ status: 'failed', recheckDate: '2026-10-15' }, '2026-10-15', 3), 'today');
  assert.strictEqual(C.dueState({ status: 'verified', recheckDate: '2026-10-14' }, '2026-10-15', 3), 'none');
});

// ---------- recordsToCSV / csvToRecords ----------
const FIELDS = ['phone', 'note', 'status', 'message', 'error', 'waitDays', 'waitStart', 'recheckDate', 'source', 'checkedAt'];
const pick = (r) => { const o = {}; for (const f of FIELDS) o[f] = r[f]; return o; };
const sampleRecords = [
  { id: 'a', phone: '0812345678', note: 'สมชาย, ร้านค้า', status: 'waiting', message: 'โปรดรอ 7 วันแล้วลองอีกครั้ง',
    error: '', waitDays: 7, waitStart: '2026-10-15', recheckDate: '2026-10-22', source: 'ocr',
    checkedAt: '2026-10-15T03:04:05.000Z', createdAt: '2026-10-15T03:00:00.000Z', updatedAt: '2026-10-15T03:04:05.000Z' },
  { id: 'b', phone: '021234567', note: 'บรรทัด1\nบรรทัด2 "quoted"', status: 'failed', message: 'Error\r\nline',
    error: '=SUM(A1) แปลก', waitDays: null, waitStart: null, recheckDate: null, source: 'manual',
    checkedAt: null, createdAt: 'x', updatedAt: 'x' },
  { id: 'c', phone: '0600000000', note: "'apostrophe", status: 'unrecorded', message: '+ plus', error: '-minus',
    waitDays: 0, waitStart: '2026-12-31', recheckDate: '2027-01-05', source: 'import', checkedAt: null,
    createdAt: 'x', updatedAt: 'x' },
  { id: 'd', phone: '0999999999', note: '@at', status: 'verified', message: '', error: '', waitDays: 3,
    waitStart: '2026-10-01', recheckDate: '2026-10-04', source: 'manual', checkedAt: '2026-10-01T10:00:00.000Z',
    createdAt: 'x', updatedAt: 'x' },
];
test('recordsToCSV: BOM, Thai header, ="phone", source and auto-check columns', () => {
  const csv = C.recordsToCSV(sampleRecords);
  assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
  const rows = C.parseCSV(csv);
  const header = rows[0];
  eq(header, plain(C.CSV_HEADERS));
  assert.ok(header.every((h) => /[฀-๿]/.test(h)), 'all Thai headers');
  assert.ok(header.includes('ที่มา'));
  assert.ok(header.includes('ตรวจอัตโนมัติ'));
  assert.strictEqual(rows.length, 5);
  assert.strictEqual(rows[1][0], '="0812345678"');
  assert.strictEqual(rows[2][0], '="021234567"');
  const autoIdx = header.indexOf('ตรวจอัตโนมัติ');
  for (let i = 1; i < rows.length; i++) assert.strictEqual(rows[i][autoIdx], C.AUTO_CHECK_TEXT);
  assert.strictEqual(C.AUTO_CHECK_TEXT, 'ไม่สามารถตรวจสอบได้ — LINE ไม่มีช่องทางที่ได้รับอนุญาต');
  const srcIdx = header.indexOf('ที่มา');
  assert.strictEqual(rows[1][srcIdx], 'อ่านจากภาพ (ผู้ใช้ยืนยัน)');
  assert.strictEqual(rows[2][srcIdx], 'ผู้ใช้กรอก');
  assert.strictEqual(rows[3][srcIdx], 'นำเข้า CSV');
});
test('recordsToCSV neutralises formula-looking text cells', () => {
  const rows = C.parseCSV(C.recordsToCSV(sampleRecords));
  const errIdx = C.CSV_HEADERS.indexOf('ข้อผิดพลาด');
  assert.ok(rows[2][errIdx].startsWith("'="));
});
test('round-trip export -> import keeps every field', () => {
  const res = C.csvToRecords(C.recordsToCSV(sampleRecords));
  eq(res.issues, []);
  eq(res.rows.map(pick), sampleRecords.map(pick));
  assert.strictEqual(typeof res.rows[2].waitDays, 'number');
});
test('round-trip of empty list', () => {
  const res = C.csvToRecords(C.recordsToCSV([]));
  eq(res.rows, []);
  eq(res.issues, []);
});
test('csvToRecords generic headers (phone/tel/mobile/เบอร์/เบอร์โทร)', () => {
  for (const h of ['phone', 'Phone', 'TEL', 'mobile', 'เบอร์', 'เบอร์โทร']) {
    const res = C.csvToRecords(h + ',name\n0812345678,ก\n812345678,ข\n');
    eq(res.rows.map((r) => r.phone), ['0812345678', '0812345678'], h);
  }
  const res = C.csvToRecords('name,phone,note\nA,081-234-5678,hello\n');
  assert.strictEqual(res.rows[0].phone, '0812345678');
  assert.strictEqual(res.rows[0].note, 'hello');
});
test('csvToRecords without header: first column is phone', () => {
  const res = C.csvToRecords('0812345678,สมชาย\n="0899999999",x\n812345678\n');
  eq(res.rows.map((r) => r.phone), ['0812345678', '0899999999', '0812345678']);
  assert.strictEqual(res.rows[0].note, undefined);
  assert.strictEqual(res.rows[2].warning, 'เติมเลข 0 ด้านหน้าที่หายไป');
});
test('csvToRecords reports invalid phones and bad values as issues', () => {
  const res = C.csvToRecords('เบอร์โทร,สถานะ,จำนวนวันรอ,วันที่เห็นข้อความ\nabc,ต้องรอ,7,2026-10-15\n0812345678,???,x,2026-02-30\n\n');
  eq(res.rows.map((r) => r.phone), ['0812345678']);
  assert.strictEqual(res.rows[0].status, 'unrecorded');
  assert.strictEqual(res.rows[0].waitDays, null);
  assert.strictEqual(res.rows[0].waitStart, null);
  assert.ok(res.issues.length >= 4, JSON.stringify(plain(res.issues)));
  assert.strictEqual(res.issues[0].row, 2);
  assert.strictEqual(res.issues[0].skipped, true);
  assert.ok(res.issues.slice(1).every((i) => i.skipped === false && i.row === 3));
});
test('csvToRecords accepts status codes, Excel dates, BE years and computes recheck', () => {
  const res = C.csvToRecords('phone,status,จำนวนวันรอ,วันที่เห็นข้อความ\n0812345678,waiting,7,15/10/2026\n0812345679,ต้องรอ,3,30/12/2569\n');
  eq(res.issues, []);
  assert.strictEqual(res.rows[0].status, 'waiting');
  assert.strictEqual(res.rows[0].waitStart, '2026-10-15');
  assert.strictEqual(res.rows[0].recheckDate, '2026-10-22');
  assert.strictEqual(res.rows[1].waitStart, '2026-12-30');
  assert.strictEqual(res.rows[1].recheckDate, '2027-01-02');
});
test('csvToRecords header without phone column -> issue', () => {
  const res = C.csvToRecords('name,note\nA,B\n');
  eq(res.rows, []);
  assert.strictEqual(res.issues.length, 1);
});

// ---------- extractFromOcrText ----------
test('OCR Thai wait message', () => {
  const r = C.extractFromOcrText('เบอร์โทรศัพท์นี้ถูกใช้ไปแล้ว\nโปรดรอ 7 วันแล้วลองอีกครั้ง');
  assert.strictEqual(r.waitDays, 7);
  assert.ok(/7/.test(r.waitMatch) && /วัน/.test(r.waitMatch));
  assert.strictEqual(r.waitAmbiguous, false);
  eq(r.phones, []);
});
test('OCR Thai with Tesseract-style spaces and Thai digits', () => {
  const r = C.extractFromOcrText('โปรด ร อ ๑๔ วั น แล้ว ลอง อีก ครั้ง');
  assert.strictEqual(r.waitDays, 14);
});
test('OCR English wait message', () => {
  const r = C.extractFromOcrText('Please wait 3 day(s) then try again.');
  assert.strictEqual(r.waitDays, 3);
  assert.ok(/3/.test(r.waitMatch));
  const r2 = C.extractFromOcrText('PLEASE WAIT 10 DAY(S) THEN TRY AGAIN');
  assert.strictEqual(r2.waitDays, 10);
});
test('OCR ambiguous multiple wait values -> null + flagged', () => {
  const r = C.extractFromOcrText('โปรดรอ 7 วัน\nPlease wait 3 day(s) then try again');
  assert.strictEqual(r.waitDays, null);
  assert.strictEqual(r.waitMatch, null);
  assert.strictEqual(r.waitAmbiguous, true);
  eq(r.waitCandidates.map((c) => c.value).sort(), [3, 7]);
});
test('OCR same value repeated is not ambiguous', () => {
  const r = C.extractFromOcrText('โปรดรอ 5 วัน\nรอ 5 วัน');
  assert.strictEqual(r.waitDays, 5);
  assert.strictEqual(r.waitAmbiguous, false);
});
test('OCR no wait value', () => {
  const r = C.extractFromOcrText('ยืนยันหมายเลขโทรศัพท์สำเร็จ');
  assert.strictEqual(r.waitDays, null);
  assert.strictEqual(r.waitMatch, null);
  assert.strictEqual(r.waitAmbiguous, false);
  const e = C.extractFromOcrText('');
  eq(e.phones, []);
  assert.strictEqual(e.waitDays, null);
});
test('OCR phones with spaces, dashes, +66, Thai digits; dedupe', () => {
  const r = C.extractFromOcrText('หมายเลข 081 234 5678\n+66 89 999 9999\n๐๖๑-๑๑๑-๒๒๒๒\nโทร 081-234-5678 อีกครั้ง\n02-123-4567');
  eq(r.phones.filter((p) => p.ok).map((p) => p.phone), ['0812345678', '0899999999', '0611112222', '021234567']);
  for (const p of r.phones) assert.ok('raw' in p && 'warning' in p);
});
test('OCR phone next to wait number on same line', () => {
  const r = C.extractFromOcrText('0812345678 7 วัน');
  eq(r.phones.filter((p) => p.ok).map((p) => p.phone), ['0812345678']);
  assert.strictEqual(r.waitDays, 7);
});
test('OCR two phones on one line separated by space', () => {
  const r = C.extractFromOcrText('0812345678 0899999999');
  eq(r.phones.filter((p) => p.ok).map((p) => p.phone), ['0812345678', '0899999999']);
});
test('OCR missing-zero phone gets warning; dates are not phones', () => {
  const r = C.extractFromOcrText('812345678\nวันที่ 15/10/2026 เวลา 12:30');
  eq(r.phones.map((p) => p.phone), ['0812345678']);
  assert.strictEqual(r.phones[0].warning, 'เติมเลข 0 ด้านหน้าที่หายไป');
});
test('OCR long digit run kept as invalid candidate', () => {
  const r = C.extractFromOcrText('รหัส 123456789012');
  assert.strictEqual(r.phones.length, 1);
  assert.strictEqual(r.phones[0].ok, false);
});

// ---------- filterRecords ----------
const recs = [
  { id: '1', phone: '0812345678', note: 'สมชาย', status: 'waiting', message: 'โปรดรอ 7 วัน', error: '', source: 'ocr', recheckDate: '2026-10-14' },
  { id: '2', phone: '0899999999', note: 'Shop A', status: 'waiting', message: '', error: '', source: 'manual', recheckDate: '2026-10-15' },
  { id: '3', phone: '0611112222', note: '', status: 'verified', message: '', error: '', source: 'import', recheckDate: null },
  { id: '4', phone: '021234567', note: 'office', status: 'failed', message: '', error: 'timeout', source: 'manual', recheckDate: '2026-10-17' },
  { id: '5', phone: '0633333333', note: '', status: 'unrecorded', message: '', error: '', source: 'manual', recheckDate: '2026-11-30' },
];
const ids = (a) => a.map((r) => r.id);
const T = '2026-10-15';
test('filterRecords by query (phone digits with separators, Thai digits, text, case)', () => {
  eq(ids(C.filterRecords(recs, { q: '081-234' })), ['1']);
  eq(ids(C.filterRecords(recs, { q: '๐๘๙' })), ['2']);
  eq(ids(C.filterRecords(recs, { q: 'สมชาย' })), ['1']);
  eq(ids(C.filterRecords(recs, { q: 'shop' })), ['2']);
  eq(ids(C.filterRecords(recs, { q: 'TIMEOUT' })), ['4']);
  eq(ids(C.filterRecords(recs, { q: 'รอ 7' })), ['1']);
  eq(ids(C.filterRecords(recs, { q: '' })), ['1', '2', '3', '4', '5']);
  eq(ids(C.filterRecords(recs, {})), ['1', '2', '3', '4', '5']);
  eq(ids(C.filterRecords(recs)), ['1', '2', '3', '4', '5']);
});
test('filterRecords by status / source / combined', () => {
  eq(ids(C.filterRecords(recs, { status: 'waiting' })), ['1', '2']);
  eq(ids(C.filterRecords(recs, { status: 'all' })), ['1', '2', '3', '4', '5']);
  eq(ids(C.filterRecords(recs, { source: 'manual' })), ['2', '4', '5']);
  eq(ids(C.filterRecords(recs, { status: 'waiting', source: 'manual' })), ['2']);
  eq(ids(C.filterRecords(recs, { q: '08', status: 'waiting', source: 'ocr' })), ['1']);
});
test('filterRecords by due', () => {
  const o = { today: T, soonDays: 3 };
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'overdue' }, o))), ['1']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'today' }, o))), ['2']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'soon' }, o))), ['4']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'later' }, o))), ['5']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'none' }, o))), ['3']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'due' }, o))), ['1', '2']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'recheck' }, o))), ['1', '2', '4']);
  eq(ids(C.filterRecords(recs, Object.assign({ due: 'soon' }, { today: T, soonDays: 1 }))), []);
});
test('filterRecords does not mutate input', () => {
  const copy = plain(recs);
  C.filterRecords(recs, { q: '08', status: 'waiting' });
  eq(recs, copy);
});

// ---------- mergeRecords ----------
const base = () => [
  { id: 'e1', phone: '0812345678', note: 'เดิม', status: 'waiting', message: 'old', error: '', waitDays: 7,
    waitStart: '2026-10-01', recheckDate: '2026-10-08', source: 'manual', checkedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' },
];
const NOW = '2026-10-15T05:00:00.000Z';
let idn = 0;
const idFn = () => 'new' + (++idn);
test('mergeRecords skip keeps existing untouched, adds new, skips dup within input', () => {
  idn = 0;
  const ex = base();
  const snapshot = plain(ex);
  const inc = [{ phone: '0812345678', note: 'ใหม่' }, { phone: '0899999999', note: 'B' }, { phone: '0899999999', note: 'B2' }, { phone: 'bad' }];
  const r = C.mergeRecords(ex, inc, 'skip', { now: NOW, idFn });
  eq(ex, snapshot, 'input not mutated');
  assert.strictEqual(r.records.length, 2);
  eq(r.records[0], snapshot[0]);
  const n = r.records[1];
  eq(n, { id: 'new1', phone: '0899999999', note: 'B', status: 'unrecorded', message: '', error: '', waitDays: null,
    waitStart: null, recheckDate: null, source: 'import', checkedAt: null, createdAt: NOW, updatedAt: NOW });
  eq({ added: r.added, updated: r.updated, skipped: r.skipped, dupInput: r.dupInput, invalid: r.invalid },
    { added: 1, updated: 0, skipped: 1, dupInput: 1, invalid: 1 });
});
test('mergeRecords overwrite replaces only provided fields, keeps id/createdAt', () => {
  idn = 0;
  const inc = [{ phone: '0812345678', note: 'ใหม่', status: 'verified', waitDays: null, recheckDate: null }];
  const r = C.mergeRecords(base(), inc, 'overwrite', { now: NOW, idFn });
  const x = r.records[0];
  assert.strictEqual(x.id, 'e1');
  assert.strictEqual(x.createdAt, '2026-10-01T00:00:00.000Z');
  assert.strictEqual(x.updatedAt, NOW);
  assert.strictEqual(x.note, 'ใหม่');
  assert.strictEqual(x.status, 'verified');
  assert.strictEqual(x.waitDays, null);
  assert.strictEqual(x.recheckDate, null);
  assert.strictEqual(x.message, 'old');      // not provided -> kept
  assert.strictEqual(x.source, 'import');    // result fields changed without source -> import
  assert.strictEqual(r.updated, 1);
  assert.strictEqual(r.added, 0);
});
test('mergeRecords overwrite with explicit source and phone-only row', () => {
  const r = C.mergeRecords(base(), [{ phone: '0812345678', status: 'failed', source: 'ocr' }], 'overwrite', { now: NOW });
  assert.strictEqual(r.records[0].source, 'ocr');
  const r2 = C.mergeRecords(base(), [{ phone: '0812345678' }], 'overwrite', { now: NOW });
  assert.strictEqual(r2.records[0].source, 'manual');
  assert.strictEqual(r2.records[0].status, 'waiting');
});
test('mergeRecords normalises incoming phones and generates unique ids', () => {
  const r = C.mergeRecords([], [{ phone: '081-111-1111' }, { phone: '0822222222' }], 'skip', { now: NOW });
  eq(r.records.map((x) => x.phone), ['0811111111', '0822222222']);
  assert.notStrictEqual(r.records[0].id, r.records[1].id);
  assert.ok(r.records[0].id);
});
test('mergeRecords CSV round-trip into empty list preserves fields', () => {
  const parsed = C.csvToRecords(C.recordsToCSV(sampleRecords));
  const r = C.mergeRecords([], parsed.rows, 'skip', { now: NOW });
  eq(r.records.map(pick), sampleRecords.map(pick));
  assert.ok(r.records.every((x) => !('warning' in x) && !('row' in x)));
});

// ---------- helpers ----------
test('escapeHtml', () => {
  assert.strictEqual(C.escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.strictEqual(C.escapeHtml(null), '');
});
test('sanitizeState repairs bad / missing data', () => {
  eq(C.sanitizeState(null), { version: 1, settings: { soonDays: 3 }, records: [] });
  const s = C.sanitizeState({ version: 1, settings: { soonDays: 5 }, records: [
    { id: 'a', phone: '0812345678', status: 'weird', source: 'x', waitDays: '7', waitStart: '2026-10-15' },
    { phone: 812345678 }, 'junk'] });
  assert.strictEqual(s.settings.soonDays, 5);
  assert.strictEqual(s.records.length, 1);
  assert.strictEqual(s.records[0].status, 'unrecorded');
  assert.strictEqual(s.records[0].source, 'manual');
  assert.strictEqual(s.records[0].waitDays, 7);
  assert.strictEqual(s.records[0].phone, '0812345678');
});
test('no default wait days anywhere in records', () => {
  const r = C.makeRecord({ phone: '0812345678' }, { now: NOW });
  assert.strictEqual(r.waitDays, null);
  assert.strictEqual(r.recheckDate, null);
});

// ---------- regressions (tester reports) ----------
test('regression: "Try again in 5 days" is a wait candidate → mixed values are ambiguous', () => {
  const r = C.extractFromOcrText('Please wait 3 day(s)\nTry again in 5 days\n089-765-4321');
  assert.strictEqual(r.waitDays, null);
  assert.strictEqual(r.waitAmbiguous, true);
  eq(r.waitCandidates.map((c) => c.value).sort(), [3, 5]);
  eq(r.phones.map((p) => p.phone), ['0897654321']);
  const one = C.extractFromOcrText('Try again in 5 days');
  assert.strictEqual(one.waitDays, 5);
  assert.strictEqual(one.waitAmbiguous, false);
  const same = C.extractFromOcrText('Please wait 3 day(s). Try again in 3 days');
  assert.strictEqual(same.waitDays, 3);
  assert.strictEqual(same.waitAmbiguous, false);
  assert.strictEqual(C.extractFromOcrText('1 day').waitDays, 1);
  assert.strictEqual(C.extractFromOcrText('no wait info today').waitDays, null);
});
test('regression: round-trip keeps a deliberately cleared recheckDate as null', () => {
  const rec = C.makeRecord({ phone: '0812345678', status: 'waiting', waitDays: 7, waitStart: '2026-10-01', recheckDate: null }, { now: NOW });
  assert.strictEqual(rec.recheckDate, null);
  const back = C.csvToRecords(C.recordsToCSV([rec])).rows[0];
  assert.strictEqual(back.recheckDate, null);
  assert.strictEqual(back.waitDays, 7);
  assert.strictEqual(back.waitStart, '2026-10-01');
  const merged = C.mergeRecords([], [back], 'skip', { now: NOW }).records[0];
  assert.strictEqual(merged.recheckDate, null);
  // no recheck column at all → still computed
  const noCol = C.csvToRecords('phone,waitDays,waitStart\n0812345678,7,2026-10-01').rows[0];
  assert.strictEqual(noCol.recheckDate, '2026-10-08');
  // unreadable recheck value → falls back to computed (and reports an issue)
  const badCol = C.csvToRecords('phone,waitDays,waitStart,recheckDate\n0812345678,7,2026-10-01,xx');
  assert.strictEqual(badCol.rows[0].recheckDate, '2026-10-08');
  assert.ok(badCol.issues.some((i) => i.field === 'recheckDate'));
});
test('regression: overwrite import that changes waitDays/waitStart recomputes recheckDate', () => {
  const base = [C.makeRecord({ id: 'a', phone: '0812345678', status: 'waiting', waitDays: 3, waitStart: '2026-10-01' }, { now: NOW })];
  assert.strictEqual(base[0].recheckDate, '2026-10-04');
  let r = C.mergeRecords(base, C.csvToRecords('phone,waitDays\n0812345678,10').rows, 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.waitDays, 10);
  assert.strictEqual(r.recheckDate, '2026-10-11');
  r = C.mergeRecords(base, C.csvToRecords('phone,waitDays\n0812345678,').rows, 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.waitDays, null);
  assert.strictEqual(r.recheckDate, null);
  r = C.mergeRecords(base, C.csvToRecords('phone,waitStart\n0812345678,2026-10-10').rows, 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.recheckDate, '2026-10-13');
  // explicit recheck date in the file wins
  r = C.mergeRecords(base, C.csvToRecords('phone,waitDays,recheckDate\n0812345678,10,2026-12-01').rows, 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.recheckDate, '2026-12-01');
  // a user override survives an import that only restates the same wait values / touches other fields
  const custom = [Object.assign({}, base[0], { recheckDate: '2026-11-30' })];
  r = C.mergeRecords(custom, [{ phone: '0812345678', waitDays: 3, note: 'x' }], 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.recheckDate, '2026-11-30');
  r = C.mergeRecords(custom, C.csvToRecords('phone,note\n0812345678,hello').rows, 'overwrite', { now: NOW }).records[0];
  assert.strictEqual(r.recheckDate, '2026-11-30');
  assert.strictEqual(r.note, 'hello');
});
test('regression: 66 + 0 + landline / mobile (with or without +) normalises', () => {
  ok('66021234567', '021234567');
  ok('+66021234567', '021234567');
  ok('+66 2 123 4567', '021234567');
  ok('66812345678', '0812345678');
  ok('660812345678', '0812345678');
  ok('+660812345678', '0812345678');
  bad('66081234567'); // 66 + 0 + only 8 digits of a mobile
});
test('regression: sanitizeState validates phones and checkedAt', () => {
  const s = C.sanitizeState({ records: [
    { phone: '1' }, { phone: '0812345678', checkedAt: 'garbage' }, { phone: '812345678' },
    { phone: '0899999999', checkedAt: '2026-10-15T05:00:00.000Z' }] });
  eq(s.records.map((r) => r.phone), ['0812345678', '0899999999']); // '812345678' normalises to a duplicate
  assert.strictEqual(s.records[0].checkedAt, null);
  assert.strictEqual(s.records[1].checkedAt, '2026-10-15T05:00:00.000Z');
  assert.strictEqual(C.makeRecord({ phone: '0812345678', checkedAt: 'nope' }).checkedAt, null);
});
test('RESULT_FIELDS exported for the UI preview', () => {
  assert.ok(Array.isArray(C.RESULT_FIELDS) && C.RESULT_FIELDS.indexOf('waitDays') >= 0);
});

console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
process.exit(failures.length ? 1 : 0);
