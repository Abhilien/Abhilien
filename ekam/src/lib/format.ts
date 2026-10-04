const DAY = 86_400_000;

export function relDays(fromIso: string, nowIso: string): string {
  const d = Math.floor((new Date(nowIso).getTime() - new Date(fromIso).getTime()) / DAY);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
