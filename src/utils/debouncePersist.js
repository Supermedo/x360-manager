import { savePersisted } from './persistentStorage';

/** Debounce disk writes so bulk cover sync does not freeze the UI. */
export const createDebouncedPersist = (delayMs = 800) => {
  let timer = null;
  let pending = null;

  const flush = () => {
    if (!pending) return;
    const job = pending;
    pending = null;
    timer = null;
    savePersisted(job.key, job.data);
  };

  return (key, data) => {
    pending = { key, data };
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };
};
