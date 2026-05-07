const APEX = 'immoyield.com';

export function getCookieDomain(host: string | null | undefined): string | undefined {
  if (process.env.NODE_ENV !== 'production') return undefined;
  if (!host) return undefined;
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname === APEX || hostname.endsWith(`.${APEX}`)) {
    return `.${APEX}`;
  }
  return undefined;
}
