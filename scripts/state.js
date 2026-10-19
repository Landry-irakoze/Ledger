import { load, save, KEYS, defaults } from './storage.js';

const savedSettings = load(KEYS.settings, {});

export const state = {
  records: load(KEYS.records, null),  
  settings: {
    display: savedSettings.display || defaults.display,
    cap: savedSettings.cap === undefined ? defaults.cap : savedSettings.cap,
    rates: savedSettings.rates || defaults.rates,
    categories: savedSettings.categories || defaults.categories
  },
  sort: { key: 'date', dir: -1 },
  editing: null      
};

const listeners = [];
export function onChange(fn) {
  listeners.push(fn);
}

export function commit() {
  save(KEYS.records, state.records);
  save(KEYS.settings, state.settings);
  for (const fn of listeners) fn();
}

function nextId() {
  let biggest = 0;
  for (const record of state.records) {
    const number = parseInt(record.id.replace('rec_', ''), 10);
    if (number > biggest) biggest = number;
  }
  return 'rec_' + String(biggest + 1).padStart(4, '0');
}

export function addRecord(data) {
  const now = new Date().toISOString();
  state.records.push({
    id: nextId(),
    description: data.description,
    amount: data.amount,
    category: data.category,
    date: data.date,
    createdAt: now,
    updatedAt: now
  });
  commit();
}

export function updateRecord(id, data) {
  for (const record of state.records) {
    if (record.id === id) {
      record.description = data.description;
      record.amount = data.amount;
      record.category = data.category;
      record.date = data.date;
      record.updatedAt = new Date().toISOString();
    }
  }
  commit();
}

export function deleteRecord(id) {
  state.records = state.records.filter(record => record.id !== id);
  commit();
}

export function replaceAll(list) {
  state.records = list;
  state.editing = null;
  commit();
}
