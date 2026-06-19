// validators.js — all the form's rules for checking what you type.
// Each check gives back nothing if it's fine, or a message if something's wrong.

export const RULES = {
  // No spaces at the start or end (a single character is fine too).
  noEdgeSpaces: /^\S(?:.*\S)?$/,
  // Reject two or more spaces in a row.
  doubleSpaces: /\s{2,}/,
  // Money: no zero in front, and up to 2 decimals.
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // Must look exactly like YYYY-MM-DD.
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Letters only, with single spaces or hyphens between words.
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // Catches the same word typed twice by mistake, like "the the".
  repeatedWord: /\b(\w+)\s+\1\b/i,
};

export function validateDescription(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Write a short description of the expense.';
  }
  if (!RULES.noEdgeSpaces.test(value)) {
    return 'Remove spaces from the start and end of the description.';
  }
  if (RULES.doubleSpaces.test(value)) {
    return 'Use single spaces between words (double space found).';
  }
  const dup = value.match(RULES.repeatedWord);
  if (dup) {
    return `Repeated word found: “${dup[1]} ${dup[1]}”. Remove the duplicate.`;
  }
  return null;
}

export function validateAmount(value) {
  const str = String(value ?? '');
  if (!RULES.amount.test(str)) {
    return 'Enter a valid amount like 12.50 — no leading zeros, at most 2 decimals.';
  }
  return null;
}

export function validateDate(value) {
  if (!RULES.date.test(String(value ?? ''))) {
    return 'Use the format YYYY-MM-DD, e.g. 2026-06-11.';
  }
  return null;
}

export function validateCategory(value) {
  if (!RULES.category.test(String(value ?? ''))) {
    return 'Categories use letters only, with single spaces or hyphens.';
  }
  return null;
}

// Check the whole form. Lists any problems per field; empty means all good.
export function validateTransaction({ description, amount, category, date }) {
  const errors = {};
  const d = validateDescription(description);
  if (d) errors.description = d;
  const a = validateAmount(amount);
  if (a) errors.amount = a;
  const c = validateCategory(category);
  if (c) errors.category = c;
  const dt = validateDate(date);
  if (dt) errors.date = dt;
  return errors;
}
