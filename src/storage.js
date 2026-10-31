import { BANK_VERSION } from './config.js';
export const STORAGE_KEY = 'cap70.progress.v1';
export const emptyProgress = () => ({ version: BANK_VERSION, attempts: [], active: null });
export function loadProgress(storage) {
  try {
    storage ??= globalThis.localStorage;
    const data = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!data || data.version !== BANK_VERSION || !Array.isArray(data.attempts)) return { data: emptyProgress(), warning: data ? 'Une ancienne sauvegarde incompatible a été ignorée.' : null };
    if (data.active) {
      const a=data.active;
      if (!Array.isArray(a.ids) || a.ids.length!==65 || new Set(a.ids).size!==65 || !Number.isFinite(a.deadline) || !Number.isFinite(a.startedAt) || a.deadline-a.startedAt!==3600000 || !a.answers || typeof a.answers!=='object' || !Array.isArray(a.marked) || !Number.isInteger(a.index) || a.index<0 || a.index>64 || !Number.isInteger(a.day) || a.day<1 || a.day>5) throw new Error('Sauvegarde invalide');
      if(Object.entries(a.answers).some(([id,value])=>!a.ids.includes(id)||!Number.isInteger(value)||value<0||value>3)||a.marked.some(id=>!a.ids.includes(id)))throw new Error('Réponses sauvegardées invalides');
    }
    if (!data.attempts.every(a => a && a.result && Array.isArray(a.ids) && a.answers && Number.isFinite(a.result.percentage))) throw new Error('Résultats invalides');
    return { data, warning: null };
  } catch { return { data: emptyProgress(), warning: 'La sauvegarde locale est indisponible ou illisible. Exportez régulièrement vos résultats.' }; }
}
export function saveProgress(data, storage) {
  try { storage ??= globalThis.localStorage; storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { return false; }
}
