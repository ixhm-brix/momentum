// storage.js — save/load in the browser, and check imported files.

import { RULES } from './validators.js';

const DATA_KEY = 'finance:data';
const SETTINGS_KEY = 'finance:settings';

export const DEFAULT_SETTINGS = {
  cap: 400000,                     // stored in the base currency (RWF)
  baseCurrency: 'RWF',             // amounts are ALWAYS stored in this
  displayCurrency: 'RWF',          // what amounts are shown in (RWF | USD | EUR)
  rates: { USD: 1300, EUR: 1450 }, // how many RWF 1 unit of each is worth
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
};

// Return saved records, or null on the first ever visit.
export function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveData(records) {
  localStorage.setItem(DATA_KEY, JSON.stringify(records));
}

// A fresh copy, so nobody changes the defaults by accident.
function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaults();
    return { ...cloneDefaults(), ...JSON.parse(raw) };
  } catch {
    return cloneDefaults();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const REQUIRED_FIELDS = ['id', 'description', 'amount', 'category', 'date', 'createdAt', 'updatedAt'];

// Check an imported JSON file. Returns {ok:true, records} or {ok:false, error}.
export function validateImport(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Expected a JSON array of transaction records.' };
  }
  const seenIds = new Set();
  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i];
    const at = `Record ${i + 1}`;
    if (typeof r !== 'object' || r === null || Array.isArray(r)) {
      return { ok: false, error: `${at} is not an object.` };
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in r) || r[field] === null || r[field] === '') {
        return { ok: false, error: `${at} is missing the required field “${field}”.` };
      }
    }
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount < 0) {
      return { ok: false, error: `${at} has an invalid amount (must be a non-negative number).` };
    }
    if (!RULES.date.test(r.date)) {
      return { ok: false, error: `${at} has a date not in YYYY-MM-DD format: “${r.date}”.` };
    }
    if (seenIds.has(r.id)) {
      return { ok: false, error: `Duplicate id found: “${r.id}”. Every id must be unique.` };
    }
    seenIds.add(r.id);
  }
  return { ok: true, records: parsed };
}
