const MEGA_HOSTS = new Set(["mega.nz", "www.mega.nz"]);

export function isMegaShareUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return MEGA_HOSTS.has(url.hostname) && url.pathname.startsWith("/file/");
  } catch {
    return false;
  }
}

export function isLocalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

export function toDisplayImageUrl(value: string): string {
  // Route both MEGA.nz URLs and local paths through the media API
  if (isMegaShareUrl(value) || isLocalPath(value)) {
    return `/api/media?src=${encodeURIComponent(value)}`;
  }

  return value;
}
