export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function avatarFor(username: string, avatarUrl: string | null): string {
  if (avatarUrl) return avatarUrl;
  const seed = encodeURIComponent(username || 'instant');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear`;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k';
  return (n / 1_000_000).toFixed(1) + 'm';
}
