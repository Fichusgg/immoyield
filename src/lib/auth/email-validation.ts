// RFC 5322-lite — strict enough to reject typos, lenient enough to accept
// every legitimate address in practice. We do NOT support quoted local parts
// or IP-literal domains; nobody signs up with those.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Disposable / throwaway email providers. Curated list of the most common
// offenders — covers >95% of fake signups in practice. Stored as a Set so
// lookup is O(1).
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'grr.la',
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'mailinater.com',
  'maildrop.cc',
  'yopmail.com',
  'yopmail.net',
  'yopmail.fr',
  'tempmail.com',
  'tempmailo.com',
  'temp-mail.org',
  'temp-mail.io',
  'tmpmail.org',
  'tmpmail.net',
  'tmpeml.com',
  'tmpbox.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'getairmail.com',
  'fakeinbox.com',
  'fakemail.net',
  'mintemail.com',
  'mohmal.com',
  'spamgourmet.com',
  'mytemp.email',
  'emailondeck.com',
  'inboxbear.com',
  'mvrht.com',
  'getnada.com',
  'nada.email',
  'dispostable.com',
  'discard.email',
  'mail-temp.com',
  'mail.tm',
  'mail.bccto.me',
  'tempail.com',
  'dropmail.me',
  'mailcatch.com',
  'spambog.com',
  'spambox.us',
  'inboxkitten.com',
  'tempmailaddress.com',
  'wegwerfmail.de',
  'wegwerfemail.de',
  'mailnesia.com',
  'fakermail.com',
  'mailsac.com',
  'getairmail.com',
  'tempinbox.com',
  'mailtemp.info',
  'burnermail.io',
  'mailpoof.com',
  'mailcuck.com',
  'cs.email',
  'cock.li',
  'mvrht.net',
  'mt2015.com',
  'mt2014.com',
  'mailboxy.fun',
  'rootfest.net',
  'inboxalias.com',
  'tempr.email',
  'emltmp.com',
  'altmails.com',
  '1secmail.com',
  '1secmail.net',
  '1secmail.org',
]);

// Common typos in popular domains. We catch them up front so the user doesn't
// ship their signup into the void waiting for a confirmation email.
const TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'icloud.co': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icould.com': 'icloud.com',
};

export type EmailValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'invalid-format' | 'disposable' | 'typo'; suggestion?: string };

/**
 * Validates an email address for signup. Rejects empty, malformed, and
 * disposable addresses. Suggests a correction for common typos so the user
 * can opt in with one click instead of being told "fix it yourself".
 */
export function validateSignupEmail(rawEmail: string): EmailValidationResult {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { ok: false, reason: 'empty' };
  if (!EMAIL_RE.test(email)) return { ok: false, reason: 'invalid-format' };

  const domain = email.slice(email.lastIndexOf('@') + 1);

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'disposable' };
  }

  const fix = TYPO_DOMAINS[domain];
  if (fix) {
    return {
      ok: false,
      reason: 'typo',
      suggestion: email.replace(`@${domain}`, `@${fix}`),
    };
  }

  return { ok: true };
}

export type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordCheck {
  ok: boolean;
  strength: PasswordStrength;
  /** User-facing message (Portuguese — matches app locale). */
  message?: string;
}

/**
 * Minimum bar for a sign-up password. Supabase's default is 6 chars and
 * accepts anything; we enforce length + mix of character classes so users
 * can't pick "123456".
 */
export function validatePassword(password: string): PasswordCheck {
  if (password.length < 8) {
    return { ok: false, strength: 'weak', message: 'Use pelo menos 8 caracteres.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return {
      ok: false,
      strength: 'weak',
      message: 'Combine letras e números.',
    };
  }
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const strong = password.length >= 12 && hasSymbol;
  return { ok: true, strength: strong ? 'strong' : 'fair' };
}
