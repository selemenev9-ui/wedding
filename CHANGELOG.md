# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/). Версии не пронумерованы — проект без semver-релизов; даты фиксируют снимок для передачи контекста между сессиями.

## [Unreleased]

- **Dresscode palette:** added a standalone `#section-dresscode` with frosted shell, bilingual label, descriptive copy, and four color swatches (`Шоколад`, `Жемчуг`, `Роза`, `Фисташка`) plus GSAP reveal staging.
- **Dresscode palette tuning:** moved palette authority into `DressModel` with separate `chipColor` values for DOM swatches and ACES-compensated PBR `color` / `envMapIntensity` values for the satin dress; removed the swatch inset highlight so chips render as flat reference colors.
- **Dresscode satin tuning:** adjusted the four `DressModel` presets toward the visual reference: lighter copper chocolate, creamy pearl, softer dusty rose, and grey-olive pistachio without touching global lighting or HDRI.
- **Dresscode satin micro-pass 2:** cooled the chocolate preset away from red, reduced pearl iridescence, softened rose highlights, and desaturated pistachio toward the grey-olive reference fabric.
- **Dresscode chocolate correction:** isolated the chocolate preset with a lifted base, higher roughness, softer sheen, and lower environment reflections so it reads as satin instead of glossy leather.
- **Dresscode bronze/taupe correction:** reinterpreted the `Шоколад` preset as bronze/taupe satin to match the reference fabric instead of literal dark chocolate.
- **Dresscode satin fabric shader:** extended `DressModel`'s `MeshPhysicalMaterial` via `onBeforeCompile` with per-preset satin lift/contrast/saturation/rim/glow uniforms, preserving scene shadows and ACES while replacing the plastic response with cloth-like highlights.
- **Dresscode satin shader correction:** removed the milk-white diffuse lift from the satin shader so base palette colors remain visible while only grazing folds and highlights receive cloth glow.
- **Dresscode satin color micro-pass:** adjusted only preset values over the corrected satin shader: champagne-taupe bronze, calmer pearl saturation, lighter dusty rose, and greyer pistachio.
- **Dresscode reference pass:** kept pistachio unchanged as the best visual match and retuned only pearl/rose/chocolate toward warmer cream, lighter dusty rose, and lifted bronze-taupe respectively.
- **Dresscode pearl-only pass:** locked chocolate/rose/pistachio and tuned only `Жемчуг` warmer and creamier with reduced iridescence/env pickup and cleaner satin highlights.
- **Dresscode pearl champagne pass:** pushed only `Жемчуг` away from white-grey porcelain toward deeper champagne/ivory satin with warmer base, warmer sheen, reduced iridescence, and less environment pickup.
- **Dresscode responsive composition:** fixed final color/material presets and adjusted only layout CSS: tighter desktop/tablet dress slot, inward model shift, clipped section bounds, and compact one-row mobile swatches without the previous 2x2 media-query override.
- **Dresscode manual rotation:** added local pointer drag rotation for the dress model with horizontal intent detection, release inertia, and native vertical mobile scroll preservation; no camera, Lenis, lighting, or material changes.
- **Dresscode Android model load:** removed the narrow coarse-pointer lazy-init skip so the dress model loads on real Android Opera instead of leaving the dresscode section without the 3D dress.
- **Mobile readability + dress affordance:** increased mobile micro-copy legibility for small uppercase labels/date/address/button text and added an elegant dresscode palette hint plus subtle swatch hover/active lift so guests discover color switching.
- **Dresscode silk model:** rebuilt `DressModel` material around sheen + iridescence (double-sided satin, vertex sway/billow) and mapped each swatch to its own PBR preset with animated sheen/iridescence morphs.
- **Dresscode mobile viewport:** compressed the `max-width: 767px` layout into a 100svh vignette (tight padding, shell clamp, dress reordered below copy) so the floating model and swatches are visible simultaneously on phones.
- **Info cards layout:** desktop grid now auto-fits `minmax(18rem, 1fr)` columns with hyphenated titles so long Russian words stop clipping on the "Проживание" card.
- **Info cards refresh:** reworded the three-card grid (проживание/подарки/дети) and restyled the DOM cards with deeper relief so the section matches the new art direction; Scroll.js triggers updated to reveal the new layout.
- **Accessibility + SEO housekeeping:** increased `#section-info` base typography for mobile readability (`.info-title` now starts at `2rem`, `.info-text` at `1rem`) with tighter mobile grid spacing, and added `public/robots.txt` (`User-agent: *`, `Allow: /`) to fix Lighthouse robots parsing errors.
- **Info section:** inserted a new DOM-only `#section-info` between destination and final with three editorial cards (dress code, gifts, children policy), responsive grid styling, and a dedicated `ScrollTrigger` reveal in `Scroll.js` without touching the WebGL `masterTl`.
- **Living newspaper video effect:** replaced static 3-image crossfade in Act II Glimpse section with seamless looping `<video>` (`/video/loop.webm`) for enhanced editorial impact. Video uses native HTML5 attributes (`autoplay muted loop playsinline`) and fills container with `object-fit: cover`/`contain` responsive behavior.
- **GSAP optimization:** removed crossfade opacity tweens for `.glimpse-img-2` and `.glimpse-img-3` from Scroll.js timeline; container pinning logic preserved (`+=3000px` scroll budget, mask expansion, button reveal timing).
- **CSS cleanup:** replaced `.glimpse-img` styles with `.glimpse-video` styles; removed obsolete `.glimpse-img-1/2/3` z-index and opacity classes.
- **Accessibility contrast pass:** increased muted text contrast in navigation/date labels/destination metadata/gallery counter and darkened route-link color to improve WCAG readability while preserving the warm visual palette.
- **Event details update:** date/time moved to **19.09.2026, 16:00** across hero/details/final/meta; location changed to restaurant **«НАЛ»** (Советская ул., 1, село Большие Салы) with updated Yandex route URL.
- **Destination section composition:** added a compact pre-event block for **«Выкуп невесты»** (**14:00**, Сумский переулок, 7) above the main venue, including a separate route link and visual divider to preserve layout rhythm.
- **Gallery color pipeline fix:** `GalleryRibbon` custom shader now uses output colorspace conversion (`#include <colorspace_fragment>`), so photos in WebGL match standalone `.webp` rendering (no unintended dark/contrast cast from linear output mismatch).
- **Gallery content:** `public/photos/gallery` now **16** WebP slides; `GalleryRibbon` `TOTAL=16`; `npm run images` refreshed `gallery-manifest.json`; scroll section still `1–3.webp`. `index.html` counter seed `01 / 16`.
- **GitHub Actions Pages deploy:** `deploy-gh-pages.yml` now passes `VITE_RSVP_RELAY_URL` (and optional `VITE_RSVP_RELAY_SECRET`, `VITE_TG_*`) from **repository secrets** into `npm run build`. CI builds previously had an empty relay URL → RSVP failed on the live site while `localhost` worked with local `.env`.
- **RSVP Google Apps Script:** relay uses `application/x-www-form-urlencoded` + `fetch` `no-cors` for `script.google.com/macros/*` URLs so success does not depend on reading a CORS-wrapped JSON response (GAS often omits ACAO on the response). `Code.gs` reads `e.parameter` (urlencoded) or JSON body. Node/PHP relays accept both encodings.
- **Prod console hygiene:** Vite `esbuild.drop` removes `console`/`debugger` from production bundles; RSVP catch logs errors only in `import.meta.env.DEV` and shows a guest-safe error line (no «проверьте консоль»). `.env.example` notes omitting `VITE_TG_*` in CI when relay-only.
- **RSVP relay CORS (Google Apps Script):** relay `fetch` uses `Content-Type: text/plain` + JSON body so the browser skips CORS preflight (GAS does not answer OPTIONS with ACAO). Relay no longer sends `X-Rsvp-Secret` (custom headers trigger preflight); secret stays in JSON `secret` only. If `VITE_RSVP_RELAY_URL` is set, legacy direct Telegram `no-cors` fallback is disabled to avoid false “success” when delivery failed.
- **RSVP relay (RU / blocked Telegram API):** production can use `VITE_RSVP_RELAY_URL` (+ optional `VITE_RSVP_RELAY_SECRET`) so guests POST to a relay; relay calls Telegram. **No VPS:** `rsvp-relay/php/rsvp.php` (Beget / shared PHP) or **Google Apps Script** (`rsvp-relay/google-apps-script/Code.gs`). Node `server.mjs` still supported. Relay POST body includes optional `secret` for GAS. `.env.example` updated.
- **RSVP UX + anti-spam pass:** added URL guest personalization (`?guest=Имя`) to hero and RSVP prefill; added static-host friendly anti-spam barriers (honeypot field, minimum fill time, localStorage window throttle); and added RSVP success micro-delight (soft shimmer on submit + warmer confirmation copy).
- **Launch polish (final):** gallery grain changed from static UV lock to dynamic `uTime`-driven sizzle in `GalleryRibbon` fragment shader; `Renderer` keeps `powerPreference: high-performance` and applies exposure guard (`1.2` desktop / `1.1` coarse-pointer); `index.html` section accessibility labels aligned with nav semantics (`История`, `Галерея`, `Детали`, `Финал и RSVP`) with favicon path verified (`/favicon.svg`).
- **Phase 4 (majestic polish):** gallery fragment `filmGrainHash` + ~4% luminance grain (no composer); `.golden-thread` gold/champagne core, `blur(1px)`, layered `box-shadow` bloom; Act IV `#section-final` orbital loop **35s**, Z tilt **`power2.inOut`**; mobile `#site-nav.nav--menu-open` matches `.nav-links.open` frost (`--color-page-bg-rgb` **0.92**, **blur 20px**) + link transitions (`main.js` toggles class).
- **Gallery Phase 3 (interaction)**: singleton `World.raycaster` + `World.mouse` with `updateMouse(ndcX, ndcY)` fed from `main.js` `mousemove` (NDC from live `Sizes`); `GalleryRibbon` raycasts visible ribbon against `world.mouse`, GSAP-tweens per-mesh `uHover` only when hovered mesh changes; fragment lift (UV pinch, brighter, lighter vignette); `open()` stagger **0.05** + `rotation.z` spread; `close()`/`destroy()`/`_resetState` reset hover + kill tweens; lazy texture `Map` disposal unchanged with explicit `tex.dispose()` sweep.
- **World / PBR Phase 2**: `World.resize(w,h,dpr)` orchestrates WebGL resize + optional hosts; `world.galleryRibbon` set from `ensureGalleryRibbon`; DOM-only `HeroText` (no Three.js nodes); glass `roughness` 0.05, clearcoat `1` / `0.02`, `ior` 2.5; renderer exposure **1.2**.
- **Lighthouse boot pass (no visual cuts)**: deferred ring/path `ScrollTrigger` + path `SplitType` to `requestAnimationFrame` when preloader fade begins; wedding countdown timer starts post-hero-intro; `GalleryRibbon` GPU pool/shaders init on first `open()`; `ScrollTrigger.config({ limitCallbacks: true })`; extra `ring_b.glb` preload; WebP conversion `quality: 75` / `effort: 6` in `convert-images.js` for future JPEG runs.
- **A11y landmark**: wrapped hero, story sections, destination/RSVP, final block, and gallery overlay in `<main id="main">` for Lighthouse / screen-reader main landmark compliance.
- **Lighthouse / boot perf**: Resource preloading and async mesh initialization implemented to optimize LCP/TBT for Lighthouse 90+ compliance (`index.html` preconnect/preloads, `main.js` idle-deferred `GlassRing`/`HeroText`, `Renderer.js` `powerPreference: high-performance`, `ResourceLoader` Draco CDN note).

## 2026-04-09 (Production Ready)

- Finalized minimalist art direction, optimized PBR gold response, and stabilized cross-platform performance.
- **Dead code removal**: removed dormant `Petals.js` particle system to enforce clean architecture, reduce bundle size, and maintain a strict minimalist art direction.
- **Gallery optical FX**: fragment shader uses `uVelocity` for UV zoom under motion plus horizontal RGB channel split (chromatic aberration); rounded mask still driven by raw `vUv` for stable card edges (`GalleryRibbon.js`).
- **Magnetic UI & blend cursor**: `#cursor` is white with `mix-blend-mode: difference`; `.editorial-btn` elements get magnetic GSAP offset on `mousemove` and elastic snap-back on leave (`src/modules/Cursor.js`, `src/style.css`).
- **Preloader & boot polish**: frosted `#preloader` (translucent page-bg + backdrop blur) to align with the ACES-mapped canvas; `StudioDome` material `envMapIntensity: 0` so the dome does not shift hue when the HDRI loads; `#site-nav` hidden until hero intro and eased in with the hero footer stack.
- **Hero names — stroke removed**: dropped `-webkit-text-stroke` from `#hero-names` and `#hero-names.hero-names--stacked`; contrast over WebGL uses soft double-layer pearl `text-shadow` only to avoid harsh outlines and clipping artifacts on the rings.
- **UX & art polish**: custom cursor `quickTo` shortened to 0.1s/`power3.out` for near 1:1 pointer tracking; glass ring gold roughness `0.15` and glass ring env fade target `1.6` to soften readable HDRI reflections; hero names use layered glow for contrast on dark WebGL areas.
- **Typography boot gate**: `launchExperience()` now awaits `document.fonts.load` for Playfair Display and Manrope before preloader exit so SplitType runs against final font metrics (mitigates FOUT/swap layout crash on slow networks).
- **Hero intro — luxury settle**: replaced elastic ring scale-in with 3.2s `expo.out` and paired rotation untwist (`power3.out`) from a slight Y/Z offset in `runHeroIntro()` (`src/main.js`).
- **Rendering & PBR pass**: removed EffectComposer/SMAA/RT pipeline; `WebGLRenderer` uses native MSAA (`antialias: true`) and `toneMappingExposure` 1.15. GlassRing gold upgraded (`#d4af37`, clearcoat, roughness 0.05). World: sharper key light, stronger shadow catcher, `VSMShadowMap`, glass ring env intensity fade target 2.5. DPR capped at 2.0 for all pointers.
- **SEO completeness**: added `<meta name=\"description\">` to `index.html` to satisfy Lighthouse SEO content-best-practice and improve search snippet quality.
- **Renderer hotfix**: fixed `ReferenceError: sizes is not defined` in `Renderer._ensureComposer()` by storing constructor/resize `sizes` on the instance (`this._sizes`) and using that for adaptive AA sample selection.
- **Mobile AA quality-gate**: `src/gl/Renderer.js` now disables composer RT MSAA on coarse-pointer devices (`samples: 0`) while keeping SMAA, reducing mobile GPU load/TBT risk without changing desktop AA profile.
- **TBT cleanup pass**: removed reserved `GlimpseGallery` from runtime boot loop and switched `MouseParallax` to lazy-load on fine-pointer devices only, trimming non-critical startup JS work.
- **Desktop hero text contrast tweak**: increased base `#hero-names` readability with slightly stronger `-webkit-text-stroke` and a subtle `text-shadow` so the contour is visible in desktop view.
- **Hero names readability parity**: added desktop-like subtle stroke/shadow treatment to mobile stacked `#hero-names` so lettering remains legible over bright/dark ring regions.
- **Hero names vertical spacing pass**: increased stacked mobile separation so `Катя` sits higher and `Артём` lower, with adjusted line-height/gap around central ampersand for clearer three-line composition.
- **Scope correction for hero stack mode**: restricted stacked `#hero-names` treatment to mobile coarse-pointer only (`max-width: 767px` + `pointer: coarse`) and increased mobile auto-fit target size for stronger visual presence.
- **Mobile hero wrap hardening**: enforced wrapped flex layout for `#hero-names` on coarse-pointer mobile and added rendered-width fallback shrink loop in `fitHeroNamesToViewport()` to prevent residual overflow on very narrow viewports.
- **Mobile hero title readability pass**: switched mobile `#hero-names` behavior from forced single-line shrink to larger multi-line layout (`white-space: normal`) with viewport-constrained auto-fit sizing, so text stays big and no longer overflows narrow screens.
- **Mobile hero title fit fix**: added viewport auto-fit logic for `#hero-names` (`fitHeroNamesToViewport()` in `src/main.js`) to shrink font-size on coarse-pointer phones until the single-line name block fits screen width; added defensive mobile `max-width` in `src/style.css`.
- **TBT-oriented startup deferral**: moved `bindGlassRingScrollEffects()` initialization from early boot to intro start in `src/main.js`, so expensive ScrollTrigger timeline wiring happens later and initial main-thread load is lighter.
- **Perf-oriented startup split**: `src/main.js` now lazy-loads `Cursor` only for fine pointers and lazy-loads `GalleryRibbon` on first gallery-open intent (`ensureGalleryRibbon()`), reducing initial JS startup pressure before hero narrative.
- **Lighthouse protocol note**: release checklist now explicitly requires auditing against `vite preview` / production URL (not `localhost` dev server), to avoid misleading TBT/LCP diagnostics from dev-module overhead.
- **P0 release-readiness package**: improved `.final-tagline` typography rendering (`font-smoothing`, kerning/ligature hints), moved gallery-close `ScrollTrigger.refresh()` to post-reflow timing (`requestAnimationFrame` in DOM-restore completion), and added mobile stress/refresh/RSVP checklist to `CONTEXT.md`.
- **CONTEXT hard cleanup**: removed legacy phase-history tail and rewrote `CONTEXT.md` into a concise 6-section current-state manifest (discipline, vision, stack map, implemented features, environment, next steps).
- **CONTEXT sync pass**: aligned `CONTEXT.md` with actual codebase state (HeroText no-op stub, current RSVP flow, asset status, and refreshed next steps) to remove stale handoff notes.
- **CONTEXT cleanup**: removed outdated next-step note about populating `public/photos/gallery/1.webp … 24.webp` (assets are already live and working).
- **HeroText current state fixed in docs**: `src/gl/world/HeroText.js` is documented as the actual no-op compatibility stub (`root/group/ready` API), while visible hero names are DOM `#hero-names`.
- **Asynchronous layered loading**: `ResourceLoader` — отложенные промисы на ассет (`waitFor(name)`), прогресс `resources:progress`, по завершении попыток загрузки — **`Promise.allSettled`** → `resources:ready` с `detail: { ok, failed, total }` (старт сцены от события не зависит; один упавший ассет не «ломает» агрегатный промис). `World` ждёт `envMap` и выставляет окружение; `tryFadeEnvReflections()` безопасно вызывается повторно при появлении материалов позже PMREM. `main.js`: ранние `GlassRing` + `HeroText`, `world.glassRing`, `bindGlassRingScrollEffects`, `MouseParallax`, затем `launchExperience` → `await heroText.ready` → прелоадер → `runHeroIntro`.
- Галерея: лёгкий автодрейф (`AUTO_SCROLL_WORLD_PER_SEC`), пауза после жеста/колеса и во вкладке в фоне.
- Перфоманс: `public/gallery-manifest.json` из `scripts/convert-images.js` — без 24× `Image()`; DPR cap coarse 1.5 / fine 2.0; на coarse pointer тени 512² и меньший `radius`.

---

## 2026-04-08

### Добавлено

- **`CHANGELOG.md`** — краткая история значимых правок для handoff (ИИ ↔ ИИ и люди).

### Изменено

- **Галерея (`GalleryRibbon.js`)** — нет одного общего `_stride` на все кадры. Зазор **`G = EDGE_GAP_FRAC × itemH`** между **краями** соседних фото постоянный; расстояние центр→центр = **`w_i/2 + G + w_{i+1}/2`** (`w = itemH × aspect`). Телепорт пула на **`_forwardPoolFrom` / `_backwardPoolFrom`**; нормировка скорости в шейдере — **`_velNorm ≈ loopLength/TOTAL`**. Пропорции всех 24 кадров по-прежнему зондируются лёгким **`Image()`** до открытия; уточнение ratio из GL-текстуры → **`_reflowPreserveAnchor()`** при заметном отличии от пробы.
- **`CONTEXT.md`** — описание галереи и **`await galleryRibbon.open()`**.

### Ранее по той же галерее (кратко)

- Pointer: `touch-action`, capture/cancel; **`main.js`**: async-открытие.
- **Resize** при открытой галерее: масштаб **`scroll`/offset** пропорционально **`itemH`**.
