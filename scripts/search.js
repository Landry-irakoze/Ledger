export function compileRegex(input, flags = 'i') {
  try {
    if (input) return new RegExp(input, flags);
    return null;
  } catch (error) {
    return null;
  }
}

export function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


export function highlight(text, regex) {
  text = String(text);
  if (!regex) return esc(text);

  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  const finder = new RegExp(regex.source, flags);

  let result = '';
  let position = 0;
  let match = finder.exec(text);
  while (match) {
    if (match[0] === '') {
      finder.lastIndex++;              
    } else {
      result += esc(text.slice(position, match.index));
      result += '<mark>' + esc(match[0]) + '</mark>';
      position = match.index + match[0].length;
    }
    match = finder.exec(text);
  }
  return result + esc(text.slice(position));
}

export function matches(record, regex) {
  if (!regex) return true;
  const fields = [record.description, record.category, record.date, record.amount.toFixed(2)];
  for (const field of fields) {
    regex.lastIndex = 0;
    if (regex.test(field)) return true;
  }
  return false;
}
