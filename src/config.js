export const CATEGORIES = {
  francais: { label: 'Français', short: 'FR', count: 16, color: '#5278ad' },
  mathematiques: { label: 'Mathématiques', short: 'MA', count: 14, color: '#c08a44' },
  logique: { label: 'Logique & psychotechnique', short: 'LO', count: 20, color: '#8170a8' },
  culture: { label: 'Culture générale africaine', short: 'CG', count: 15, color: '#408a79' },
};
export const DURATION = 60 * 60 * 1000;
export const BANK_VERSION = '2026-10-31-v1';
export const percent = (correct, total) => total ? correct * 100 / total : 0;
export const fmt = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
