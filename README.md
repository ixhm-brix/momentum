# Momentum — Student Finance Tracker

> **Live app:** https://ixhm-brix.github.io/momentum/
> **Wireframe & data-model:** https://canva.link/kzdrgmjwtnqmhie
> **Demo video:** https://youtu.be/JCxqR_vWNvk

**Theme: Student Finance Tracker.** Momentum is a browser app for students to log
expenses, search them with regular expressions, watch the week's spending, and get
flagged when they go over budget. It's styled like a hand-kept paper ledger and
works in Rwandan francs.

Built with plain **HTML, CSS and JavaScript** 

---

## Features

- **Dashboard** — total spent, entry count, top category, conversions to two other
  currencies, and a 7-day bar chart built with plain CSS/JS.
- **Transactions** — live regex search (never crashes on a bad pattern; ✓/✗
  indicator and a case toggle), match highlighting, and six sort orders. A table on
  desktop, cards on mobile.
- **Add / Edit** — validated form with inline errors; focus jumps to the first bad
  field. IDs auto-generate; `createdAt` is set once, `updatedAt` on every edit.
- **Settings** — monthly cap, base currency + two more (manual rates), editable
  categories, and JSON import / export (imports are checked first).
- **Spending cap** — under the cap, the remaining amount is announced politely; over
  it, an urgent alert fires and an **OVER BUDGET** stamp appears.
- **Saved automatically** to the browser on every change; the first visit loads
  `seed.json`.
- **Responsive & accessible** — mobile-first (768px / 1024px), semantic landmarks,
  bound labels, skip link, visible focus rings, live regions, WCAG AA contrast.
  Works with the keyboard alone.

---

## Regex catalog

**Form rules** (`scripts/validators.js`):

| Pattern | Checks | Passes | Fails |
|---------|--------|--------|-------|
| `/^\S(?:.*\S)?$/` | No spaces at the start or end | `Lunch at cafeteria` | `␣lunch` |
| `/\s{2,}/` | Rejects double spaces (invalid if it matches) | `bus to town` | `bus␣␣to town` |
| `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Money: no leading zeros, ≤2 decimals | `12.50`, `1250` | `012`, `12.555` |
| `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Date must be `YYYY-MM-DD` | `2026-06-11` | `2026-13-01` |
| `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Category: letters, single spaces/hyphens | `Side-Hustle Costs` | `Food1` |
| `/\b(\w+)\s+\1\b/i` | **Back-reference:** catches a repeated word | `tea and more tea` | `the the coffee` |

**Search patterns to try:**

| Pattern | Finds | Passes | Fails |
|---------|-------|--------|-------|
| `\.\d{2}\b` | Amounts with cents | `paid 12.50 today` | `paid 12 today` |
| `(coffee\|tea)` | Drinks (turn case-insensitive on) | `Coffee with friends` | `Bus pass` |
| `\b(\w+)\s+\1\b` | Repeated words | `fees for for lab` | `fees for the lab` |

The search box compiles your text in a `try/catch`, so a broken pattern like `(`
just shows ✗ and changes nothing. Matches are wrapped in `<mark>` only after the
text is HTML-escaped, so a record containing `<script>` can't break the page.

---

## Keyboard map

| Key | Does |
|-----|------|
| `Tab` (first press) | Reveals **Skip to content**; `Enter` jumps to the main area |
| `Tab` / `Shift+Tab` | Moves through every control in order, each with a visible focus ring |
| `Enter` on a nav tab | Switches section (Back/Forward also work) |
| `Enter` in a field | Submits the form; focus lands on the first invalid field if any |
| `Space` | Toggles the case checkbox; activates buttons (Edit / Delete / Export) |

## Accessibility

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`) and a label on
  every input.
- Inline errors use `role="alert"` + `aria-invalid`.
- The budget card has two live regions: a polite one under the cap, an assertive
  one once it's exceeded.
- Visible focus ring on everything (never removed). Chart is `role="img"` with a
  text description.
- Contrast meets WCAG AA (ink on paper ≈ 12.9:1). Animation is off under
  `prefers-reduced-motion`.

## Run the tests

Open **[tests.html](tests.html)** — it runs checks and prints ✓/✗ with a total.
It covers the validators, the safe regex compiler, highlighting, filter/sort, and
import validation.

ES modules need HTTP, so use a local server (not a double-click):

```
python -m http.server 8000   # then open http://localhost:8000/tests.html
```

## Files

```
index.html   tests.html   seed.json
styles/main.css
scripts/  app.js · state.js · storage.js · validators.js · search.js · ui.js
```

`seed.json` has 12 sample records in Rwandan francs, including a repeated-word
description, a large amount, a tiny one, and dates inside the last 7 days.

---

**Author:** F. Ishimwe · f.ishimwe1@alustudent.com · github.com/ixhm-brix
