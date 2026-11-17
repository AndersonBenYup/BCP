const KEY = 'cola-justa:device';

/**
 * Identificador anónimo del cliente. Se guarda por pestaña (sessionStorage)
 * para que en la demo cada pestaña actúe como una persona distinta.
 */
export function getDeviceId(): string {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const id = `p-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return 'p-anonimo';
  }
}
