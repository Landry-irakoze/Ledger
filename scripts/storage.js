export const KEYS = { records: 'ledger:records', settings: 'ledger:settings' };

export const defaults = {
  display: 'USD',
  cap: 500,
  rates: { USD: 1, EUR: 0.92, RWF: 1450 },
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other']
};

export function load(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    if (text) return JSON.parse(text);
    return fallback;
  } catch (error) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}
