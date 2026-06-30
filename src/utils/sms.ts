/**
 * OTP retrieval for the automated happy path.
 *
 * A headless browser can't read an SMS, so to fully automate phone+OTP login we
 * need the code from somewhere. Two strategies, picked automatically from env:
 *
 *   1. Static code  — ARI_TEST_OTP, for a whitelisted test number whose code is
 *                     fixed on staging/beta (e.g. "000000").
 *   2. Twilio       — TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, when ARI_TEST_PHONE
 *                     is a Twilio number that RECEIVES the OTP SMS. Polls the
 *                     Twilio REST API for the newest inbound 6-digit code.
 *
 * Add another provider by implementing OtpRetriever and returning it from
 * getOtpRetriever().
 */

export interface OtpRetriever {
  readonly kind: string;
  /**
   * Resolve the OTP code. `sinceEpochMs` lets providers ignore codes that
   * arrived before the current attempt (avoids reusing a stale SMS).
   */
  fetchCode(sinceEpochMs: number): Promise<string>;
}

/** A fixed code (whitelisted test number). */
class StaticOtpRetriever implements OtpRetriever {
  readonly kind = 'static';
  constructor(private readonly code: string) {}
  async fetchCode(): Promise<string> {
    return this.code;
  }
}

/** Polls Twilio for the most recent inbound 6-digit code sent to a number. */
class TwilioOtpRetriever implements OtpRetriever {
  readonly kind = 'twilio';
  private readonly digitPattern = /\b(\d{6})\b/;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly toNumberE164: string,
    private readonly opts: { timeoutMs?: number; intervalMs?: number } = {}
  ) {}

  async fetchCode(sinceEpochMs: number): Promise<string> {
    const timeoutMs = this.opts.timeoutMs ?? 45_000;
    const intervalMs = this.opts.intervalMs ?? 3_000;
    // Small backdate buffer to tolerate clock skew between us and Twilio.
    const cutoff = sinceEpochMs - 15_000;
    const deadline = Date.now() + timeoutMs;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const url =
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json` +
      `?To=${encodeURIComponent(this.toNumberE164)}&PageSize=20`;

    let lastErr = '';
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
        if (!res.ok) {
          lastErr = `Twilio API ${res.status} ${res.statusText}`;
        } else {
          const data = (await res.json()) as { messages?: TwilioMessage[] };
          const inbound = (data.messages ?? [])
            .filter((m) => (m.direction ?? '').includes('inbound'))
            .filter((m) => {
              const sent = Date.parse(m.date_sent || m.date_created || '');
              return Number.isNaN(sent) ? true : sent >= cutoff;
            })
            .sort((a, b) => Date.parse(b.date_sent || b.date_created || '') - Date.parse(a.date_sent || a.date_created || ''));

          for (const m of inbound) {
            const match = (m.body ?? '').match(this.digitPattern);
            if (match) return match[1];
          }
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
      await delay(intervalMs);
    }
    throw new Error(
      `Twilio: no 6-digit OTP received on ${this.toNumberE164} within ${timeoutMs}ms` +
        (lastErr ? ` (last error: ${lastErr})` : '')
    );
  }
}

interface TwilioMessage {
  body?: string;
  direction?: string;
  date_sent?: string;
  date_created?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Digits-only national number → E.164 (US +1 by default). */
export function toE164(digits: string, countryCode = '1'): string {
  const clean = digits.replace(/\D/g, '');
  return clean.startsWith(countryCode) && clean.length > 10 ? `+${clean}` : `+${countryCode}${clean}`;
}

/**
 * Pick a retriever from the environment, or null if none is configured (the
 * happy-path tests then skip). Twilio takes precedence over a static code.
 */
export function getOtpRetriever(): OtpRetriever | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const phoneDigits = (process.env.ARI_TEST_PHONE ?? '').replace(/\D/g, '');
  if (sid && token && phoneDigits.length >= 10) {
    return new TwilioOtpRetriever(sid, token, toE164(phoneDigits, process.env.ARI_COUNTRY_CODE || '1'));
  }
  const staticCode = (process.env.ARI_TEST_OTP ?? '').replace(/\D/g, '');
  if (staticCode.length > 0) {
    return new StaticOtpRetriever(staticCode);
  }
  return null;
}

/** True when SOME retriever is configured. */
export function hasOtpRetriever(): boolean {
  return getOtpRetriever() !== null;
}
