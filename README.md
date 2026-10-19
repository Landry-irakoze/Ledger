# Ledger - Student Finance Tracker

**Theme:** Student Finance Tracker
**Live site (GitHub Pages):** https://Landry-irakoze.github.io/REPO-NAME/
**Demo video (unlisted):** ADD-LINK-HERE
**Author:** Landry Irakoze - [GitHub](https://github.com/Landry-irakoze) - you@example.com

Vanilla HTML, CSS and JavaScript (ES modules). No frameworks.

## Features
- Pages: Dashboard, Records, Add, Settings, About (hash navigation, one section visible at a time)
- Records as a table on desktop and cards on mobile; sort by date, description (A-Z) and amount; inline edit; confirmed delete
- Live regex search with an ignore-case toggle, safe compiler (try/catch) and `<mark>` highlighting (text is HTML-escaped first)
- Dashboard: total records, total spent, top category, 7-day bar chart (ends at the newest record), spending cap meter with ARIA live messages (polite under cap, assertive over cap)
- Currency: base USD plus EUR and RWF with manual rates in Settings; choose the display currency
- Auto-save to localStorage; JSON export; JSON import validated before loading; reset to `seed.json`
- Editable categories; reduced-motion support

## Regex catalog
| Where | Pattern | Example |
|---|---|---|
| Description | `^\S(?:.*\S)?$` | rejects `" Lunch"`, accepts `Lunch` |
| Doubles | `\s{2,}` collapsed to one space on save | `Bus   pass` becomes `Bus pass` |
| Amount | `^(0\|[1-9]\d*)(\.\d{1,2})?$` | `12.50` ok, `012` and `1.234` rejected |
| Date | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` plus a real-calendar check | `2024-02-29` ok, `2025-02-30` rejected |
| Category | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Fast-food stop` ok, `Food1` rejected |
| Advanced: back-reference | `\b(\w+)\s+\1\b` | form rejects `Coffee coffee` |
| Advanced: lookahead | `^(?=.*[1-9])\d+(\.\d+)?$` | exchange rate must be above 0 |

Search examples: `\.\d{2}\b` (cents present), `(coffee\|tea)`, `\b(\w+)\s+\1\b` (duplicate words, matches the seed records "Late fee fee" and "Printing printing"), `^2025-09` (month).
Note: seed records may contain duplicate words on purpose; import accepts them, but the add/edit forms enforce the back-reference rule.

## Keyboard map
| Key | Action |
|---|---|
| Tab / Shift+Tab | Move between controls; the first stop is "Skip to content" |
| Enter / Space | Activate links and buttons (sort, edit, delete, save) |
| Enter (in an edit row) | Save the row |
| Escape (in an edit row) | Cancel the edit |
| Arrow keys | Change the display currency in the Settings dropdown |

## Accessibility notes
- Landmarks: header, nav, main, section, footer; one h1, h2 per section; heading receives focus on page change
- Every input has a bound label; errors sit in `aria-describedby` spans and set `aria-invalid`
- `role="status"` (polite) and `role="alert"` (assertive) toasts; cap messages use two `aria-live` regions
- Visible 3px focus ring; colors checked for AA contrast; sort state exposed with `aria-pressed`
- Row buttons carry hidden text naming the record ("Edit Bus pass")

## Run and test
```
python3 -m http.server 8000     
```
Open http://localhost:8000 for the app and http://localhost:8000/tests.html for the assertions (22 checks on validators, search, highlight and import).

## Structure
`index.html`, `tests.html`, `seed.json`, `styles/main.css`, `scripts/{main,state,storage,ui,validators,search}.js`
