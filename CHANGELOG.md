# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/). Версии не пронумерованы — проект без semver-релизов; даты фиксируют снимок для передачи контекста между сессиями.

## [Unreleased]

- **HeroText migrated to Troika SDF text**: `src/gl/world/HeroText.js` now builds `'Катя & Артём'` with `troika-three-text` (plus gold `&` overlay), preserving the same public API (`root`, `group`, `group.scale`, `_syncGoldEnvMap`, `destroy`) while removing `hero_text_opt.glb` dependency.
- **Asynchronous layered loading**: `ResourceLoader` — отложенные промисы на ассет (`waitFor(name)`), прогресс `resources:progress`, по завершении попыток загрузки — **`Promise.allSettled`** → `resources:ready` с `detail: { ok, failed, total }` (старт сцены от события не зависит; один упавший ассет не «ломает» агрегатный промис). `World` ждёт `envMap` и выставляет окружение; **`tryFadeEnvReflections()`** — плавное **`envMapIntensity`** для золота героя (1.5) и колец (0.9), **`WeakSet`** против дублей; на `main` после `heroText`/`glassRing` — повторные вызовы по `ready`. `HeroText` / `GlassRing` — каркас в сцене сразу, стартовый **`envMapIntensity: 0`** на золоте до фейда. `main.js`: ранние `GlassRing` + `HeroText`, `world.glassRing`, `bindGlassRingScrollEffects`, `MouseParallax`, затем `launchExperience` → `await heroText.ready` → прелоадер → `runHeroIntro`.
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
