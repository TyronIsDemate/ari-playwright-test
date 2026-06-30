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
│   │   ├── OtpForm.ts                 #   shared 6-digit OTP component
│   │   └── DashboardPage.ts           #   authenticated dashboard (skeleton)
│   ├── fixtures/{fixtures,test-data}.ts
│   └── utils/{helpers,sms}.ts         # phone/validity helpers; OTP retrievers
├── tests/
│   ├── setup/auth.setup.ts            # logs in once → saves session (regression)
│   ├── smoke/  login/  signup/        # logged-out specs
│   └── dashboard/                     # authenticated specs (start logged-in)
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
ARI_REGISTERED_PHONE=          # optional; defaults to ARI_TEST_PHONE

# Plus ONE code source:
ARI_TEST_OTP=000000            # (A) static code your beta accepts, OR
TWILIO_ACCOUNT_SID=ACxxxx      # (B) Twilio — ARI_TEST_PHONE is a Twilio number
TWILIO_AUTH_TOKEN=xxxx         #     that receives the SMS; we poll its REST API
ARI_COUNTRY_CODE=1             #     dial code for E.164 (default 1 = US)
```

> **Automating the real OTP.** A headless browser can't read an SMS, so the code
> comes from a pluggable retriever (`src/utils/sms.ts`):
> - **Static** — set `ARI_TEST_OTP` for a whitelisted test number with a fixed code.
> - **Twilio** — make `ARI_TEST_PHONE` a Twilio number that receives the OTP and
>   set `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`; the suite polls Twilio's
>   Messages API for the newest 6-digit code (takes precedence over the static code).
> - **Other provider** — implement `OtpRetriever` and return it from `getOtpRetriever()`.
>
> Until one is configured, `@positive`/`@manual` tests skip.

### Useful commands

```bash
npm test                       # all browsers
npm run test:ci                # SMS-free set (excludes @otp/@positive/@manual)
npm run test:regression        # full suite
npm run test:login             # login specs
npm run test:signup            # signup specs
npm run test:smoke             # @smoke
npm run test:auth              # run only the auth-session setup
npm run test:dashboard         # authenticated dashboard regression
npm run report                 # open last HTML report
node scripts/explore.mjs /login /signup            # inspect live DOM
```

---

## Regression testing

The suite is structured for repeatable regression runs:

- **Reusable login session.** `tests/setup/auth.setup.ts` performs the OTP login
  **once** and saves the browser session to `playwright/.auth/user.json`. The
  `chromium-authed` project loads that session, so every dashboard test starts
  **already authenticated** — no per-test phone/OTP. (This project only exists
  when OTP login is configured, so the default suite is unaffected.)
- **Logged-out vs. authenticated split.** Public projects
  (`chromium`/`firefox`/`webkit` + mobile) run the smoke/login/signup specs and
  ignore `tests/dashboard/`. The `chromium-authed` project (depends on `setup`)
  runs only `tests/dashboard/`.
- **Selective targets.** `test:ci` (SMS-free, for PRs), `test:regression` (full),
  `test:dashboard`, `test:auth`, plus tag filters: `@smoke @login @signup
  @validation @negative @otp @positive @manual @dashboard @regression`.
- **CI cadence.** Push/PR runs the **SMS-free** public matrix for fast feedback;
  the **nightly schedule + manual dispatch** run the full regression — OTP tiers
  and the authenticated dashboard job — when `ARI_ALLOW_OTP_FLOW=true`.

### Adding your dashboard tests

1. Configure OTP login (so the session can be created) — see above.
2. Fill in real selectors in `src/pages/DashboardPage.ts`.
3. Add specs under `tests/dashboard/*.spec.ts` using the `dashboardPage` fixture;
   `page` is already authenticated. See `dashboard.example.spec.ts` for the
   pattern (turn the `test.fixme` placeholders into real assertions).

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
| `ARI_TEST_OTP` | *(code source A)* static code for that number |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | *(code source B)* Twilio creds when the test number is a Twilio number |
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
3. **OTP retrieval** — configure a static code or Twilio (see above), or add a
   provider in `src/utils/sms.ts`, to light up the happy-path tiers.
4. **Profile steps** — signup continues into profile setup after OTP; extend
   `SignupPage` to cover those screens when you want end-to-end onboarding coverage.

---

## Tech

- Playwright Test + TypeScript, Page Object Model with custom fixtures
- `dotenv` locally; GitHub Secrets in CI
- Reporters: list + HTML + JUnit (`test-results/junit.xml`)
- Artifacts: trace on first retry, screenshot/video on failure
