import { Locator } from '@playwright/test';

/**
 * Generate a US 10-digit phone number in the reserved fictional range
 * (NXX 555-01XX) so opt-in OTP tests never message a real subscriber.
 * Returns digits only, e.g. "2015550147".
 */
export function fictionalPhone(): string {
  const area = 201; // any valid area code
  const last = 100 + Math.floor(Math.random() * 100); // 555-0100..555-0199
  return `${area}555${String(last).padStart(4, '0')}`;
}

/** Read the browser's native HTML5 constraint-validation message for an input. */
export async function nativeValidationMessage(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const input = el as HTMLInputElement;
    return typeof input.validationMessage === 'string' ? input.validationMessage : '';
  });
}

/** True if the element is marked invalid via HTML5 validity or aria-invalid. */
export async function isFieldInvalid(locator: Locator): Promise<boolean> {
  const aria = await locator.getAttribute('aria-invalid');
  if (aria === 'true') return true;
  return locator.evaluate((el) => {
    const input = el as HTMLInputElement;
    return typeof input.checkValidity === 'function' ? !input.checkValidity() : false;
  });
}

/**
 * Phone strings that the app must NOT accept as a complete, valid number
 * (the submit button must stay disabled). The expected formatted mask after
 * typing is included where the tel mask is deterministic.
 */
export const INVALID_PHONES: { value: string; label: string }[] = [
  { value: '', label: 'empty' },
  { value: '1', label: 'single digit' },
  { value: '12', label: 'two digits' },
  { value: '201555', label: 'six digits (incomplete)' },
  { value: '20155501', label: 'eight digits (incomplete)' },
  { value: 'abcdefghij', label: 'letters only (rejected by tel input)' },
  { value: '()-  ', label: 'punctuation only' },
];

/** A complete, well-formed US number (digits only) that enables submission. */
export const VALID_PHONE_DIGITS = '2015550147';
export const VALID_PHONE_FORMATTED = '(201) 555-0147';
