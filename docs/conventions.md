# Conventions

## JavaScript

- Plain ES5-leaning JS (`var`, `function`, no ES modules) on purpose: the
  same files load unmodified as a content script, a service-worker
  `importScripts` target, and a plain `<script>` tag — no bundler
  translates module syntax for us, so module syntax isn't used.
- Every file that touches storage does so through `QueueStorage`
  (`storage.js`) — see `docs/architecture.md`. No direct
  `chrome.storage.local.get/set` calls elsewhere.
- Every async storage call is a Promise (via the `promisify` helper in
  `storage.js`), so call sites read as `.then()` chains, not nested
  callbacks.
- IIFEs (`(function () { "use strict"; ... })();`) wrap each page-facing
  script (`content.js`, `popup.js`, `options.js`) to avoid leaking
  variables into the page/extension-page global scope.
- Name events and messages by what they mean, not how they're
  implemented: `GET_VIDEO_INFO`, `OPEN_OPTIONS` — not `MSG_1`, `DO_THING`.

## CSS

- Design tokens as CSS custom properties on `:root` (see
  `docs/design.md` for the palette). Never hardcode a hex color in a
  component rule — reference the token.
- Light/dark handled two ways in every stylesheet: a
  `@media (prefers-color-scheme: light)` block scoped with
  `:root:not([data-theme="dark"])`, and an explicit `:root[data-theme="light"]`
  block for when the user overrides the system setting. Keep both in sync
  when adding a token.
- `:focus-visible` gets an explicit, visible ring on every interactive
  element — this is checked, not assumed, for every new control.
- Every transition/animation is paired with a
  `@media (prefers-reduced-motion: reduce)` override.
- No CSS framework, no utility-class soup (no Tailwind) — the project is
  small enough that hand-written, token-based CSS stays more readable
  than a utility layer would.

## HTML

- Semantic elements first: `<button>` for actions, `<a href>` for
  navigation, `<label>`/`<fieldset>`/`<legend>` for form controls. ARIA
  attributes supplement semantics (`aria-pressed`, `aria-live`,
  `aria-label`) rather than replace them.
- `<template>` for repeated list markup (see `#itemTemplate` in
  `popup.html`) instead of building HTML strings for structural markup —
  strings are only used for the toast content in `content.js`, where a
  template element isn't available in that isolated context as
  conveniently.

## File/naming patterns

- One JS file per surface, matching its HTML file 1:1
  (`popup.html`/`popup.js`/`popup.css`, `options.html`/`options.js`/
  `options.css`). Don't split a surface's logic across multiple files.
- Storage keys are namespaced and versionless-by-shape: `queue_items`,
  `queue_settings`. If the shape needs to change incompatibly, add a
  migration in `storage.js` rather than renaming the key (renaming would
  strand existing users' data).

## Anti-patterns to avoid in this repo specifically

- Don't add `innerHTML` assignments built from unsanitized page content
  (video titles come from the page being visited, which is untrusted
  input) — always assign via `.textContent` for anything sourced from the
  page, as every current file does. The one exception (`content.js`'s
  toast markup) only ever interpolates static, hardcoded button strings
  into `innerHTML`; the untrusted title/site strings are set afterward
  via `.textContent`. Keep it that way.
- Don't reach into another surface's DOM or module state directly; cross-
  surface communication goes through `chrome.storage.onChanged` or a
  named `chrome.runtime` message, per `docs/architecture.md`.
