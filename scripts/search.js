// search.js  searching, highlighting matches, filtering and sorting.

// Turn what the user typed into a search pattern. Gives back nothing if it's empty or broken (it never crashes).
export function compileRegex(input, flags = 'i') {
  try {
    return input ? new RegExp(input, flags) : null;
  } catch {
    return null;
  }
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

// Wrap matches in <mark> to highlight them. Cleans the text first so an entry can't break the page.
// Empty matches are skipped.
export function highlight(text, re) {
  const safe = escapeHtml(text);
  if (!re) return safe;
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const global = new RegExp(re.source, flags);
  return safe.replace(global, (m) => (m ? `<mark>${m}</mark>` : m));
}

// Keep entries whose description, category or date matches.
// Use a plain copy of the pattern so the check works on every row.
export function filterRecords(records, re) {
  if (!re) return [...records];
  const probe = new RegExp(re.source, re.flags.replace(/g/g, ''));
  return records.filter(
    (r) => probe.test(r.description) || probe.test(r.category) || probe.test(r.date)
  );
}

export const SORTS = {
  'created-desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
  'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
  'description-asc': (a, b) =>
    a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }),
  'description-desc': (a, b) =>
    b.description.localeCompare(a.description, undefined, { sensitivity: 'base' }),
  'amount-desc': (a, b) => b.amount - a.amount,
  'amount-asc': (a, b) => a.amount - b.amount,
};

// Give back a sorted copy (don't change the original).
export function sortRecords(records, key) {
  const cmp = SORTS[key] || SORTS['created-desc'];
  return [...records].sort(cmp);
}
