const MEGA_HOSTS = new Set(["mega.nz", "www.mega.nz"]);

export function isMegaShareUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return MEGA_HOSTS.has(url.hostname) && url.pathname.startsWith("/file/");
  } catch {
    return false;
  }
}

export function toDisplayImageUrl(value: string): string {
  if (!isMegaShareUrl(value)) {
    return value;
  }

  return `/api/media?src=${encodeURIComponent(value)}`;
}
