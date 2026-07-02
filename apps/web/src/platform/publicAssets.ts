const ROOT_BASES = new Set(["", "/", "./"]);

function isExternalUrl(path: string) {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path) || /^(?:data|blob):/i.test(path);
}

function normalizeBase(base: string) {
  const trimmed = base.trim();
  if (ROOT_BASES.has(trimmed)) return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function withPublicAssetBase(path: string, base: string) {
  if (!path || isExternalUrl(path)) return path;

  const normalizedBase = normalizeBase(base);
  if (!normalizedBase) return path;
  if (path === normalizedBase || path.startsWith(`${normalizedBase}/`)) return path;

  return `${normalizedBase}/${path.replace(/^\/+/, "")}`;
}

export function publicAssetUrl(path: string) {
  return withPublicAssetBase(path, import.meta.env?.BASE_URL ?? "/");
}
