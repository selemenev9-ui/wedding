# Project context (save state)

## 1. Executor discipline (commands & directives)

- **Validate before execute:** before shell commands or edits, verify paths/APIs/versions against the real project. If a directive is known-invalid or based on false premises, stop and surface it plainly.
- **Do not ship mathematically wrong transforms:** if motion intent is in world/view space, do not blindly mutate local axes; verify parent-space alignment first.
- **Docs handoff is mandatory:** any meaningful change to boot order, loading, scroll, WebGL lifecycle, deploy, or interaction must update this file in the same session.
- **Changelog handoff:** meaningful state changes also get one short line under `CHANGELOG.md` in `[Unreleased]`.

## 2. Vision & Target Aesthetic

- **Goal:** premium Awwwards-style wedding experience with stable 60fps and predictable mobile behavior.
- **Global palette:** warm pearl base `#EAE7DC` synchronized across DOM background, preloader, `theme-color`, renderer clear color, and `StudioDome`.
- **Typography:** hero names via DOM `#hero-names` (Playfair), UI/system copy via Manrope, truffle primary text `#120c08`, muted labels in low-alpha truffle, restrained gold accents (`#8b6f3d`/`#9a7b4a`).
- **WebGL look:** gold rings in PBR style over a matte studio dome; transparent DOM sections over fixed canvas.
- **Motion language:** one long-form ring/camera choreography across the page, with pinned DOM narrative beats and restrained easing (avoid noisy micro-jank).

## 3. Stack & Folder Structure

| Layer | Choice |
|------|--------|
| Build | Vite |
| 3D | Three.js `^0.183.2`; GLTF via `GLTFLoader` + Draco + Meshopt |
| Scroll | Lenis + GSAP + ScrollTrigger |
| Text splitting | SplitType |
| Post FX | Native WebGLRenderer (`antialias: true`). Removed EffectComposer to achieve 60fps and remove mobile GPU bottleneck. |
| Renderer | `alpha:false`, `antialias:true`, clear `#EAE7DC`, `ACESFilmicToneMapping`, `exposure 1.15`; shadow map type `VSMShadowMap` (set on instance in `World`) |
| RSVP | Root `.env` with `VITE_TG_BOT_TOKEN`, `VITE_TG_CHAT_ID`; `vite.config.js` has `/api/rsvp` middleware and `/api/telegram` proxy |

Core map:

```text
CHANGELOG.md
CONTEXT.md
.env / .env.example
vite.config.js
index.html
src/main.js
src/style.css
src/modules/Scroll.js
src/gl/World.js
src/gl/Renderer.js
src/gl/Camera.js
src/gl/ResourceLoader.js
src/gl/world/StudioDome.js
src/gl/world/GlassRing.js
src/gl/world/HeroText.js
src/gl/world/GalleryRibbon.js
src/gl/world/GlimpseGallery.js
public/gallery-manifest.json
public/photos/gallery/1.webp ... 24.webp
public/photos/scroll/1.webp ... 3.webp
public/models/ring_a.glb, ring_b.glb
public/hdri/studio_small_09_1k.hdr
public/og.webp (+ og-original.webp, og-telegram.webp)
public/OG_POLICY.md
public/CNAME
```

## 4. Implemented features (current, factual)

- **Layered boot:** scene, scroll orchestration, and core DOM animation setup are initialized at T+0; heavy assets load asynchronously via `ResourceLoader` deferreds and `waitFor(name)`. `launchExperience()` awaits `document.fonts.load` for Playfair Display and Manrope before the preloader exits so SplitType measures final glyph metrics and FOUT-related layout break is avoided.
- **Startup TBT trim:** heavy ring scroll choreography wiring (`bindGlassRingScrollEffects` -> pinned timelines + master timeline) is deferred from early boot to intro start (`runHeroIntro`) so initial paint path does less main-thread setup work.
- **Startup JS trim (non-critical modules):** `MouseParallax` now lazy-loads only on fine-pointer devices; reserved `GlimpseGallery` is removed from startup/update path to reduce initial parse/execute overhead.
- **Preloader flow:** SVG arc listens to global `resources:progress`; `launchExperience` waits for `heroText.ready` (currently immediate stub resolve), then critical web fonts via Font Loading API, then fades preloader and runs hero intro timeline.
- **Hero ring intro motion:** glass rings scale in with `expo.out` over 3.2s (no elastic bounce); initial Y/Z rotation offset untwists to rest via `power3.out` in parallel with scale (same timing in timeline; deferred `glassRing.ready` path mirrors with standalone tweens).
- **Hero text architecture:** visible hero names are DOM (`#hero-names`) on all screens. `HeroText` is an API-compatible no-op Three.js stub (`root`, `group`, `ready`, `destroy`) so timelines and world hooks remain stable.
- **Hero-name mobile-only stacked layout:** `fitHeroNamesToViewport()` now applies only on mobile coarse-pointer query (`(max-width: 767px) and (pointer: coarse)`), toggling `.hero-names--stacked` (`Катя` top, `&` center, `Артём` bottom). Desktop/tablet layouts remain unchanged.
- **Hero-name vertical separation tuning:** in `.hero-names--stacked`, top/bottom name parts now use stronger opposite Y offsets and tighter center ampersand line-height so `Катя` reads clearly above and `Артём` below with more visual air.
- **Hero-name readability parity:** mobile stacked hero names now keep desktop-like subtle separation treatment (`-webkit-text-stroke` + lightweight text-shadow) for legibility over dark ring highlights.
- **Desktop hero-name readability bump:** base `#hero-names` stroke/shadow contrast is slightly strengthened (`-webkit-text-stroke` + subtle top text-shadow) so separation remains visible on bright and dark ring areas.
- **Ring choreography:** `src/modules/Scroll.js` builds pinned `pathDomTl` (`+=1500`) and `glimpseDomTl` (`+=3000`), then a full-page `masterTl` (`0..160`) for rings and camera (`z 6.5 -> 5 -> 4.85 -> 4.55`), with Act-I hero scale-out and mobile DOM name scrub-out.
- **Act I (Path):** full-viewport golden thread scrub + SplitType char choreography for two lines (`.path-text-1`, `.path-text-2`) inside pinned section.
- **Act II (Glimpse):** mask expansion + label fade + staged image crossfades + gallery CTA reveal in pinned section.
- **Gallery overlay mode:** open/close state toggles `body.gallery-active`, stops/starts Lenis, fades narrative DOM (excluding hero overlay), hides/shows glass rings, handles Escape close, and refreshes ScrollTrigger on close.
- **Lazy non-critical JS loading:** `Cursor` is dynamically imported only on fine-pointer devices; `GalleryRibbon` is dynamically imported on first gallery-open intent (`ensureGalleryRibbon()`), reducing initial startup JS work before hero/scroll narrative.
- **GalleryRibbon:** infinite object pool (`POOL=7`, `TOTAL=24`), shader-based bend (`uVelocity`), rounded-corner fragment mask with vignette, lazy texture loading/caching, manifest-driven aspect ratios (`public/gallery-manifest.json`), adaptive teleport spacing by edge-gap math, drag/wheel momentum, idle autopan pause logic, and throttled on-screen counter (`NN / 24`).
- **World/lighting:** singleton `World`, studio dome background, ambient + directional light, adaptive shadow map resolution (`coarse: 512`, `fine: 2048`) with `VSMShadowMap`, shadow catcher plane (`z=-1.5`, opacity `0.45`), PMREM environment setup, and guarded env-reflection fade on materials when available.
- **Mobile behavior:** coarse-pointer path uses native scroll shim in `Scroll.js` (with passive scroll->ScrollTrigger sync), canvas is non-intercepting (`pointer-events:none`), touch controls use `touch-action: manipulation`, hero/pinned sections use `svh/dvh` handling, pull-to-refresh preserved (no overflow lock on `html`).
- **Navigation/sections:** fixed nav with burger menu on small screens, three anchor links (`История`, `Галерея`, `Детали`), final section as scroll destination without nav item.
- **RSVP delivery:** form reveal animation via GSAP; submit path uses env-backed Telegram flow with HTML-escaped payload: local tries `POST /api/rsvp` then direct Telegram fallback (`no-cors`), production static host uses direct fallback path.
- **Metadata/OG:** absolute OG/Twitter meta tags in `index.html`; `public/og.webp` treated as immutable master per `public/OG_POLICY.md`.
- **SEO meta baseline:** `index.html` now includes explicit `<meta name="description">` for Lighthouse SEO completeness and better search snippet summary.

## 5. Environment (scene/runtime constants)

| Item | Value |
|------|-------|
| Camera | Perspective `fov: 35`; resize updates aspect/projection only |
| Clear color | `#EAE7DC` opaque |
| Tone mapping | `ACESFilmicToneMapping`, exposure `1.15` |
| Lights | Ambient `0.5`; Directional `1.05` at `(-4.0, 5.0, 4.0)` |
| Shadows | `VSMShadowMap`; coarse `512` + bias `-0.005` + radius `4`; fine `2048` + bias `-0.001` + radius `12` |
| Shadow catcher | Plane `25x25`, `ShadowMaterial opacity 0.45`, `z=-1.5`, receives shadows |
| DPR cap | `Math.min(devicePixelRatio, 2.0)` (all pointers) |
| AA | Native multisampling via `WebGLRenderer` `antialias: true` |
| Lenis | Desktop defaults: duration `2.0`, wheelMultiplier `0.8`, smoothWheel true, syncTouch true; coarse pointer uses native-scroll shim path |
| Rings timeline | Act I `0-30`, Act II `30-125`, Act III `125-145`, Act IV `145-160` |
| Gallery | `TOTAL=24`, `POOL=7`, edge-gap fraction `0.055`, idle auto-pan `0.1 world units/s` |

## 6. Next steps

- Optional: run real-device profiling (iPhone 13/14 class) on native renderer MSAA + VSM shadows and tune bias/radius if artifacts appear.
- Optional: polish Act IV final inertia/easing if artistic review wants stronger magnetic settle in Unity segment.
- Optional: add ultrawide guardrails for `.final-tagline` (hard width cap) if composition breaks on very wide screens.
- Optional: gallery center-card hover microinteraction (raycast + subtle scale/label), only if perf budget stays safe.
- Release readiness checklist:
  - [ ] Mobile stress-test: 3 full gallery cycles (`24` photos) on iOS/Android; verify no crash and no severe degradation.
  - [ ] Refresh sync: after gallery close, verify Act III/IV pins and scrub states are stable (no jumps/desync).
  - [ ] RSVP validation: submit from a real mobile device and confirm Telegram delivery path works as expected.
  - [ ] Run Lighthouse against `vite preview` / production URL (not `vite dev`), then re-evaluate LCP/TBT priorities from that report.
