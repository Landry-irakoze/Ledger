export const RE = {
  desc: /^\S(?:.*\S)?$/, 
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,                     
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,     
  cat: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,                      
  dup: /\b(\w+)\s+\1\b/i,                                    
  rate: /^(?=.*[1-9])\d+(\.\d+)?$/                           
};

export function collapse(text) {
  return String(text).replace(/\s{2,}/g, ' ');
}

function isRealDate(text) {
  const date = new Date(text + 'T00:00:00Z');
  return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

export function validateField(name, value, strict = false) {
  value = String(value);

  if (name === 'description') {
    if (!RE.desc.test(value)) return 'Remove leading or trailing spaces, and do not leave it empty.';
    if (/\s{2,}/.test(value)) return 'Use single spaces between words.';
    if (strict && RE.dup.test(value)) {
      return 'Repeated word "' + value.match(RE.dup)[1] + '". Remove the duplicate.';
    }
  }
  if (name === 'amount' && !RE.amount.test(value)) {
    return 'Use a number like 12 or 12.50 (no leading zeros, max 2 decimals).';
  }
  if (name === 'date' && !(RE.date.test(value) && isRealDate(value))) {
    return 'Use a real date as YYYY-MM-DD.';
  }
  if (name === 'category' && !RE.cat.test(value)) {
    return 'Use letters, with single spaces or hyphens between words.';
  }
  return '';
}

export function validateRecord(record, strict = false) {
  const errors = {};
  const names = ['description', 'amount', 'category', 'date'];
  for (const name of names) {
    const message = validateField(name, record[name], strict);
    if (message) errors[name] = message;
  }
  return errors;
}

export function validateImport(data) {
  let list = null;
  if (Array.isArray(data)) list = data;
  else if (data && Array.isArray(data.records)) list = data.records;

  if (!list) {
    return { errors: ['File must be a list of records, or an object with a "records" list.'] };
  }

  const errors = [];
  const seenIds = [];
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const label = 'Record ' + (i + 1) + ': ';

    if (!record || typeof record !== 'object') {
      errors.push(label + 'not an object.');
      continue;
    }
    if (typeof record.id !== 'string' || record.id === '') errors.push(label + 'missing id.');
    else if (seenIds.includes(record.id)) errors.push(label + 'duplicate id ' + record.id + '.');
    else seenIds.push(record.id);

    if (typeof record.amount !== 'number') errors.push(label + 'amount must be a number.');

    const fieldErrors = validateRecord(record);
    for (const name in fieldErrors) errors.push(label + name + ': ' + fieldErrors[name]);

    if (isNaN(Date.parse(record.createdAt))) errors.push(label + 'createdAt must be a timestamp.');
    if (isNaN(Date.parse(record.updatedAt))) errors.push(label + 'updatedAt must be a timestamp.');
  }
  return { errors: errors, records: list };
}
