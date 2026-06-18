// validators.js — all the form's regex rules in one place.
// Each check returns null if valid, or an error message if not.

export const RULES = {
  // No leading or trailing whitespace (single non-space char is also valid).
  noEdgeSpaces: /^\S(?:.*\S)?$/,
  // Two or more consecutive whitespace characters → reject.
  doubleSpaces: /\s{2,}/,
  // Money: no leading zeros, optional 1–2 decimal places.
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // Strict YYYY-MM-DD calendar shape.
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Letters with single spaces or hyphens between words.
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // Advanced: back-reference catches an accidentally repeated word ("the the").
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

// Check the whole form. Returns errors per field; empty means all good.
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
