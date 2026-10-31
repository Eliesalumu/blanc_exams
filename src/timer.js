import { DURATION } from './config.js';
export function remaining(deadline, now = Date.now()) { return Math.max(0, deadline - now); }
export function formatTime(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function timerLevel(ms) { return ms <= 60000 ? 'critical' : ms <= 300000 ? 'urgent' : ms <= 600000 ? 'notice' : ''; }
export function startClock(deadline, onTick, onExpire, { now = Date.now, schedule = setInterval, cancel = clearInterval } = {}) {
  let expired = false, handle;
  const tick = () => {
    const ms = remaining(deadline, now());
    onTick(ms, timerLevel(ms));
    if (!ms && !expired) { expired = true; if (handle !== undefined) cancel(handle); onExpire(); }
  };
  tick();
  if (!expired) handle = schedule(tick, 250);
  return () => { if (handle !== undefined) cancel(handle); };
}
export const newDeadline = (now = Date.now()) => now + DURATION;
