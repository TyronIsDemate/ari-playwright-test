import { fictionalPhone, VALID_PHONE_DIGITS } from '../utils/helpers.js';
import { getOtpRetriever, hasOtpRetriever } from '../utils/sms.js';

/**
 * Centralized test data and credential resolution for Ari's phone + OTP auth.
 * Real values come from the environment (.env locally, GitHub Secrets in CI).
 */

export const config = {
  /** Allow tests to actually click "Send code"/"Continue" (sends real SMS). */
  allowOtpFlow: process.env.ARI_ALLOW_OTP_FLOW === 'true',
};

export const credentials = {
  /** Dedicated test phone for the happy path (digits only). */
  testPhone: (process.env.ARI_TEST_PHONE ?? '').replace(/\D/g, ''),

  /** Static OTP for a whitelisted test number, when the env supports one. */
  testOtp: (process.env.ARI_TEST_OTP ?? '').replace(/\D/g, ''),

  /** A number known to already have an account. Defaults to the test phone. */
  registeredPhone: ((process.env.ARI_REGISTERED_PHONE || process.env.ARI_TEST_PHONE) ?? '').replace(/\D/g, ''),
};

/**
 * Happy-path login/signup is runnable when the flow is opted in, we have a test
 * number, and SOME way to obtain the code (static ARI_TEST_OTP or Twilio).
 */
export function canRunFullOtp(): boolean {
  return config.allowOtpFlow && credentials.testPhone.length >= 10 && hasOtpRetriever();
}

/** Resolve the OTP code for the current attempt via the configured retriever. */
export async function resolveOtp(sinceEpochMs: number): Promise<string> {
  const retriever = getOtpRetriever();
  if (!retriever) throw new Error('No OTP retriever configured (set ARI_TEST_OTP or Twilio env vars)');
  return retriever.fetchCode(sinceEpochMs);
}

/** OTP-screen (send-code) tests are runnable when the flow is opted into. */
export function canSendCode(): boolean {
  return config.allowOtpFlow;
}

/** A complete, well-formed number for enable-state checks (no SMS sent). */
export const validPhoneDigits = VALID_PHONE_DIGITS;

/** Fresh fictional number for opt-in OTP tests so no real subscriber is messaged. */
export { fictionalPhone };

/** Wrong OTP code for negative tests. */
export const wrongOtp = '000000';

/** Strings used in negative / abuse tests. */
export const maliciousInputs = {
  sqlInjection: "1' OR '1'='1",
  xss: '<script>alert(1)</script>',
  longDigits: '9'.repeat(40),
};
