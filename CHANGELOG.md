# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/). Версии не пронумерованы — проект без semver-релизов; даты фиксируют снимок для передачи контекста между сессиями.

## [Unreleased]

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
