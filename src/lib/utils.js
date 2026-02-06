export function uid() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function el(id) {
  return document.getElementById(id);
}

export function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString()}`;
}

export function esc(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export const flip = c => [c[1], c[0]];
