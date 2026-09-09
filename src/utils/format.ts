/** Formatage compact des durées pour toute l'application. */

/** "1 h 05", "45 min", "3 min" */
export function formatDuree(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0) return `${m} min`;
  const mm = String(m).padStart(2, '0');
  return h > 0 && m === 0 ? `${h} h` : `${h} h ${mm}`;
}

/** "01:05:00" (format chrono) */
export function formatChrono(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const deux = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${deux(h)}:${deux(m)}:${deux(s)}` : `${deux(m)}:${deux(s)}`;
}

/** "08:30" -> "8 h 30" ; "14:05" -> "14 h 05" */
export function formatHeureTexte(heure: string): string {
  const [h, m] = heure.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return heure;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
