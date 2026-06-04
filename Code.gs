/**
 * 遙感探測與實習 - 特徵強化請作答 (記錄 API)
 * 國立中興大學 森林學系 - 大Q
 *
 * 部署：右上「部署」 -> 「新增部署作業」 -> 類型選「網頁應用程式」
 *      執行身分：我  /  存取權：任何人
 *      複製產生的 URL 貼回 HTML 設定欄位即可
 */

function init() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Progress');
  if (!sheet) sheet = ss.insertSheet('Progress');
  sheet.clear();
  const headers = ['ID','Name','StartTime','L1','L2','L3','L4','L5','FinishTime','TotalSeconds','Status'];
  sheet.getRange(1, 1, 1, headers.length)
       .setValues([headers])
       .setFontWeight('bold')
       .setBackground('#1a3a52')
       .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 120);
  for (let i = 3; i <= 9; i++) sheet.setColumnWidth(i, 160);
  sheet.setColumnWidth(10, 120);
  sheet.setColumnWidth(11, 80);
  return 'Progress sheet ready';
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'leaderboard';
  let result;
  try {
    if (action === 'leaderboard') result = getLeaderboard();
    else if (action === 'ping') result = { ok: true, time: new Date().toISOString() };
    else if (action === 'init') result = { ok: true, msg: init() };
    else result = { error: 'unknown action: ' + action };
  } catch (err) { result = { error: String(err) }; }
  return _resp(result);
}

function doPost(e) {
  let result;
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === 'recordStart') result = recordStart(data);
    else if (action === 'recordLevel') result = recordLevel(data);
    else if (action === 'recordFinish') result = recordFinish(data);
    else if (action === 'getLeaderboard') result = getLeaderboard();
    else result = { error: 'unknown action: ' + action };
  } catch (err) { result = { error: String(err) }; }
  return _resp(result);
}

function _resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getProgressSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Progress');
  if (!sheet) { init(); sheet = ss.getSheetByName('Progress'); }
  return sheet;
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function _now() {
  const tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
}

function recordStart(data) {
  if (!data.id || !data.name) return { error: 'missing id or name' };
  const sheet = getProgressSheet();
  let row = findRowById(sheet, data.id);
  const nowStr = _now();
  if (row > 0) {
    sheet.getRange(row, 2).setValue(data.name);
    sheet.getRange(row, 3).setValue(nowStr);
    sheet.getRange(row, 4, 1, 7).clearContent();
    sheet.getRange(row, 11).setValue('inprogress');
  } else {
    row = sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 11).setValues([[data.id, data.name, nowStr, '', '', '', '', '', '', '', 'inprogress']]);
  }
  return { ok: true, row: row, time: nowStr };
}

function recordLevel(data) {
  if (!data.id) return { error: 'missing id' };
  const sheet = getProgressSheet();
  const row = findRowById(sheet, data.id);
  if (row < 0) return { error: 'student not found, call recordStart first' };
  const level = parseInt(data.level);
  if (level < 1 || level > 5) return { error: 'invalid level (1-5)' };
  const cell = sheet.getRange(row, 3 + level);
  const existing = String(cell.getValue() || '');
  const m = existing.match(/\|\s*(\d+)/);
  const prevScore = m ? parseInt(m[1]) : 0;
  const newScore = parseInt(data.score) || 0;
  let timeStr;
  if (existing && existing.indexOf('|') >= 0) {
    timeStr = existing.split('|')[0].trim();
  } else if (existing) {
    timeStr = existing.trim();
  } else {
    timeStr = _now();
  }
  const finalScore = Math.max(prevScore, newScore);
  cell.setValue(timeStr + ' | ' + finalScore);
  return { ok: true, finalScore: finalScore, improved: newScore > prevScore };
}

function recordFinish(data) {
  if (!data.id) return { error: 'missing id' };
  const sheet = getProgressSheet();
  const row = findRowById(sheet, data.id);
  if (row < 0) return { error: 'student not found' };
  const startStr = sheet.getRange(row, 3).getValue();
  let totalSec = 0;
  if (startStr) {
    const start = (startStr instanceof Date) ? startStr : new Date(startStr);
    totalSec = Math.round((new Date().getTime() - start.getTime()) / 1000);
  }
  sheet.getRange(row, 9).setValue(_now());
  sheet.getRange(row, 10).setValue(totalSec);
  sheet.getRange(row, 11).setValue('done');
  return { ok: true, totalSeconds: totalSec };
}

function getLeaderboard() {
  const sheet = getProgressSheet();
  const data = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const fmt = (v) => v instanceof Date
      ? Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss')
      : String(v || '');
    result.push({
      id: String(row[0]),
      name: String(row[1] || ''),
      start: fmt(row[2]),
      levels: [fmt(row[3]), fmt(row[4]), fmt(row[5]), fmt(row[6]), fmt(row[7])],
      finish: fmt(row[8]),
      totalSec: row[9] || 0,
      status: String(row[10] || '')
    });
  }
  result.sort((a, b) => {
    const aDone = a.status === 'done', bDone = b.status === 'done';
    if (aDone && bDone) return (a.totalSec || 1e9) - (b.totalSec || 1e9);
    if (aDone) return -1;
    if (bDone) return 1;
    const aLv = a.levels.filter(x => x).length;
    const bLv = b.levels.filter(x => x).length;
    return bLv - aLv;
  });
  return { leaderboard: result };
}
