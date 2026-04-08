# Changelog

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/). Версии не пронумерованы — проект без semver-релизов; даты фиксируют снимок для передачи контекста между сессиями.

## [Unreleased]

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
