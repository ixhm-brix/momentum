// state.js  the data. Holds entries, add/edit/delete, settings, and totals.
// Every change saves to the browser right away.

import { loadData, saveData, loadSettings, saveSettings } from './storage.js';

let transactions = [];
let settings = loadSettings();

// Load saved entries. Gives back false on the very first visit (nothing saved yet).
export function boot() {
  const stored = loadData();
  if (stored === null) return false;
  transactions = stored;
  return true;
}

export const getAll = () => transactions.map((t) => ({ ...t }));
export const getById = (id) => transactions.find((t) => t.id === id);

function nextId() {
  const max = transactions.reduce((m, t) => {
    const match = /^txn_(\d+)$/.exec(t.id);
    return match ? Math.max(m, Number(match[1])) : m;
  }, 0);
  return `txn_${String(max + 1).padStart(4, '0')}`;
}

export function add({ description, amount, category, date }) {
  const now = new Date().toISOString();
  const record = {
    id: nextId(),
    description,
    amount,
    category,
    date,
    createdAt: now, // set once, never changed
    updatedAt: now,
  };
  transactions.push(record);
  saveData(transactions);
  return record;
}

export function update(id, fields) {
  const record = transactions.find((t) => t.id === id);
  if (!record) return null;
  Object.assign(record, fields, {
    id: record.id,
    createdAt: record.createdAt, // keep the original createdAt
    updatedAt: new Date().toISOString(),
  });
  saveData(transactions);
  return record;
}

export function remove(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveData(transactions);
}

export function setAll(records) {
  transactions = records.map((t) => ({ ...t }));
  saveData(transactions);
}

// Give back a copy so other code can't change our data directly.
export const getSettings = () => JSON.parse(JSON.stringify(settings));

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  return getSettings();
}

export function stats() {
  const count = transactions.length;
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = {};
  for (const t of transactions) {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  }
  let topCategory = null;
  for (const [name, sum] of Object.entries(byCategory)) {
    if (!topCategory || sum > topCategory.total) topCategory = { name, total: sum };
  }
  return { count, total, topCategory, last7: last7Days() };
}

export function last7Days(today = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    const total = transactions
      .filter((t) => t.date === iso)
      .reduce((sum, t) => sum + t.amount, 0);
    days.push({
      iso,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      total,
    });
  }
  return days;
}

export function spentThisMonth(today = new Date()) {
  const monthPrefix = toISODate(today).slice(0, 7);
  return transactions
    .filter((t) => t.date.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.amount, 0);
}

function toISODate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
