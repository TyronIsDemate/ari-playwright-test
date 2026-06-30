# Ari — Playwright E2E Test Suite

End-to-end automation for the **Ari** account flows (login & signup) at
<https://ari.beta.citizenhealth.com>, built with [Playwright](https://playwright.dev)
+ TypeScript and wired to run in **GitHub Actions**.

## How Ari auth actually works (verified against the live app)

Ari uses **passwordless phone + OTP** — there is **no email/password**.

```
Landing (/)                /login                         /signup
┌────────────────┐        ┌────────────────────┐         ┌─────────────────────────┐
│ "Get started" ─┼──────► │ Welcome back        │         │ Intro video ("Skip")    │
│ "I have an Ari │        │ phone (000)000-0000 │         │ → "Now it's your turn"  │
│  account"     ─┼──────► │ [country +1]        │         │ → "What's your phone    │
└────────────────┘        │ [Send code] ───────►│ OTP     │    number?" + [Continue]│──► OTP ──► profile
                          └────────────────────┘ 6 digits └─────────────────────────┘
```

**Key validation behavior:** both the login **"Send code"** and signup
**"Continue"** buttons are **disabled until a complete, valid 10-digit number**
is entered. The tel input auto-formats to `(XXX) XXX-XXXX`, strips non-digits,
and caps at 10 digits. This lets the suite validate the entire phone UI
**without sending any SMS** — it asserts the button's enabled/disabled state and
the formatting mask.

## Test philosophy: SMS-safe by default

| Tier | Sends SMS? | Runs by default? | What it covers |
|------|-----------|------------------|----------------|
| Validation / negative / smoke | **No** | ✅ Yes | Phone formatting & button-gating, malformed/abusive input, landing CTAs, navigation |
| OTP screen (`@otp`) | Yes (1 per test) | ❌ Opt-in | Send-code → 6-digit screen, resend control, wrong-code rejection |
| Happy path (`@positive @manual`) | Yes | ❌ Opt-in | Full login/signup with a real code |

Opt into the SMS tiers with `ARI_ALLOW_OTP_FLOW=true`. The happy-path tiers also
need a test number and a usable code (see below). Opt-in OTP tests use the
reserved **555-01XX** fictional range so no real subscriber is messaged.

---

## What's covered

| Area | File | Scenarios |
|------|------|-----------|
| **Smoke** | `tests/smoke/smoke.spec.ts` | Landing loads + CTAs, terms/privacy links, login phone screen, landing→login, landing→signup |
| **Login — validation** | `tests/login/login-validation.spec.ts` | Empty/partial/valid phone → button state, `(XXX) XXX-XXXX` mask, **7 invalid-phone cases** (data-driven), letters rejected, 10-digit cap, error→valid recovery |
| **Login — negative** | `tests/login/login-negative.spec.ts` | SQL-injection & XSS strings sanitized, punctuation-only, over-long input cap, disabled button not clickable |
| **Login — OTP** (`@otp`, opt-in) | `tests/login/login-otp.spec.ts` | Send code → 6-digit screen, resend control, wrong-code rejection |
| **Login — positive** (`@manual`, opt-in) | `tests/login/login-positive.spec.ts` | Full passwordless login with a real code |
| **Signup — validation** | `tests/signup/signup-validation.spec.ts` | Reach phone step, prompt + helper text, button gating, **7 invalid-phone cases**, mask |
| **Signup — negative** | `tests/signup/signup-negative.spec.ts` | SQL/XSS sanitized, letters rejected, over-long cap |
| **Signup — positive** (`@manual`, opt-in) | `tests/signup/signup-positive.spec.ts` | Full phone + OTP signup |

**Cross-browser:** Chromium, Firefox, WebKit + mobile profiles (Pixel 7, iPhone 14) in `playwright.config.ts`.

---

## Project structure

```
ari-playwright-tests/
├── .github/workflows/playwright.yml   # CI: 3-browser matrix, nightly, artifacts
├── playwright.config.ts               # Projects, reporters, timeouts, baseURL
├── scripts/explore.mjs                # Dev helper: dump live DOM of any path(s)
├── src/
│   ├── pages/                         # Page Objects (all selectors live here)
│   │   ├── BasePage.ts                #   shared error/helper-text detection
│   │   ├── LandingPage.ts             #   "/" CTAs
│   │   ├── LoginPage.ts               #   phone → Send code
│   │   ├── SignupPage.ts              #   intro → phone → Continue
│   │   └── OtpForm.ts                 #   shared 6-digit OTP component
│   ├── fixtures/{fixtures,test-data}.ts
│   └── utils/helpers.ts               # phone gen, validity checks, invalid-phone set
├── tests/{smoke,login,signup}/
├── .env.example                       # copy → .env (never commit .env)
└── package.json
```

---

## Getting started

```bash
npm install
npm run install:browsers      # downloads Chromium/Firefox/WebKit
cp .env.example .env          # optional; the default suite needs no secrets
npm run test:chromium         # fastest feedback (SMS-safe tiers only)
```

The default suite **needs no configuration** — it sends no SMS and creates no
accounts.

### Running the SMS / happy-path tiers

Set these in `.env` (local) or as GitHub Secrets (CI):

```ini
ARI_ALLOW_OTP_FLOW=true        # permit Send code / Continue (sends SMS)
ARI_TEST_PHONE=2015551234      # dedicated test number (digits only)
ARI_TEST_OTP=000000            # static code your beta accepts for that number
ARI_REGISTERED_PHONE=          # optional; defaults to ARI_TEST_PHONE
```

> **Automating the real OTP.** A headless browser can't read an SMS. Two options:
> (1) use a **whitelisted test number with a static code** on staging and set
> `ARI_TEST_OTP`; or (2) wire an SMS-retrieval provider (e.g. Twilio) into
> `OtpForm.enterCode`. Until one is in place, `@positive`/`@manual` tests skip.

### Useful commands

```bash
npm test                       # all browsers
npm run test:login             # login specs
npm run test:signup            # signup specs
npm run test:smoke             # @smoke
npx playwright test --grep @validation
npx playwright test --grep-invert "@otp|@manual"   # explicitly SMS-free
npm run report                 # open last HTML report
node scripts/explore.mjs /login /signup            # inspect live DOM
```

---

## GitHub Actions

`.github/workflows/playwright.yml` runs on push/PR to `main`/`master`, **nightly
(07:00 UTC)**, and on manual dispatch (with an optional `base_url` input). It runs
a **3-browser matrix** and uploads the HTML report (always) + traces/videos
(on failure).

**Repository secrets** (Settings → Secrets and variables → Actions) — only needed
for the opt-in tiers:

| Name | Purpose |
|------|---------|
| `ARI_TEST_PHONE` | Happy-path test number |
| `ARI_TEST_OTP` | Static code for that number |
| `ARI_REGISTERED_PHONE` | *(optional)* existing-account scenarios |

Set repo **variable** `ARI_ALLOW_OTP_FLOW=true` to enable the SMS tiers in CI, and
optionally `BASE_URL` to target another environment.

---

## Tuning after the first run

1. **Post-login marker** — `LoginPage.expectLoggedIn()` asserts "left `/login`
   with no error". Replace with a real authenticated signal (avatar, dashboard
   heading, known URL) once you've completed a real login.
2. **Country selector** — only US (+1) was observed. If more dial codes ship, add
   a `selectCountry()` method to `LoginPage`/`SignupPage`.
3. **OTP retrieval** — see the note above to light up the happy-path tiers.
4. **Profile steps** — signup continues into profile setup after OTP; extend
   `SignupPage` to cover those screens when you want end-to-end onboarding coverage.

---

## Tech

- Playwright Test + TypeScript, Page Object Model with custom fixtures
- `dotenv` locally; GitHub Secrets in CI
- Reporters: list + HTML + JUnit (`test-results/junit.xml`)
- Artifacts: trace on first retry, screenshot/video on failure
