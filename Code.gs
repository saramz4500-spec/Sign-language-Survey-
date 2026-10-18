/**
 * Banan survey Google Apps Script endpoint.
 * Bind this script to the response spreadsheet (Extensions > Apps Script).
 * One row is upserted per random response ID after each completed section.
 */
const SHEET_NAME = 'Responses_v2';
// مفاتيح الإجابات بالترتيب نفسه لأعمدة الأسئلة في HEADERS (تطابق أرقام الأسئلة في app.js)
const ANSWER_KEYS = ['2','4','5','17','6','7','8','9','10','13','15','16','21','22','23','24','25','26','27','28'];
const TEXT_KEYS = ['16','28'];
const HEARING = ['سامع', 'أصم / ضعيف سمع'];
const HEADERS = [
  'معرّف عشوائي', 'وقت البدء', 'وقت الانتهاء', 'الاسم', 'العمر', 'الفئة العمرية', 'الجنس', 'السمع',
  'الوضع الأساسي (الكل)',
  'سامع: التعامل مع صم', 'سامع: العلاقة', 'سامع: كيف تواصل', 'سامع: تعلّم الإشارة سابقًا', 'سامع: الاهتمام (1-5)',
  'سامع: دوافع التعلم', 'سامع: العوائق', 'سامع: طريقة التعلم', 'سامع: وقت الجلسة', 'سامع: التوصية (1-5)', 'سامع: أمنية للتطبيق',
  'أصم: طريقة التواصل', 'أصم: من يعرف الإشارة حوله', 'أصم: تكرار التواصل مع غير العارفين', 'أصم: مواقف الصعوبة',
  'أصم: ترك خدمة بسبب التواصل', 'أصم: حاجة المحيط للتعلم', 'أصم: أثر التطبيق (1-5)', 'أصم: ما يتمنى أن يعرفه السامعون',
  'حالة الإكمال'
];
const VALID_STATUS = ['in_progress', 'screened_out', 'complete'];

/** Run once from the script editor attached to the destination spreadsheet. */
function setupBanan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open Apps Script from the response spreadsheet, then run setupBanan.');
  PropertiesService.getScriptProperties().setProperty('BANAN_SPREADSHEET_ID', ss.getId());
  const sheet = getSheet_();
  SpreadsheetApp.flush();
  console.log('Banan is configured. Response tab: ' + sheet.getName());
}

function doPost(e) {
  let lock;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 30000) return json_({ok:false, error:'invalid_payload'});
    const p = JSON.parse(raw);
    validate_(p);
    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    const sheet = getSheet_();
    const row = rowForId_(sheet, p.id);
    const values = [
      p.id,
      new Date(p.startTime),
      p.status === 'in_progress' ? '' : new Date(p.endTime),
      safeCell_(p.name, 100),
      Number(p.age),
      ageGroup_(Number(p.age)),
      p.gender,
      p.hearing,
      ...ANSWER_KEYS.map(k => safeCell_((p.answers || {})[k] || '', TEXT_KEYS.includes(k) ? 2000 : 1200)),
      p.status
    ];
    const target = row || sheet.getLastRow() + 1;
    sheet.getRange(target, 1, 1, HEADERS.length).setValues([values]);
    sheet.getRange(target, HEADERS.length).setNote(String(p.saveToken));
    sheet.getRange(target, 2, 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
    return json_({ok:true, id:p.id, status:p.status});
  } catch (err) {
    console.error(String(err && err.message || err));
    return json_({ok:false, error:String(err && err.message || err).slice(0,180)});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

/** Status-only JSONP endpoint. It never returns names or answers. */
function doGet(e) {
  const params = e && e.parameter || {};
  if (params.action === 'status') {
    const callback = String(params.callback || '');
    const id = String(params.id || '');
    if (!/^banan_cb_[a-z0-9]+$/.test(callback)) return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
    if (!/^[0-9a-f-]{32,40}$/i.test(id)) return jsonp_(callback, {ok:false, exists:false});
    const sheet = getSheet_();
    const row = rowForId_(sheet, id);
    const result = row ? {ok:true, exists:true, status:String(sheet.getRange(row, HEADERS.length).getValue()), saveToken:sheet.getRange(row, HEADERS.length).getNote()} : {ok:true, exists:false};
    return jsonp_(callback, result);
  }
  if (params.action === 'ping') return json_({ok:true, service:'Banan survey endpoint'});
  return ContentService.createTextOutput('Banan survey endpoint is running.').setMimeType(ContentService.MimeType.TEXT);
}

function validate_(p) {
  if (!p || !/^[0-9a-f-]{32,40}$/i.test(String(p.id || ''))) throw new Error('invalid_id');
  if (!p.name || String(p.name).trim().length > 100) throw new Error('invalid_name');
  if (!Number.isInteger(Number(p.age)) || Number(p.age) < 12) throw new Error('invalid_age');
  if (p.gender !== 'ذكر' && p.gender !== 'أنثى') throw new Error('invalid_gender');
  if (!HEARING.includes(p.hearing)) throw new Error('invalid_hearing');
  if (!VALID_STATUS.includes(p.status)) throw new Error('invalid_status');
  if (!/^[0-9a-f-]{32,40}$/i.test(String(p.saveToken || ''))) throw new Error('invalid_save_token');
  if (!p.startTime || isNaN(Date.parse(p.startTime))) throw new Error('invalid_time');
  if (p.status !== 'in_progress' && (!p.endTime || isNaN(Date.parse(p.endTime)))) throw new Error('invalid_time');
  if (JSON.stringify(p.answers || {}).length > 20000) throw new Error('answers_too_long');
}

function getSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('BANAN_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Run setupBanan once from the script editor before deploying.');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (HEADERS.some((header, i) => existing[i] !== header)) {
      throw new Error('The Responses tab already exists with different headers. Rename it or clear it before use.');
    }
  }
  return sheet;
}

function rowForId_(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  const found = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}

function ageGroup_(age) {
  if (age < 18) return '12–17';
  if (age < 25) return '18–24';
  if (age < 35) return '25–34';
  if (age < 45) return '35–44';
  return '45 أو أكثر';
}

// Prevent participant text beginning with spreadsheet formula characters from being executed.
function safeCell_(value, maxLength) {
  let text = String(value == null ? '' : value).slice(0, maxLength);
  if (/^[=+@\-]/.test(text)) text = "'" + text;
  return text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, obj) {
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj).replace(/</g, '\\u003c') + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}