/**
 * Salary Signal Lite API v0.2
 * Google Apps Script Web App bound to the project's Google Sheet.
 */
const SPREADSHEET_ID = '1VH20mCtdQQbes3sM-158Z8r5Z0Ir8D4QoMjXulsCnHg';
const GROUPS_SHEET = 'groups';
const SUBMISSIONS_SHEET = 'submissions';
const CONFIG_SHEET = 'config';
const DEFAULT_REFERENCE_CENTER = 10000;

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || '';
    const token = String(params.group || '').trim();

    if (action === 'getGroup') return jsonResponse(getGroupResponse_(token));
    if (action === 'getSubmissions') return jsonResponse(getSubmissionsResponse_(token));
    if (action === 'getData') return jsonResponse(getDataResponse_(token));
    return jsonResponse({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: 'INTERNAL_ERROR' });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'createGroup') return jsonResponse(createGroup_(body));
    if (body.action === 'submitDeviation') return jsonResponse(submitDeviation_(body));
    return jsonResponse({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error instanceof SyntaxError ? 'INVALID_JSON' : 'INTERNAL_ERROR' });
  }
}

function createGroup_(payload) {
  const token = String(payload.group || '').trim();
  const description = String(payload.description || '').trim();
  if (!token) return { ok: false, error: 'GROUP_REQUIRED' };
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(token)) return { ok: false, error: 'INVALID_GROUP' };
  if (!description) return { ok: false, error: 'DESCRIPTION_REQUIRED' };
  if (description.length > 160) return { ok: false, error: 'DESCRIPTION_TOO_LONG' };

  const config = getConfig_();
  const referenceCenter = optionalNumber_(payload.reference_center, optionalNumber_(payload.initialCenter, DEFAULT_REFERENCE_CENTER));
  const minDeviation = optionalNumber_(payload.minDeviation, config.defaultMinDeviation);
  const maxDeviation = optionalNumber_(payload.maxDeviation, config.defaultMaxDeviation);
  if (referenceCenter === null || minDeviation === null || maxDeviation === null) return { ok: false, error: 'INVALID_NUMBER' };
  if (minDeviation >= maxDeviation) return { ok: false, error: 'INVALID_DEVIATION_RANGE' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (findGroup_(token)) return { ok: true, alreadyExists: true };
    appendGroupRow_({
      created_at: new Date(),
      group_token: token,
      reference_center: referenceCenter,
      group_description: description,
      initial_center: referenceCenter,
      min_deviation: minDeviation,
      max_deviation: maxDeviation,
      created_by_context: 'web',
      status: 'active',
      app_version: String(payload.appVersion || '0.2'),
      notes: ''
    });
    return { ok: true, created: true };
  } finally {
    lock.releaseLock();
  }
}

function submitDeviation_(payload) {
  const token = String(payload.group || '').trim();
  const deviation = Number(payload.deviation);
  let accepted = true;
  let rejectReason = '';
  let group = null;

  if (!token) {
    accepted = false;
    rejectReason = 'GROUP_REQUIRED';
  } else {
    group = findGroup_(token);
    if (!group) {
      accepted = false;
      rejectReason = 'GROUP_NOT_FOUND';
    } else if (group.status !== 'active') {
      accepted = false;
      rejectReason = 'GROUP_NOT_ACTIVE';
    }
  }

  if (!Number.isFinite(deviation)) {
    accepted = false;
    rejectReason = rejectReason || 'INVALID_DEVIATION';
  }

  if (accepted && Math.abs(deviation) > 1000000) {
    accepted = false;
    rejectReason = 'DEVIATION_OUT_OF_TECHNICAL_RANGE';
  }

  const rawPayload = JSON.stringify(payload);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_(SUBMISSIONS_SHEET).appendRow([
      new Date(), token, Number.isFinite(deviation) ? deviation : '',
      String(payload.roundId || ''), String(payload.clientIdHash || ''),
      String(payload.appVersion || '0.2'), accepted, rejectReason,
      String(payload.source || 'github-pages'), '', sha256_(rawPayload), ''
    ]);
  } finally {
    lock.releaseLock();
  }

  return accepted ? { ok: true, accepted: true } : { ok: false, accepted: false, error: rejectReason };
}

function getGroupResponse_(token) {
  const group = findGroup_(token);
  return group ? { ok: true, group: publicGroup_(group) } : { ok: false, error: 'GROUP_NOT_FOUND' };
}

function getSubmissionsResponse_(token) {
  if (!findGroup_(token)) return { ok: false, error: 'GROUP_NOT_FOUND' };
  return { ok: true, items: acceptedSubmissions_(token) };
}

function getDataResponse_(token) {
  const group = findGroup_(token);
  if (!group) return { ok: false, error: 'GROUP_NOT_FOUND' };
  const config = getConfig_();
  return {
    ok: true,
    group: publicGroup_(group),
    items: acceptedSubmissions_(token),
    reference_center: group.referenceCenter,
    config: {
      minResultsToShow: config.minResultsToShow,
      stableResultsThreshold: config.stableResultsThreshold
    }
  };
}

function findGroup_(token) {
  if (!token) return null;
  const rows = rowsAsObjects_(sheet_(GROUPS_SHEET));
  const row = rows.find(function (item) { return String(item.group_token) === token; });
  if (!row) return null;
  return {
    token: String(row.group_token),
    description: String(row.group_description || ''),
    referenceCenter: finiteOr_(row.reference_center, finiteOr_(row.initial_center, DEFAULT_REFERENCE_CENTER)),
    initialCenter: finiteOr_(row.reference_center, finiteOr_(row.initial_center, DEFAULT_REFERENCE_CENTER)),
    minDeviation: finiteOr_(row.min_deviation, getConfig_().defaultMinDeviation),
    maxDeviation: finiteOr_(row.max_deviation, getConfig_().defaultMaxDeviation),
    status: String(row.status || 'active')
  };
}

function acceptedSubmissions_(token) {
  return rowsAsObjects_(sheet_(SUBMISSIONS_SHEET))
    .filter(function (row) { return String(row.group_token) === token && isTrue_(row.accepted); })
    .map(function (row) {
      return { deviation: Number(row.deviation), timestamp: isoDate_(row.timestamp) };
    })
    .filter(function (item) { return Number.isFinite(item.deviation); });
}

function getConfig_() {
  const values = sheet_(CONFIG_SHEET).getDataRange().getValues();
  const map = {};
  values.forEach(function (row) {
    const key = String(row[0] || '').trim();
    if (key) map[key] = row[1];
  });
  return {
    defaultMinDeviation: finiteOr_(map.default_min_deviation, -2000),
    defaultMaxDeviation: finiteOr_(map.default_max_deviation, 2000),
    minResultsToShow: finiteOr_(map.min_results_to_show, 5),
    stableResultsThreshold: finiteOr_(map.stable_results_threshold, 10)
  };
}

function appendGroupRow_(valuesByHeader) {
  const sheet = ensureReferenceCenterColumn_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (value) { return String(value).trim(); });
  sheet.appendRow(headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(valuesByHeader, header) ? valuesByHeader[header] : "";
  }));
}

function ensureReferenceCenterColumn_() {
  const sheet = sheet_(GROUPS_SHEET);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (value) { return String(value).trim(); });
  if (headers.indexOf('reference_center') !== -1) return sheet;
  const tokenIndex = headers.indexOf('group_token');
  if (tokenIndex === -1) throw new Error('Missing group_token header');
  sheet.insertColumnAfter(tokenIndex + 1);
  sheet.getRange(1, tokenIndex + 2).setValue('reference_center');
  return sheet;
}

function rowsAsObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (value) { return String(value).trim(); });
  return values.slice(1).map(function (row) {
    const item = {};
    headers.forEach(function (header, index) { item[header] = row[index]; });
    return item;
  });
}

function publicGroup_(group) {
  return {
    token: group.token,
    description: group.description,
    initialCenter: group.initialCenter,
    reference_center: group.referenceCenter,
    minDeviation: group.minDeviation,
    maxDeviation: group.maxDeviation,
    status: group.status
  };
}

function sheet_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function optionalNumber_(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteOr_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isTrue_(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function isoDate_(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toISOString();
}

function sha256_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
