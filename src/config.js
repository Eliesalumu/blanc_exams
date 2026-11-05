export const CATEGORIES = {
  gouvernance: { label: 'Gouvernance & PCA', short: 'GV', count: 16, color: '#5278ad' },
  onatra: { label: 'ONATRA & Logistique', short: 'TR', count: 14, color: '#408a79' },
  finance: { label: 'Finance & KPI', short: 'FI', count: 12, color: '#c08a44' },
  strategie: { label: 'Stratégie & Risques', short: 'ST', count: 13, color: '#8170a8' },
  quantitatif: { label: 'Analyse quantitative', short: 'NU', count: 6, color: '#5278ad' },
  communication: { label: 'Communication professionnelle', short: 'CP', count: 4, color: '#408a79' },
};
export const DURATION = 60 * 60 * 1000;
export const BANK_VERSION = '2026-10-31-pca-v2';
export const SUBSCRIPTION_EXPIRY = '2026-11-06';
export const percent = (correct, total) => total ? correct * 100 / total : 0;
export const fmt = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
