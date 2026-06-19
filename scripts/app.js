// app.js startup, page switching, and hooking up the buttons.

import * as state from './state.js';
import * as ui from './ui.js';
import { compileRegex, filterRecords, sortRecords } from './search.js';
import {
  validateTransaction,
  validateCategory,
  validateAmount,
  validateDescription,
  validateDate,
} from './validators.js';
import { validateImport } from './storage.js';

const $ = (sel) => document.querySelector(sel);
const ROUTES = ['dashboard', 'transactions', 'add', 'settings', 'about'];
const FORM_FIELDS = ['description', 'amount', 'category', 'date'];
const FIELD_VALIDATORS = {
  description: validateDescription,
  amount: validateAmount,
  category: validateCategory,
  date: validateDate,
};

// View state (not saved).
let searchRe = null;
let sortKey = 'created-desc';
let editingId = null;

/* ---------- Routing ---------- */

function currentRoute() {
  const hash = location.hash.replace('#', '');
  return ROUTES.includes(hash) ? hash : 'dashboard';
}

function showRoute(route) {
  ROUTES.forEach((r) => {
    $(`#${r}`).hidden = r !== route;
    const link = document.querySelector(`nav a[data-route="${r}"]`);
    if (r === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `Momentum — ${route[0].toUpperCase()}${route.slice(1)}`;
}

/* ---------- Rendering ---------- */

function renderTransactions() {
  const all = state.getAll();
  const list = sortRecords(filterRecords(all, searchRe), sortKey);
  ui.renderTable(list, searchRe, state.getSettings());
  ui.setResultCount(list.length, all.length);
}

function renderDashboard() {
  ui.renderDashboard(state.stats(), state.spentThisMonth(), state.getSettings());
}

function renderSettings() {
  const settings = state.getSettings();
  ui.renderSettingsInputs(settings);
  ui.renderCategoryList(settings.categories);
  ui.renderCategoryOptions(settings.categories);
}

function renderAll() {
  renderTransactions();
  renderDashboard();
  renderSettings();
}

/* ---------- Form ---------- */

function readForm() {
  return {
    description: $('#f-description').value,
    amount: $('#f-amount').value,
    category: $('#f-category').value,
    date: $('#f-date').value,
  };
}

function resetForm() {
  editingId = null;
  $('#txn-form').reset();
  $('#f-date').value = todayISO();
  $('#add-title-mode').textContent = 'Add an entry';
  $('#cancel-edit').hidden = true;
  ui.clearFieldErrors(FORM_FIELDS);
  ui.renderCategoryOptions(state.getSettings().categories);
}

function startEdit(id) {
  const t = state.getById(id);
  if (!t) return;
  editingId = id;
  $('#f-description').value = t.description;
  $('#f-amount').value = String(t.amount);
  ui.renderCategoryOptions(state.getSettings().categories, t.category);
  $('#f-date').value = t.date;
  $('#add-title-mode').textContent = `Edit entry ${id}`;
  $('#cancel-edit').hidden = false;
  ui.clearFieldErrors(FORM_FIELDS);
  location.hash = '#add';
  // the URL change happens a moment later, so show the panel now so focus lands right.
  showRoute('add');
  $('#f-description').focus();
}

function handleSubmit(event) {
  event.preventDefault();
  const values = readForm();
  const errors = validateTransaction(values);

  FORM_FIELDS.forEach((f) => ui.showFieldError(f, errors[f] || null));

  const firstInvalid = FORM_FIELDS.find((f) => errors[f]);
  if (firstInvalid) {
    $(`#f-${firstInvalid}`).focus();
    return;
  }

  const payload = {
    description: values.description,
    amount: Number(values.amount),
    category: values.category,
    date: values.date,
  };

  if (editingId) {
    state.update(editingId, payload);
    ui.announce(`Updated entry ${editingId}.`);
  } else {
    const record = state.add(payload);
    ui.announce(`Logged ${record.id} — ${ui.money(record.amount, state.getSettings())}.`);
  }

  resetForm();
  renderAll();
  location.hash = '#transactions';
}

/* ---------- Search ---------- */

function applySearch() {
  const input = $('#search').value;
  const flags = $('#search-ci').checked ? 'i' : '';
  searchRe = compileRegex(input, flags);
  ui.setPatternState(!input ? 'idle' : searchRe ? 'valid' : 'invalid');
  renderTransactions();
}

/* ---------- Settings handlers ---------- */

function handleCapSubmit(event) {
  event.preventDefault();
  const value = Number($('#set-cap').value);
  if (!Number.isFinite(value) || value < 0) {
    ui.announce('Enter a cap of 0 or more.');
    return;
  }
  state.updateSettings({ cap: value });
  renderDashboard();
  ui.announce(value === 0 ? 'Spending cap removed.' : `Spending cap set to ${ui.money(value, state.getSettings())}.`);
}

// Save the manually-typed exchange rates (how many RWF each currency is worth).
function handleCurrencySubmit(event) {
  event.preventDefault();
  const usd = Number($('#rate-usd').value);
  const eur = Number($('#rate-eur').value);
  if (![usd, eur].every((r) => Number.isFinite(r) && r > 0)) {
    ui.announce('Exchange rates must be positive numbers.');
    return;
  }
  state.updateSettings({ rates: { USD: usd, EUR: eur } });
  renderAll();
  ui.announce('Exchange rates saved.');
}

// Switch which currency amounts are shown in (only the display changes,
// the saved entries stay in RWF). Redraw the whole app right away.
function handleDisplayCurrency(event) {
  state.updateSettings({ displayCurrency: event.target.value });
  renderAll();
  ui.announce(`Now showing amounts in ${event.target.value}.`);
}

function handleAddCategory(event) {
  event.preventDefault();
  const input = $('#new-category');
  const name = input.value.trim();
  const error = validateCategory(name);
  const errEl = $('#err-new-category');
  if (error) {
    errEl.textContent = error;
    errEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  const settings = state.getSettings();
  if (settings.categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
    errEl.textContent = `“${name}” is already a category.`;
    errEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  errEl.hidden = true;
  input.removeAttribute('aria-invalid');
  state.updateSettings({ categories: [...settings.categories, name] });
  input.value = '';
  renderSettings();
  ui.announce(`Added category “${name}”.`);
}

function handleRemoveCategory(name) {
  const settings = state.getSettings();
  if (settings.categories.length <= 1) return;
  state.updateSettings({ categories: settings.categories.filter((c) => c !== name) });
  renderSettings();
  ui.announce(`Removed category “${name}”.`);
}

/* ---------- Import / export ---------- */

function handleExport() {
  const blob = new Blob([JSON.stringify(state.getAll(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `momentum-export-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ui.announce('Exported all entries as JSON.');
}

async function handleImport(event) {
  const file = event.target.files[0];
  const status = $('#import-status');
  if (!file) return;
  const text = await file.text();
  const result = validateImport(text);
  if (!result.ok) {
    status.textContent = `Import rejected: ${result.error}`;
    status.dataset.tone = 'error';
  } else {
    const count = state.getAll().length;
    const ok =
      count === 0 ||
      confirm(`Replace the current ${count} entries with ${result.records.length} imported entries?`);
    if (ok) {
      state.setAll(result.records);
      renderAll();
      status.textContent = `Imported ${result.records.length} entries successfully.`;
      status.dataset.tone = 'ok';
    } else {
      status.textContent = 'Import cancelled.';
      status.dataset.tone = '';
    }
  }
  event.target.value = '';
}

async function loadSeed(replace) {
  try {
    const res = await fetch('seed.json');
    const records = await res.json();
    if (replace && state.getAll().length > 0) {
      if (!confirm(`Replace the current ${state.getAll().length} entries with the sample data?`)) return;
    }
    state.setAll(records);
    renderAll();
    ui.announce(`Loaded ${records.length} sample entries.`);
  } catch {
    ui.announce('Could not load seed.json (are you running from a local server?).');
  }
}

/* ---------- Boot ---------- */

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function wireEvents() {
  window.addEventListener('hashchange', () => showRoute(currentRoute()));

  $('#txn-form').addEventListener('submit', handleSubmit);
  $('#cancel-edit').addEventListener('click', () => {
    resetForm();
    location.hash = '#transactions';
  });

  // Re-check a field as you type, once it's been marked wrong.
  FORM_FIELDS.forEach((f) => {
    $(`#f-${f}`).addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') {
        ui.showFieldError(f, FIELD_VALIDATORS[f](e.target.value));
      }
    });
  });

  $('#search').addEventListener('input', applySearch);
  $('#search-ci').addEventListener('change', applySearch);
  $('#sort').addEventListener('change', (e) => {
    sortKey = e.target.value;
    renderTransactions();
  });

  $('#txn-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') startEdit(id);
    if (action === 'delete') {
      const t = state.getById(id);
      if (confirm(`Delete ${id} — “${t.description}”?`)) {
        state.remove(id);
        renderAll();
        ui.announce(`Deleted ${id}.`);
      }
    }
  });

  $('#cap-form').addEventListener('submit', handleCapSubmit);
  $('#cur-form').addEventListener('submit', handleCurrencySubmit);
  $('#display-currency').addEventListener('change', handleDisplayCurrency);
  $('#cat-form').addEventListener('submit', handleAddCategory);
  $('#cat-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-remove-cat]');
    if (btn) handleRemoveCategory(btn.dataset.removeCat);
  });

  $('#export-btn').addEventListener('click', handleExport);
  $('#import-file').addEventListener('change', handleImport);
  $('#seed-btn').addEventListener('click', () => loadSeed(true));
  $('#reset-btn').addEventListener('click', handleReset);
}

// Clear saved data and settings, then reload.
function handleReset() {
  if (!confirm('Reset the app? This clears all saved entries and settings in this browser and reloads with fresh defaults.')) return;
  localStorage.removeItem('finance:data');
  localStorage.removeItem('finance:settings');
  location.reload();
}

async function boot() {
  const hadData = state.boot();
  if (!hadData) await loadSeed(false); // first visit: offer sample data
  $('#f-date').value = todayISO();
  renderAll();
  wireEvents();
  showRoute(currentRoute());
}

boot();
