/**
 * Banan survey Google Apps Script endpoint (schema v3).
 * Bind this script to the response spreadsheet (Extensions > Apps Script).
 * One row is upserted per random response ID after each completed section.
 *
 * Answer keys are the question IDs used in app.js:
 *   101-111  hearing participants
 *   207-210  hearing participants who are not interested (replaces 107-111)
 *   301-308  non-hearing participants
 */
const SHEET_NAME = 'Responses_v3';
const HEARING = ['سامع', 'غير سامع'];
const VALID_STATUS = ['in_progress', 'screened_out', 'complete'];
const HEARING_PATHS = {
  general: 'مهتم أو منفتح',
  not_interested: 'غير مهتم'
};

// Color per group for the header row.
const COLORS = {
  general: '#2aa3c4',
  hearing: '#3a5fcd',
  uninterested: '#8a5cc7',
  deaf: '#e5675a',
  status: '#1b1b1b'
};

// Answer columns in sheet order. key = question ID in app.js.
// opts: text = free text (longer limit, wide column), center = short value, wide = wider column.
const ANSWER_COLUMNS = [
  // سامع — القسم الأول
  {key: '101', group: 'hearing', header: 'سامع: الوضع الحالي'},
  {key: '102', group: 'hearing', header: 'سامع: التعامل مع أصم/ضعيف سمع'},
  {key: '103', group: 'hearing', header: 'سامع: طرق التواصل المستخدمة'},
  {key: '104', group: 'hearing', header: 'سامع: تعلّم الإشارة سابقًا'},
  {key: '105', group: 'hearing', header: 'سامع: مصادر التعلم'},
  {key: '106', group: 'hearing', header: 'سامع: صعوبات التعلم'},
  // سامع — القسم الثاني (المسار العام)
  {key: '107', group: 'hearing', header: 'سامع: دوافع التعلم'},
  {key: '108', group: 'hearing', header: 'سامع: طريقة التعلم المفضلة'},
  {key: '109', group: 'hearing', header: 'سامع: وقت الجلسة', center: true},
  {key: '110', group: 'hearing', header: 'سامع: احتمال استخدام التطبيق (1-5)', center: true},
  {key: '111', group: 'hearing', header: 'سامع: ملاحظات واقتراحات', text: true},
  // سامع غير مهتم — القسم الثاني (بدل 107-111)
  {key: '207', group: 'uninterested', header: 'غير مهتم: أسباب عدم الاهتمام'},
  {key: '208', group: 'uninterested', header: 'غير مهتم: مواقف تُظهر أهمية الإشارة'},
  {key: '209', group: 'uninterested', header: 'غير مهتم: تغيّر الاهتمام'},
  {key: '210', group: 'uninterested', header: 'غير مهتم: احتمال تجربة التطبيق (1-5)', center: true},
  // غير سامع
  {key: '301', group: 'deaf', header: 'غير سامع: طريقة التواصل مع غير العارفين'},
  {key: '302', group: 'deaf', header: 'غير سامع: معرفة المحيط بالإشارة'},
  {key: '303', group: 'deaf', header: 'غير سامع: تكرار التواصل مع غير العارفين'},
  {key: '304', group: 'deaf', header: 'غير سامع: مواقف الصعوبة'},
  {key: '305', group: 'deaf', header: 'غير سامع: ترك خدمة بسبب التواصل'},
  {key: '306', group: 'deaf', header: 'غير سامع: أهمية تعلّم المجتمع (1-5)', center: true},
  {key: '307', group: 'deaf', header: 'غير سامع: أثر التطبيق (1-5)', center: true},
  {key: '308', group: 'deaf', header: 'غير سامع: رسالة لمن يريد تعلّم الإشارة', text: true}
];

const BASE_COLUMNS = [
  {header: 'معرّف عشوائي', group: 'general', width: 80},
  {header: 'وقت البدء', group: 'general', width: 125, center: true},
  {header: 'وقت الانتهاء', group: 'general', width: 125, center: true},
  {header: 'الاسم', group: 'general', width: 110},
  {header: 'العمر', group: 'general', width: 85, center: true},
  {header: 'الفئة العمرية', group: 'general', width: 85, center: true},
  {header: 'الجنس', group: 'general', width: 85, center: true},
  {header: 'السمع', group: 'general', width: 85, center: true},
  {header: 'مسار السامع', group: 'general', width: 100, center: true}
];

const STATUS_COLUMN = {header: 'حالة الإكمال', group: 'status', width: 100, center: true};

const ALL_COLUMNS = BASE_COLUMNS
  .concat(ANSWER_COLUMNS.map(c => Object.assign({width: c.text ? 340 : 190}, c)))
  .concat([STATUS_COLUMN]);

const HEADERS = ALL_COLUMNS.map(c => c.header);
const ANSWER_KEYS = ANSWER_COLUMNS.map(c => c.key);
const TEXT_KEYS = ANSWER_COLUMNS.filter(c => c.text).map(c => c.key);

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
    const answers = p.answers || {};
    const values = [
      p.id,
      new Date(p.startTime),
      p.status === 'in_progress' ? '' : new Date(p.endTime),
      safeCell_(p.name, 100),
      Number(p.age),
      ageGroup_(Number(p.age)),
      p.gender,
      p.hearing,
      HEARING_PATHS[p.hearingPath] || '',
      ...ANSWER_KEYS.map(k => safeCell_(answers[k] || '', TEXT_KEYS.includes(k) ? 2000 : 1500)),
      p.status
    ];
    const target = row || sheet.getLastRow() + 1;
    sheet.getRange(target, 1, 1, HEADERS.length).setValues([values]);
    sheet.getRange(target, HEADERS.length).setNote(String(p.saveToken));
    sheet.getRange(target, 2, 1, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
    return json_({ok:true, schemaVersion:SCHEMA_VERSION, id:p.id, status:p.status});
  } catch (err) {
    console.error(String(err && err.message || err));
    return json_({ok:false, error:String(err && err.message || err).slice(0,180)});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

const SCHEMA_VERSION = 3;

/**
 * JSONP endpoint used by app.js (it expects schemaVersion 3 in every reply).
 *  ?action=ping    -> checks the endpoint is the v3 script
 *  ?action=status  -> confirms a save by id. Never returns names or answers.
 */
function doGet(e) {
  const params = e && e.parameter || {};
  const callback = String(params.callback || '');
  const validCallback = /^banan_cb_[a-z0-9]+$/.test(callback);

  if (params.action === 'ping') {
    if (!validCallback) return invalidCallback_();
    return jsonp_(callback, {ok:true, schemaVersion:SCHEMA_VERSION, service:'Banan survey endpoint'});
  }

  if (params.action === 'status') {
    const id = String(params.id || '');
    if (!validCallback) return invalidCallback_();
    if (!/^[0-9a-f-]{32,40}$/i.test(id)) return jsonp_(callback, {ok:false, schemaVersion:SCHEMA_VERSION, exists:false});
    const sheet = getSheet_();
    const row = rowForId_(sheet, id);
    const result = row
      ? {ok:true, schemaVersion:SCHEMA_VERSION, exists:true, status:String(sheet.getRange(row, HEADERS.length).getValue()), saveToken:sheet.getRange(row, HEADERS.length).getNote()}
      : {ok:true, schemaVersion:SCHEMA_VERSION, exists:false};
    return jsonp_(callback, result);
  }

  return ContentService.createTextOutput('Banan survey endpoint is running.').setMimeType(ContentService.MimeType.TEXT);
}

function invalidCallback_() {
  return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function validate_(p) {
  if (!p || !/^[0-9a-f-]{32,40}$/i.test(String(p.id || ''))) throw new Error('invalid_id');
  if (!p.name || String(p.name).trim().length > 100) throw new Error('invalid_name');
  if (!Number.isInteger(Number(p.age)) || Number(p.age) < 12) throw new Error('invalid_age');
  if (p.gender !== 'ذكر' && p.gender !== 'أنثى') throw new Error('invalid_gender');
  if (!HEARING.includes(p.hearing)) throw new Error('invalid_hearing');
  if (p.hearingPath && !HEARING_PATHS[p.hearingPath]) throw new Error('invalid_hearing_path');
  if (!VALID_STATUS.includes(p.status)) throw new Error('invalid_status');
  if (!/^[0-9a-f-]{32,40}$/i.test(String(p.saveToken || ''))) throw new Error('invalid_save_token');
  if (!p.startTime || isNaN(Date.parse(p.startTime))) throw new Error('invalid_time');
  if (p.status !== 'in_progress' && (!p.endTime || isNaN(Date.parse(p.endTime)))) throw new Error('invalid_time');
  if (JSON.stringify(p.answers || {}).length > 20000) throw new Error('answers_too_long');
}

/** Run from the script editor any time to (re)apply the readable sheet layout. Does not touch the data. */
function formatBanan() {
  formatSheet_(getSheet_());
  SpreadsheetApp.flush();
  console.log('Banan sheet formatted.');
}

function formatSheet_(sheet) {
  const cols = HEADERS.length;
  const maxRows = sheet.getMaxRows();
  sheet.setRightToLeft(true);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);

  // Base look for the whole table
  const all = sheet.getRange(1, 1, maxRows, cols);
  all.setFontSize(10).setVerticalAlignment('top').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  // Header: one colour per group, built from the column config
  ALL_COLUMNS.forEach((c, i) => {
    sheet.getRange(1, i + 1)
      .setBackground(COLORS[c.group]).setFontColor('#ffffff').setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    sheet.setColumnWidth(i + 1, c.width);
    if (c.center && maxRows > 1) sheet.getRange(2, i + 1, maxRows - 1, 1).setHorizontalAlignment('center');
  });
  sheet.setRowHeight(1, 60);

  // Alternating row colours (data rows only)
  sheet.getBandings().forEach(b => b.remove());
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, cols)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }

  // Status colours
  const statusRange = sheet.getRange(2, cols, Math.max(maxRows - 1, 1), 1);
  const rule = (text, bg, fg) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([statusRange]).build();
  sheet.setConditionalFormatRules([
    rule('complete', '#d4f4dd', '#14532d'),
    rule('in_progress', '#fff3c4', '#7b4b00'),
    rule('screened_out', '#e5e7eb', '#374151')
  ]);

  // Filter on the header row
  if (!sheet.getFilter()) sheet.getRange(1, 1, maxRows, cols).createFilter();
}

function getSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('BANAN_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Run setupBanan once from the script editor before deploying.');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    formatSheet_(sheet);
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
