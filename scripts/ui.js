// ui.js — draws the page. Holds no data; it's all passed in.

import { highlight, escapeHtml } from './search.js';

const $ = (sel) => document.querySelector(sel);

const KNOWN_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', RWF: 'FRw ', KES: 'KSh ',
  NGN: '₦', JPY: '¥', GHS: 'GH₵ ', ZAR: 'R ', CAD: 'CA$',
};

export function symbolFor(code) {
  return KNOWN_SYMBOLS[code] || `${code} `;
}

export function money(amount, symbol = '$') {
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${n}`;
}

/* ---------- Transactions ---------- */

export function renderTable(records, re, settings) {
  const tbody = $('#txn-tbody');
  const sym = settings.base.symbol;
  tbody.innerHTML = records
    .map(
      (t) => `
    <tr class="txn-row">
      <td data-label="Description" class="cell-desc">${highlight(t.description, re)}</td>
      <td data-label="Category"><span class="cat-chip">${highlight(t.category, re)}</span></td>
      <td data-label="Date" class="num">${highlight(t.date, re)}</td>
      <td data-label="Amount" class="num cell-amount">${money(t.amount, sym)}</td>
      <td data-label="Actions" class="row-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${t.id}">
          Edit<span class="visually-hidden"> ${escapeHtml(t.description)}</span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-danger" data-action="delete" data-id="${t.id}">
          Delete<span class="visually-hidden"> ${escapeHtml(t.description)}</span>
        </button>
      </td>
    </tr>`
    )
    .join('');
  $('#txn-empty').hidden = records.length !== 0;
}

export function setResultCount(shown, total) {
  $('#result-count').textContent =
    total === 0
      ? 'The ledger is empty — add your first entry.'
      : `Showing ${shown} of ${total} ${total === 1 ? 'entry' : 'entries'}.`;
}

export function setPatternState(state) {
  // state: 'idle' | 'valid' | 'invalid'
  const el = $('#search-state');
  el.dataset.state = state;
  el.textContent =
    state === 'valid' ? '✓ valid pattern'
    : state === 'invalid' ? '✗ invalid pattern'
    : '— type to search';
}

/* ---------- Dashboard ---------- */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

// Animate a number from 0 up to its value (count-up effect).
function countUp(el, target, format) {
  if (REDUCED_MOTION.matches || target === 0) {
    el.textContent = format(target);
    return;
  }
  if (el._raf) cancelAnimationFrame(el._raf);
  const duration = 750;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(target * eased);
    if (p < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}

// Some currencies have no cents, so show no decimals.
const ZERO_DECIMAL = new Set(['RWF', 'JPY', 'KRW', 'UGX', 'XOF', 'XAF', 'VND', 'CLP']);
function formatAmount(value, code) {
  const dec = ZERO_DECIMAL.has(code) ? 0 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function renderDashboard(stats, monthSpent, settings) {
  const sym = settings.base.symbol;
  const code = settings.base.code;

  // Fill in the total on the banknote.
  $('#stat-total').textContent = formatAmount(stats.total, code);
  $('#hero-cur').textContent = code;
  $('#hero-period').textContent = `All entries · ${code}`;
  $('#hero-words').textContent = stats.count
    ? `${stats.count} ${stats.count === 1 ? 'entry' : 'entries'} · led by ${stats.topCategory ? stats.topCategory.name : '—'}`
    : 'No entries recorded yet';
  $('#hero-serial').textContent = `SER · RL—${String(stats.count).padStart(4, '0')}—A`;
  $('#stat-conversions').textContent =
    stats.total > 0
      ? settings.others.map((o) => `≈ ${o.code} ${formatAmount(stats.total * o.rate, o.code)}`).join('   ·   ')
      : '';

  countUp($('#stat-count'), stats.count, (v) => String(Math.round(v)));
  $('#stat-top').textContent = stats.topCategory ? stats.topCategory.name : '—';
  $('#stat-top-detail').textContent = stats.topCategory
    ? money(stats.topCategory.total, sym)
    : 'no entries yet';
  renderChart(stats.last7, sym);
  renderCap(monthSpent, settings);
}

function renderChart(last7, sym) {
  const chart = $('#chart');
  const max = Math.max(...last7.map((d) => d.total), 1);
  const avg = last7.reduce((s, d) => s + d.total, 0) / 7;
  const avgPct = Math.round((avg / max) * 100);
  chart.innerHTML = `
    <div class="chart-plot" style="--avg:${avgPct}">
      ${avg > 0 ? `<span class="chart-avg" aria-hidden="true"><i>avg ${money(avg, sym)}</i></span>` : ''}
      ${last7
        .map(
          (d) => `
      <div class="chart-col">
        <span class="chart-val">${d.total ? money(d.total, sym) : ''}</span>
        <span class="chart-bar${d.total ? '' : ' is-empty'}" style="--h:${Math.round((d.total / max) * 100)}"></span>
      </div>`
        )
        .join('')}
    </div>
    <div class="chart-days">
      ${last7.map((d) => `<span class="chart-day">${d.label}<b>${d.dayNum}</b></span>`).join('')}
    </div>`;
  chart.setAttribute(
    'aria-label',
    `Bar chart of spending for the last 7 days. ${last7
      .map((d) => `${d.label} ${d.dayNum}: ${money(d.total, sym)}`)
      .join(', ')}.`
  );
}

function renderCap(monthSpent, settings) {
  const cap = Number(settings.cap) || 0;
  const sym = settings.base.symbol;
  const card = $('#budget-card');
  const fill = $('#cap-meter-fill');
  const figure = $('#cap-figure');
  const note = $('#cap-note');
  const stamp = $('#over-stamp');
  const polite = $('#cap-live-polite');
  const assertive = $('#cap-live-assertive');

  if (!cap) {
    figure.textContent = 'No monthly cap set.';
    note.textContent = 'Set a spending cap in Settings to track your budget.';
    fill.style.width = '0%';
    fill.classList.remove('is-over');
    card.classList.remove('is-over');
    stamp.hidden = true;
    polite.textContent = 'No spending cap is set.';
    assertive.textContent = '';
    return;
  }

  const remaining = cap - monthSpent;
  const pct = Math.min(100, (monthSpent / cap) * 100);
  fill.style.width = `${pct}%`;
  figure.textContent = `${money(monthSpent, sym)} of ${money(cap, sym)}`;

  if (remaining >= 0) {
    note.textContent = `${money(remaining, sym)} remaining this month.`;
    fill.classList.remove('is-over');
    card.classList.remove('is-over');
    stamp.hidden = true;
    // gentle message while under the cap
    polite.textContent = `Within budget — ${money(remaining, sym)} remaining this month.`;
    assertive.textContent = '';
  } else {
    note.textContent = `Over by ${money(-remaining, sym)} this month.`;
    fill.classList.add('is-over');
    card.classList.add('is-over');
    stamp.hidden = false;
    // urgent message once over the cap
    assertive.textContent = `Budget exceeded by ${money(-remaining, sym)} this month.`;
    polite.textContent = '';
  }
}

/* ---------- Settings ---------- */

export function renderCategoryOptions(categories, selectedValue) {
  const select = $('#f-category');
  const current = selectedValue ?? select.value;
  const list = [...categories];
  if (current && !list.includes(current)) list.push(current);
  select.innerHTML = list
    .map((c) => `<option value="${escapeHtml(c)}"${c === current ? ' selected' : ''}>${escapeHtml(c)}</option>`)
    .join('');
}

export function renderCategoryList(categories) {
  const ul = $('#cat-list');
  ul.innerHTML = categories
    .map(
      (c) => `
    <li>
      <span>${escapeHtml(c)}</span>
      <button type="button" class="btn btn-ghost btn-sm btn-danger" data-remove-cat="${escapeHtml(c)}"
        ${categories.length <= 1 ? 'disabled' : ''}>
        Remove<span class="visually-hidden"> category ${escapeHtml(c)}</span>
      </button>
    </li>`
    )
    .join('');
}

export function renderSettingsInputs(settings) {
  $('#set-cap').value = settings.cap || '';
  $('#base-code').value = settings.base.code;
  $('#base-symbol').value = settings.base.symbol;
  $('#alt1-code').value = settings.others[0].code;
  $('#alt1-rate').value = settings.others[0].rate;
  $('#alt2-code').value = settings.others[1].code;
  $('#alt2-rate').value = settings.others[1].rate;
}

/* ---------- Form errors ---------- */

export function showFieldError(field, message) {
  const input = $(`#f-${field}`);
  const err = $(`#err-${field}`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    err.textContent = message;
    err.hidden = false;
  } else {
    input.removeAttribute('aria-invalid');
    err.textContent = '';
    err.hidden = true;
  }
}

export function clearFieldErrors(fields) {
  fields.forEach((f) => showFieldError(f, null));
}

/* ---------- Status toast ---------- */

let toastTimer;
export function announce(message) {
  const el = $('#app-status');
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-shown'), 4000);
  });
}
