
import { state } from './state.js';
import { highlight, matches, esc } from './search.js';

function $(selector) {
  return document.querySelector(selector);
}


function getRate(currency) {
  if (currency === 'USD') return 1;
  return Number(state.settings.rates[currency]) || 1;
}

export function money(amountInUsd) {
  const currency = state.settings.display;
  const converted = amountInUsd * getRate(currency);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(converted);
}


function getVisibleRecords(regex) {
  const list = state.records.filter(record => matches(record, regex));
  const key = state.sort.key;
  const dir = state.sort.dir;

  list.sort((a, b) => {
    if (typeof a[key] === 'number') return (a[key] - b[key]) * dir;
    return String(a[key]).localeCompare(String(b[key])) * dir;
  });
  return list;
}

function normalRow(record, regex) {
  const converted = state.settings.display !== 'USD' ? '<small>(' + esc(money(record.amount)) + ')</small>' : '';
  return `<tr data-id="${esc(record.id)}">
    <td data-label="Date">${highlight(record.date, regex)}</td>
    <td data-label="Description">${highlight(record.description, regex)}</td>
    <td data-label="Category">${highlight(record.category, regex)}</td>
    <td data-label="Amount"><span>${highlight(record.amount.toFixed(2), regex)}${converted}</span></td>
    <td data-label="Actions"><span>
      <button type="button" data-act="edit">Edit<span class="sr"> ${esc(record.description)}</span></button>
      <button type="button" data-act="del">Delete<span class="sr"> ${esc(record.description)}</span></button>
    </span></td>
  </tr>`;
}

function editRow(record) {
  return `<tr class="editing" data-id="${esc(record.id)}">
    <td data-label="Date"><input name="date" aria-label="Date" value="${esc(record.date)}"></td>
    <td data-label="Description"><input name="description" aria-label="Description" value="${esc(record.description)}"></td>
    <td data-label="Category"><input name="category" aria-label="Category" list="cats" value="${esc(record.category)}"></td>
    <td data-label="Amount"><input name="amount" aria-label="Amount in USD" inputmode="decimal" value="${record.amount.toFixed(2)}"></td>
    <td data-label="Actions"><span>
      <button type="button" class="primary" data-act="save">Save</button>
      <button type="button" data-act="cancel">Cancel</button>
    </span><span class="err" role="alert" data-err></span></td>
  </tr>`;
}

export function renderTable(regex) {
  const list = getVisibleRecords(regex);
  let html = '';
  for (const record of list) {
    if (record.id === state.editing) html += editRow(record);
    else html += normalRow(record, regex);
  }
  if (html === '') html = '<tr><td class="empty">No transactions match. Add one or clear the search.</td></tr>';

  $('#rows').innerHTML = html;
  $('#count').textContent = list.length + ' of ' + state.records.length + ' transactions';

  for (const button of document.querySelectorAll('[data-sort]')) {
    const name = button.dataset.sort;
    const active = name === state.sort.key;
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    let arrow = '';
    if (active) arrow = state.sort.dir === 1 ? ' \u2191' : ' \u2193';
    button.textContent = label + arrow;
    button.setAttribute('aria-pressed', active);
  }
}

let lastCapMessage = '';

function renderNumbers(total) {
  $('#s-count').textContent = state.records.length;
  $('#s-sum').textContent = money(total);

  const totals = {};
  for (const record of state.records) {
    totals[record.category] = (totals[record.category] || 0) + record.amount;
  }
  let topName = '';
  let topTotal = 0;
  for (const name in totals) {
    if (totals[name] > topTotal) {
      topName = name;
      topTotal = totals[name];
    }
  }
  $('#s-top').textContent = topName ? topName + ' (' + money(topTotal) + ')' : 'None yet';
}

function renderCap(total) {
  const cap = Number(state.settings.cap) || 0;
  const left = cap - total;
  const isOver = left < 0;


  const percent = cap > 0 ? Math.min(100, (total / cap) * 100) : 0;
  $('#meter-fill').style.width = percent + '%';
  $('#meter-fill').classList.toggle('over', isOver);

  let message = money(left) + ' left under your ' + money(cap) + ' cap.';
  if (isOver) message = 'Over your ' + money(cap) + ' cap by ' + money(-left) + '.';

  if (message !== lastCapMessage) {
    lastCapMessage = message;
    $('#cap-polite').textContent = isOver ? '' : message;
    $('#cap-assertive').textContent = isOver ? message : '';
  }
}

function renderTrend() {
  const box = $('#trend');
  box.innerHTML = '';

  let newest = '';
  for (const record of state.records) {
    if (record.date > newest) newest = record.date;
  }
  if (newest === '') {
    $('#trend-note').textContent = 'Add a transaction to see your trend.';
    return;
  }

  const days = [];
  for (let back = 6; back >= 0; back--) {
    const day = new Date(newest + 'T00:00:00Z');
    day.setUTCDate(day.getUTCDate() - back);
    const key = day.toISOString().slice(0, 10);

    let sum = 0;
    for (const record of state.records) {
      if (record.date === key) sum += record.amount;
    }
    const name = day.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    days.push({ name: name, sum: sum });
  }

  let biggest = 1;
  for (const day of days) {
    if (day.sum > biggest) biggest = day.sum;
  }

  let html = '';
  let summary = '';
  for (const day of days) {
    const height = (day.sum / biggest) * 80;
    html += '<div class="bar"><i style="--h:' + height + '%"></i><span>' + day.name + '</span></div>';
    summary += day.name + ' ' + money(day.sum) + ', ';
  }
  box.innerHTML = html;
  box.setAttribute('aria-label', 'Spending, 7 days ending ' + newest + ': ' + summary);
  $('#trend-note').textContent = '7 days ending ' + newest + ' (the newest transaction).';
}

export function renderStats() {
  let total = 0;
  for (const record of state.records) total += record.amount;
  renderNumbers(total);
  renderCap(total);
  renderTrend();
}

export function renderSettings() {
  const s = state.settings;
  $('#rate-eur').value = s.rates.EUR;
  $('#rate-rwf').value = s.rates.RWF;
  $('#display').value = s.display;
  $('#cap').value = s.cap;
  $('#categories').value = s.categories.join(', ');

  let options = '';
  for (const category of s.categories) options += '<option value="' + esc(category) + '">';
  $('#cats').innerHTML = options;
}