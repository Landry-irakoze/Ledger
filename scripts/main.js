
import { state, onChange, commit, addRecord, updateRecord, deleteRecord, replaceAll } from './state.js';
import { validateField, validateRecord, validateImport, collapse, RE } from './validators.js';
import { compileRegex } from './search.js';
import { renderTable, renderStats, renderSettings } from './ui.js';

function $(selector) {
  return document.querySelector(selector);
}

const FIELDS = ['description', 'amount', 'category', 'date'];

function say(message, isError = false) {
  const box = isError ? $('#alert') : $('#status');
  $('#alert').textContent = '';
  $('#status').textContent = '';
  setTimeout(() => { box.textContent = message; }, 30);
}


const PAGES = ['dashboard', 'records', 'add', 'settings', 'about'];

function showPage() {
  let page = location.hash.slice(1);
  if (!PAGES.includes(page)) page = 'dashboard';

  for (const name of PAGES) $('#' + name).hidden = name !== page;

  for (const link of document.querySelectorAll('nav a')) {
    if (link.getAttribute('href') === '#' + page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.title = page.charAt(0).toUpperCase() + page.slice(1) + ' - Ledger';
  $('#' + page + ' h2').focus();
}
window.addEventListener('hashchange', showPage);


function render() {
  const text = $('#q').value;
  const flags = $('#ci').checked ? 'i' : '';
  const regex = compileRegex(text, flags);
  const invalid = text !== '' && regex === null;

  $('#q').setAttribute('aria-invalid', invalid);
  $('#q-err').textContent = invalid ? 'Not a valid regular expression, showing everything.' : '';

  renderTable(regex);
  renderStats();
  renderSettings();
}
onChange(render);

$('#q').addEventListener('input', render);
$('#ci').addEventListener('change', render);

for (const button of document.querySelectorAll('[data-sort]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.sort;
    if (state.sort.key === key) state.sort.dir = -state.sort.dir;   // same column: flip direction
    else state.sort = { key: key, dir: 1 };
    render();
  });
}

function showFormErrors(errors) {
  for (const name of FIELDS) {
    $('#f-' + name).setAttribute('aria-invalid', !!errors[name]);
    $('#e-' + name).textContent = errors[name] || '';
  }
}

for (const name of FIELDS) {
  $('#f-' + name).addEventListener('blur', () => {
    let value = $('#f-' + name).value;
    if (name === 'description') value = collapse(value);
    const message = validateField(name, value, true);
    $('#f-' + name).setAttribute('aria-invalid', message !== '');
    $('#e-' + name).textContent = message;
  });
}

$('#form').addEventListener('submit', event => {
  event.preventDefault();

  const data = {};
  for (const name of FIELDS) data[name] = $('#f-' + name).value;
  data.description = collapse(data.description);

  const errors = validateRecord(data, true);
  showFormErrors(errors);

  const firstBad = FIELDS.find(name => errors[name]);
  if (firstBad) {
    say('Please fix the form. ' + errors[firstBad], true);
    $('#f-' + firstBad).focus();
    return;
  }

  data.amount = parseFloat(data.amount);
  addRecord(data);
  $('#form').reset();
  say('Added "' + data.description + '".');
  $('#f-description').focus();
});

function startEdit(id) {
  state.editing = id;
  render();
  document.querySelector('[data-id="' + id + '"] input').focus();
}

function cancelEdit(id) {
  state.editing = null;
  render();
  const button = document.querySelector('[data-id="' + id + '"] [data-act=edit]');
  if (button) button.focus();
}

function removeRow(id, description) {
  if (!confirm('Delete "' + description + '"?')) return;
  state.editing = null;
  deleteRecord(id);
  say('Transaction deleted.');
  $('#records h2').focus();
}

function saveEdit(id, row) {
  const data = {};
  for (const input of row.querySelectorAll('input')) data[input.name] = input.value;
  data.description = collapse(data.description);

  const errors = validateRecord(data, true);
  for (const input of row.querySelectorAll('input')) {
    input.setAttribute('aria-invalid', !!errors[input.name]);
  }

  const firstBad = FIELDS.find(name => errors[name]);
  if (firstBad) {
    row.querySelector('[data-err]').textContent = errors[firstBad];
    row.querySelector('[name=' + firstBad + ']').focus();
    return;
  }

  data.amount = parseFloat(data.amount);
  state.editing = null;
  updateRecord(id, data);
  say('Transaction updated.');
  const button = document.querySelector('[data-id="' + id + '"] [data-act=edit]');
  if (button) button.focus();
}

$('#rows').addEventListener('click', event => {
  const button = event.target.closest('[data-act]');
  if (!button) return;

  const row = button.closest('tr');
  const id = row.dataset.id;
  const record = state.records.find(r => r.id === id);
  const action = button.dataset.act;

  if (action === 'edit') startEdit(id);
  if (action === 'cancel') cancelEdit(id);
  if (action === 'del') removeRow(id, record.description);
  if (action === 'save') saveEdit(id, row);
});

// Enter = save, Escape = cancel (while editing a row)
$('#rows').addEventListener('keydown', event => {
  const row = event.target.closest('tr.editing');
  if (!row) return;
  if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
    event.preventDefault();
    row.querySelector('[data-act=save]').click();
  }
  if (event.key === 'Escape') row.querySelector('[data-act=cancel]').click();
});

$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const problems = [];

  const eur = $('#rate-eur').value.trim();
  const rwf = $('#rate-rwf').value.trim();
  const cap = $('#cap').value.trim();
  if (!RE.rate.test(eur)) problems.push('EUR rate must be a number above 0.');
  if (!RE.rate.test(rwf)) problems.push('RWF rate must be a number above 0.');
  if (!RE.amount.test(cap)) problems.push('Cap must be a number like 500 or 500.00.');

  const categories = [];
  for (const part of $('#categories').value.split(',')) {
    const name = collapse(part.trim());
    if (name === '' || categories.includes(name)) continue;
    const message = validateField('category', name);
    if (message) problems.push('Category "' + name + '": ' + message);
    categories.push(name);
  }
  if (categories.length === 0) problems.push('Add at least one category.');

  $('#settings-err').textContent = problems.join(' ');
  if (problems.length > 0) {
    say('Settings not saved.', true);
    return;
  }

  state.settings.rates = { USD: 1, EUR: Number(eur), RWF: Number(rwf) };
  state.settings.cap = Number(cap);
  state.settings.categories = categories;
  state.settings.display = $('#display').value;
  commit();
  say('Settings saved.');
});

$('#export').addEventListener('click', () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    records: state.records
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ledger-export.json';
  link.click();
  URL.revokeObjectURL(link.href);
  say('Exported ' + state.records.length + ' transactions.');
});

$('#import').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const result = validateImport(JSON.parse(text));

    if (result.errors.length > 0) {
      say('Import failed. ' + result.errors.length + ' problem(s). ' + result.errors.slice(0, 3).join(' '), true);
    } else if (confirm('Replace current data with ' + result.records.length + ' imported transactions?')) {
      replaceAll(result.records);
      say('Imported ' + result.records.length + ' transactions.');
    }
  } catch (error) {
    say('Import failed. That file is not valid JSON.', true);
  }
  event.target.value = '';     
});

async function loadSeed() {
  try {
    const response = await fetch('seed.json');
    if (response.ok) return await response.json();
    return [];
  } catch (error) {
    return [];
  }
}

$('#reset').addEventListener('click', async () => {
  if (!confirm('Replace all data with the seed records?')) return;
  replaceAll(await loadSeed());
  say('Seed data restored.');
});

async function start(){
  if (state.records === null) state.records = await loadSeed();
  showPage();
}
start();
