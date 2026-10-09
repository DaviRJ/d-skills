---
name: tanstack-google-analytics
description: Implement Google Analytics GA4 with Consent Mode v2 in any TanStack Start app. Use when adding gtag, gtag/js, dataLayer, measurement ID, cookie consent banner, trackEvent, page_view, DebugView, or debugging missing collect hits.
---

# TanStack Start Google Analytics (GA4 + Consent Mode v2)

Implements GA4 in any TanStack Start app (file-based routes, SSR) so hits
are reliably delivered **and** gated behind user consent.

The critical rule: **gtag.js must be a static `<head>` script, never
dynamically injected after hydration.** Dynamic injection (e.g. appending
the `<script>` in a `useEffect` after the cookie banner is accepted) runs
after `window.load`, and the automatic `page_view` from `gtag('config')` is
silently suppressed — GA reports "tag installed" but zero hits forever.

## File layout (adapt paths to the project)

```
src/lib/analytics.ts            dataLayer/gtag stub, consent state, load/unload, trackEvent
src/routes/__root.tsx           static gtag bootstrap + gtag/js in head()
src/components/CookieConsent.tsx  banner, persists choice, calls loadAnalytics()
src/lib/site.ts (or .env)       measurement ID, single source of truth
```

Nothing analytics-related renders on the server. The banner is inert until
hydration, so SSR markup is identical for everyone.

## Implementation

### 1. Measurement ID (single source of truth)

Define it once and import it everywhere. Either a constants module:

```ts
// src/lib/site.ts (example — use whatever constants module the project has)
export const gaMeasurementId = 'G-XXXXXXXXXX';
```

or an env var (Vite `VITE_` prefix so it is exposed to the client):

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

```ts
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string;
```

Never hardcode the ID in more than one place. The numeric stream ID from
the GA dashboard never goes in code — only the `G-` ID is used. If the ID
is empty/undefined (e.g. env missing), skip loading entirely.

### 2. Analytics module (`src/lib/analytics.ts`)

```ts
const CONSENT_KEY = 'ga-consent'; // example key — use the project's convention
export const CONSENT_OPEN_EVENT = 'cookie-consent:open';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type ConsentChoice = 'granted' | 'denied';

export function getConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

export function setConsent(choice: ConsentChoice) {
  window.localStorage.setItem(CONSENT_KEY, choice);
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

function ensureGtag(): (...args: unknown[]) => void {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

export function loadAnalytics() {
  const gtag = ensureGtag();
  // gtag.js is loaded statically in <head> (see section 3), so this only
  // updates consent and fires config/page_view after the user accepts.
  gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
  gtag('config', gaMeasurementId, { send_page_view: true });
  // Forced page_view: the automatic one from config can be suppressed when
  // config arrives late, so send an explicit one with location metadata.
  gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  });
}

export function unloadAnalytics() {
  const gtag = ensureGtag();
  gtag('consent', 'update', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

// Custom events go through trackEvent — never push to dataLayer directly.
export function trackEvent(
  name: string,
  params: Record<string, string | number> = {},
) {
  if (getConsent() !== 'granted' || !window.dataLayer || !window.gtag) return;
  window.gtag('event', name, params);
}
```

Rules:

- `window.gtag` must be **global**, not a local closure. DebugView, Tag
  Assistant and extensions depend on `window.gtag` existing.
- `trackEvent` silently no-ops without granted consent — keep event names and
  params stable once in production (historical reports break on rename).
- `unloadAnalytics` sends `consent update denied` but keeps the
  dataLayer/gtag stub so a later grant can re-use it. Never assign
  `window.dataLayer = undefined`.
- During diagnosis only, add `debug_mode: true` to `config` and `page_view`
  calls so hits surface in GA DebugView even with filters.

### 3. Static `<head>` scripts (`src/routes/__root.tsx`)

This is the step that fixes "tag installed, zero hits". The bootstrap and the
`gtag/js` download must be present in the SSR HTML **before hydration**:

```tsx
export const Route = createRootRoute({
  head: () => ({
    // ... existing meta/links ...
    scripts: [
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});gtag('js',new Date())`,
      },
      {
        async: true,
        src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`,
      },
    ],
  }),
});
```

Ordering constraints (all required):

1. `consent default denied` is the **first** `gtag()` call (Consent Mode v2).
2. The `gtag/js` `<script>` is static in `<head>`, not appended by JS later.
3. `gtag('config', id, { send_page_view: true })` + `consent update granted`
   happen only in `loadAnalytics()` after accept.
4. Verify with view-source: the bootstrap must be in the raw SSR HTML.

### 4. Consent banner

Any banner UI works as long as it follows this contract:

```tsx
useEffect(() => {
  const choice = getConsent();
  if (choice === 'granted') loadAnalytics();
  if (choice === null) setVisible(true);

  const open = () => setVisible(true);
  window.addEventListener(CONSENT_OPEN_EVENT, open);
  return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
}, []);

const decide = (choice: 'granted' | 'denied') => {
  setConsent(choice);
  if (choice === 'granted') loadAnalytics();
  else unloadAnalytics();
  setVisible(false);
};
```

- No `window` access during render — `useEffect` and event handlers only,
  since every page is server-rendered first.
- A "Cookies"/preferences link anywhere in the UI reopens the banner by
  dispatching `CONSENT_OPEN_EVENT` via `openCookiePreferences()`. Both sides
  import the constant so the names cannot drift.
- Banner copy should come from the project's copy/i18n system, never
  hardcoded — adapt to whatever the project uses.

### 5. SPA navigations

TanStack Router navigates client-side, so the automatic `page_view` only
fires on full page loads. For accurate per-route data, send a `page_view`
on each client-side navigation (e.g. subscribe to router state in the root
route component and call `trackEvent('page_view', { page_path, page_location,
page_title })` when the pathname changes and consent is granted). Skip this
only for single-page sites where it does not matter.

### 6. Verify with typecheck + build

```bash
npx tsc --noEmit && npm run build
```

`vite build` does not typecheck, so run `tsc` explicitly.

## Debugging: tag installed but no data

| Symptom                                                  | Meaning                                    |
| -------------------------------------------------------- | ------------------------------------------ |
| GA shows "tag installed", Realtime = 0                   | `gtag/js` downloaded, `collect` never sent |
| Network shows only `GET gtag/js?id=G-...`, no `collect`  | hit suppressed (timing/consent) or blocked |
| `dataLayer` = `[js, config]` then `gtm.dom`/`gtm.load`   | library ran but `page_view` was suppressed |
| `document.cookie` has no `_ga` / `_ga_<ID>` after accept | no hit was ever accepted by the endpoint   |
| Same ID works in a plain `test.html`, fails in the app   | app/infra issue, not the GA property       |

Checklist (anonymous window, extensions off):

1. **Clear + accept**: DevTools > Application > Local Storage > delete the
   consent key > reload > click Accept.
2. **Console**:
   ```js
   window.gtag; // must be a function
   window.dataLayer; // must start with consent default, js, config, consent update
   window.google_tag_data; // must exist after gtag/js loads
   document.cookie.includes('_ga'); // must be true after a successful hit
   ```
3. **Network (filter `collect`, Preserve log on)**: expect
   `POST https://www.google-analytics.com/g/collect` and
   `POST https://analytics.google.com/g/collect`. Only seeing `gtag/js` =
   the bug is reproduced.
4. **DebugView, not Realtime**: GA > Admin > DebugView shows `page_view`
   within ~30s (with `debug_mode: true`, even with filters). Realtime can
   lag 1–2 min.
5. **Manual event probe**: `gtag('event','test_manual',{debug_mode:true})`
   must produce an immediate `collect`. If it does but page load doesn't,
   the load-time `config`/`page_view` ordering is wrong.
6. **Connectivity probe**:
   ```js
   await fetch('https://www.google-analytics.com/g/collect', {
     method: 'POST',
     body: 'test',
   })
     .then((r) => r.status)
     .catch((e) => e);
   ```
   Expect `204`/`2xx`. `Failed to fetch`/`blocked` = CSP, ad-blocker, or
   proxy interference — not application code.
7. **Control test**: a static `test.html` with only the gtag snippet, served
   locally. If hits flow there but not in the app, the app's injection
   timing or hosting layer is the cause.
8. **Tag Assistant**: `tagassistant.google.com` > Add domain > app URL.
   Shows `Fired` vs `Not fired - consent denied / filtered` per tag.

### Known causes

- **Dynamic injection after hydration** (the #1 cause): `gtag('config')`
  pushed after `window.load` never fires its automatic `page_view`.
  Fix = static `<head>` scripts per section 3 plus forced `page_view`
  event in `loadAnalytics()`.
- **Consent Mode v2 without `consent default` first**: hits queued before
  the library loads carry no consent signal and are discarded. Fix =
  `consent default denied` as the very first call, with `wait_for_update`.
- **Local `gtag` closure instead of `window.gtag`**: works for queueing but
  breaks DebugView/extensions and `trackEvent`. Fix = global stub.
- **Destroying `dataLayer` on opt-out**: a second Accept then loses
  everything. Fix = keep the stub, only send `consent update denied`.
- **Missing SPA page views**: only the initial load is tracked. Fix =
  section 5.
- **Bot protection on the hosting layer** (e.g. Cloudflare Managed
  Challenge / Bot Fight Mode on a custom domain): lets `gtag/js` through
  but suppresses `collect`. Diagnose:
  `curl -s https://<domain>/ | grep -c "cdn-cgi/challenge"` — if `1` on the
  custom domain but `0` on the direct hosting URL, the challenge is the
  cause. Fix on the hosting dashboard (lower Security Level, disable bot
  fight for the site or add a bypass rule), then purge cache + redeploy.
- **GA-side filters**: Admin > Data Streams > stream > Configure tag
  settings > Data filters > Internal traffic must be Inactive for your IP,
  and unwanted-referral lists must not contain the app domain.

## Anti-patterns (do not introduce)

- Appending the `gtag/js` `<script>` via `document.createElement` inside a
  `useEffect` after consent.
- Calling `gtag('config')` before the `gtag/js` script element exists in a
  dynamic-injection setup.
- Pushing raw arrays to `dataLayer` for custom events instead of
  `trackEvent()` / `window.gtag('event', ...)`.
- Setting `window.dataLayer = undefined` anywhere.
- Hardcoding the measurement ID in more than one place.
- Omitting `wait_for_update` from `consent default` (hits race consent).
- Accessing `window`/`localStorage` during render instead of in
  `useEffect`/event handlers (breaks SSR).
