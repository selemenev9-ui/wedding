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
- **WebGL look:** pure minimalist studio aesthetic. Atmospheric particle systems are removed; gallery renders close to source photo look (no permanent dark vignette/grain overlay), with subtle motion-only optical accents. Gold rings over a matte `StudioDome`; transparent DOM sections over fixed canvas.
- **Motion language:** one long-form ring/camera choreography across the page, with pinned DOM narrative beats and restrained easing (avoid noisy micro-jank).

## 3. Stack & Folder Structure

| Layer | Choice |
|------|--------|
| Build | Vite; production strips `console`/`debugger` via `esbuild.drop`. **GitHub Pages:** `.github/workflows/deploy-gh-pages.yml` runs `npm run build` with `secrets.VITE_RSVP_RELAY_URL` (and optional `VITE_RSVP_RELAY_SECRET`, `VITE_TG_*`) — without `VITE_RSVP_RELAY_URL` in repo secrets, production RSVP has no relay in the bundle. |
| 3D | Three.js `^0.183.2`; GLTF via `GLTFLoader` + Draco + Meshopt |
| Scroll | Lenis + GSAP + ScrollTrigger |
| Text splitting | SplitType |
| Post FX | Native WebGLRenderer (`antialias: true`). Removed EffectComposer to achieve 60fps and remove mobile GPU bottleneck. |
| Renderer | `alpha:false`, `antialias:true`, `powerPreference: high-performance`, clear `#EAE7DC`, `ACESFilmicToneMapping`, **`toneMappingExposure` `1.2`**; shadow map type `VSMShadowMap` (set on instance in `World`) |
| RSVP | Root `.env`: `VITE_TG_BOT_TOKEN`, `VITE_TG_CHAT_ID` (dev middleware); optional `VITE_RSVP_RELAY_URL` + `VITE_RSVP_RELAY_SECRET` (guest → relay → Telegram). Relays: `rsvp-relay/php/rsvp.php`, `rsvp-relay/google-apps-script`, or `rsvp-relay/server.mjs`. `vite.config.js`: `/api/rsvp` middleware, `/api/telegram` proxy |

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
public/photos/gallery/1.webp ... 16.webp
public/video/loop.mp4, loop.webm
public/models/ring_a.glb, ring_b.glb
public/hdri/studio_small_09_1k.hdr
public/og.webp (+ og-original.webp, og-telegram.webp)
public/OG_POLICY.md
public/CNAME
```

## 4. Implemented features (current, factual)

- **Layered boot:** scene, scroll orchestration, and core DOM animation setup are initialized at T+0; heavy assets load asynchronously via `ResourceLoader` deferreds and `waitFor(name)`. `GlassRing` / `HeroText` mesh hosts are constructed inside `requestIdleCallback` (fallback `setTimeout(0)`) so the first paint can complete before GLB/geometry work; `launchExperience()` awaits `meshInitPromise` then `heroText.ready`, then `document.fonts.load` for Playfair and Manrope before the preloader exits so SplitType metrics stay correct. **Resource preloading** (`index.html`): `preconnect` to `gstatic.com` for Draco; `preload` `as="fetch"` for hero HDRI and both `ring_a.glb` / `ring_b.glb` to tighten the critical network waterfall (LCP/TBT-oriented).
- **Progressive scroll choreography:** on preloader fade `onStart`, `bindGlassRingScrollEffects` (includes path `SplitType` char split + all ring `ScrollTrigger` timelines) runs on the next animation frame; wedding countdown `setInterval` starts only after `runHeroIntro` timeline completes (or resize-aborted intro) to trim main-thread contention during boot.
- **Gallery shader deferral:** `GalleryRibbon` constructs shared plane geometry and UI bindings at import time but builds the mesh pool + `ShaderMaterial`s in `initGpu()` on first `open()` only.
- **ScrollTrigger tuning:** `ScrollTrigger.config({ limitCallbacks: true })` in `Scroll.js` throttles internal scroll callback churn on mobile.
- **Resource preloading and async mesh initialization** are implemented to optimize LCP/TBT toward Lighthouse 90+ class compliance (see layered boot and `index.html` hints).
- **Startup TBT trim:** heavy ring scroll choreography wiring (`bindGlassRingScrollEffects` -> pinned timelines + master timeline) is deferred from early boot to intro start (`runHeroIntro`) so initial paint path does less main-thread setup work.
- **Startup JS trim (non-critical modules):** `MouseParallax` now lazy-loads only on fine-pointer devices; reserved `GlimpseGallery` is removed from startup/update path to reduce initial parse/execute overhead.
- **Frosted glass preloader:** `#preloader` is a frosted-glass overlay (`rgba(var(--color-page-bg-rgb), 0.6)` + `backdrop-filter` / `-webkit-backdrop-filter` blur) so the loading state inherits the live ACES-tonemapped WebGL backdrop instead of fighting it with a flat opaque panel.
- **Preloader sequence:** SVG arc listens to global `resources:progress`; `launchExperience` waits for `heroText.ready`, then Font Loading API (Playfair + Manrope), then fades the frosted preloader and runs `runHeroIntro()`.
- **StudioDome / HDRI isolation:** cyclorama `MeshStandardMaterial` uses `envMapIntensity: 0` so the matte dome fill stays on `#EAE7DC` and does not pick up hue shift when the scene environment map loads.
- **Hero ring intro motion:** glass rings scale in with `expo.out` over 3.2s (no elastic bounce); initial Y/Z rotation offset untwists to rest via `power3.out` in parallel with scale (same timing in timeline; deferred `glassRing.ready` path mirrors with standalone tweens).
- **Hero text architecture:** visible hero names are DOM (`#hero-names`) on all screens. `HeroText` is a zero-Three stub: `ready` resolves immediately, `goldMaterial` is `null`; no `root`/`group` in the scene (one fewer parallax/intro path). `World` keeps `heroText` for optional future env hooks only.
- **World resize orchestration:** `World.resize(width, height, pixelRatio)` drives `camera.resize`, `renderer.resize`, `glassRing?.resize`, and `galleryRibbon?.resize`; `main.js` window `resize` updates `Sizes` and calls `world.resize` (plus Lenis/native `scroll.resize()` and DOM `fitHeroNamesToViewport`).
- **Hero-name mobile-only stacked layout:** `fitHeroNamesToViewport()` now applies only on mobile coarse-pointer query (`(max-width: 767px) and (pointer: coarse)`), toggling `.hero-names--stacked` (`Катя` top, `&` center, `Артём` bottom). Desktop/tablet layouts remain unchanged.
- **Hero-name vertical separation tuning:** in `.hero-names--stacked`, top/bottom name parts now use stronger opposite Y offsets and tighter center ampersand line-height so `Катя` reads clearly above and `Артём` below with more visual air.
- **Hero-name readability parity:** mobile stacked hero names mirror the desktop diffused `text-shadow` glow (no stroke) for legibility over dark ring highlights.
- **Desktop hero-name readability:** base `#hero-names` relies on soft multi-layer pearl-toned `text-shadow` diffusion rather than outline tricks so letterforms stay clean over bright and dark ring areas.
- **Hero-name halo (DOM):** `#hero-names` and `#hero-names.hero-names--stacked` use only highly diffused layered `text-shadow` (no `-webkit-text-stroke`) so truffle type reads over dark WebGL without jagged overlap on the rings.
- **Ring choreography:** `src/modules/Scroll.js` builds pinned `pathDomTl` (`+=1500`) and `glimpseDomTl` (`+=3000`), then a full-page `masterTl` (`0..160`) for rings and camera (`z 6.5 -> 5 -> 4.85 -> 4.55`), with Act-I hero scale-out and mobile DOM name scrub-out.
- **Act I (Path):** full-viewport golden thread scrub + SplitType char choreography for two lines (`.path-text-1`, `.path-text-2`) inside pinned section; `.golden-thread` uses gold + bright core (`rgba(255,240,200)`), `filter: blur(1px)`, and layered `box-shadow` for a light-beam / bloom read (CSS-only).
- **Act II (Glimpse):** mask expansion + label fade + seamless looping video + gallery CTA reveal in pinned section. Video uses native HTML5 `<video>` with `autoplay muted loop playsinline` for living newspaper effect; GSAP crossfade tweens removed as video loops natively while container is pinned.
- **Gallery overlay mode:** open/close state toggles `body.gallery-active`, stops/starts Lenis, fades narrative DOM (excluding hero overlay), hides/shows glass rings, handles Escape close, and refreshes ScrollTrigger on close.
- **Lazy non-critical JS loading:** `Cursor` is dynamically imported only on fine-pointer devices; `GalleryRibbon` is dynamically imported on first gallery-open intent (`ensureGalleryRibbon()`), reducing initial startup JS work before hero/scroll narrative.
- **Magnetic UI & difference-blend cursor (fine pointer):** `#cursor` is a small white disc with `mix-blend-mode: difference` so it inverts against light or dark regions (DOM and canvas). `Cursor.js` pairs snappy `quickTo` follow (`0.1s`, `power3.out`) with GSAP magnetic displacement on `.editorial-btn` (`mousemove` pull toward pointer, `mouseleave` elastic return to origin) and hover scale on the broader interactive set.
- **Minimalist WebGL scope:** dormant particle layer removed (`Petals.js` deleted); no full-screen post stack or particles—**gallery-only** in-shader film grain (~4% luminance noise via `filmGrainHash`) keeps editorial clarity elsewhere.
- **GalleryRibbon:** infinite object pool (`POOL=7`, `TOTAL=16`), shader-based bend (`uVelocity`), rounded-corner fragment mask, lazy texture loading/caching, manifest-driven aspect ratios (`public/gallery-manifest.json`), adaptive teleport spacing by edge-gap math, drag/wheel momentum, idle autopan pause logic, throttled on-screen counter (`NN / 16`), and **hover feedback**: shared `World.raycaster` + NDC `World.mouse`, per-card `uHover` uniform (GSAP tweens only when the hit mesh changes). In idle/slow motion the fragment uses a near-source single-texture sample (no constant grain/vignette); chromatic split applies only at noticeable velocity. `#include <colorspace_fragment>` is enabled so ShaderMaterial output matches browser sRGB photo rendering. **Open choreography:** entry stagger **0.05s** and subtle `rotation.z` fan-in to flat. **Lifecycle:** `destroy()` disposes all `_texCache` textures and clears the map; `_resetState` / `close()` clear hover tweens and `uHover`.
- **Event details (live copy):** invitation date/time updated to **19 September 2026, 16:00**; destination switched to restaurant **"НАЛ"** (Советская ул., 1, село Большие Салы); destination block now includes a pre-ceremony "Выкуп невесты" sub-block (**14:00**, Сумский переулок, 7) with its own route link.
- **Dress code showcase:** `#section-dresscode` is a standalone DOM layer with frosted-shell rings, bilingual label, and four palette swatches (`Шоколад`, `Жемчуг`, `Роза`, `Фисташка`). GSAP reveals the shell and staggered swatches as the section scrolls into view; WebGL timelines remain untouched. `DressModel` owns the palette source of truth with separate `chipColor` for DOM swatches and ACES-compensated PBR `color` / `envMapIntensity`. The dress keeps `MeshPhysicalMaterial` for shadows/env/ACES integration but injects a local satin fabric grade through `onBeforeCompile`: per-preset `satinLift`, `satinContrast`, `satinSaturation`, `satinRim`, and `satinGlowColor` preserve base color while gently softening highlights, lifting only grazing folds, and adding cloth-like rim/thread glow during swatch morphs. Current reference pass keeps chocolate/rose/pistachio fixed and pushes only pearl away from white/grey porcelain into warmer champagne-ivory satin with reduced iridescence/env pickup; swatch dots use flat shadowing with no inset highlight.
- **Dress code mobile fit:** at `max-width: 767px` the section compacts into a single-screen vignette (`min-height: 100svh`, tighter padding, dress order pushed below copy) so the floating model and swatches are visible together without scroll.
- **Dress code responsive composition:** color/material presets are fixed; the latest layout pass keeps desktop/tablet dress scale tighter and shifted inward, clips the section rather than letting the model bleed into browser chrome, and resolves mobile swatch media-query conflicts so phone swatches stay in one compact row above the dress instead of becoming an oversized 2x2 grid over the model.
- **Dress code dress interaction:** `.dresscode-3d-wrap` is now a local drag target (`pointer-events:auto`, `touch-action:pan-y`) for horizontal dress rotation. `DressModel` keeps camera/Lenis untouched and replaces constant auto-spin with target rotation + inertia: horizontal pointer drags rotate the `_floatGroup`, release velocity decays back into a subtle idle spin, and vertical mobile scroll remains native.
- **Dress code Android load:** `DressModel` lazy init now runs on narrow coarse-pointer devices too; the old mobile skip was removed after real Android Opera testing showed the dress section stayed empty instead of loading the model.
- **Mobile readability + dress affordance:** guest feedback prompted a mobile micro-typography pass: small uppercase labels/date/address/button text are larger and higher contrast on narrow screens. Dresscode now includes an elegant hint (`Нажмите на оттенок, чтобы примерить его на платье`) above the swatches, and swatch dots have pointer affordance with subtle hover/active lift so guests understand the palette changes the dress.
- **Info section (Act III DOM beat):** refreshed info grid now focuses on lodging, gifts, and kid-free note with new frosted-card styling. Cards remain DOM-only, reveal via their own `ScrollTrigger`, and keep the WebGL `masterTl` isolated from DOM choreography. Desktop grid now auto-fits `minmax(18rem, 1fr)` so long Russian words never clip; headings have `hyphens:auto`.
- **Info section accessibility pass:** `#section-info` typography now uses larger base clamps (`.info-title` starts at `2rem`, `.info-text` at `1rem`) and tighter mobile card spacing (`gap: 2.5rem` under `992px`) so the editorial cards stay readable on phones without blowing up the layout rhythm.
- **World input (NDC):** `World` owns `THREE.Raycaster` + `THREE.Vector2` mouse; `main.js` updates `world.updateMouse(ndcX, ndcY)` on `mousemove` using current `sizes.width` / `sizes.height` so ray tests stay aligned with the WebGL viewport.
- **World/lighting:** singleton `World` (central WebGL resize + `glassRing` / optional `galleryRibbon` refs from `main.js`, plus shared `raycaster` / `mouse` for gallery hover and future picks), studio dome background, ambient + directional light, adaptive shadow map resolution (`coarse: 512`, `fine: 2048`) with `VSMShadowMap`, shadow catcher plane (`z=-1.5`, opacity `0.45`), PMREM environment setup, and guarded env-reflection fade on glass gold when available.
- **Mobile behavior:** coarse-pointer path uses native scroll shim in `Scroll.js` (with passive scroll->ScrollTrigger sync), canvas is non-intercepting (`pointer-events:none`), touch controls use `touch-action: manipulation`, hero/pinned sections use `svh/dvh` handling, pull-to-refresh preserved (no overflow lock on `html`).
- **Navigation/sections:** fixed nav with burger menu on small screens, three anchor links (`История`, `Галерея`, `Детали`), final section as scroll destination without nav item. Narrative DOM order is now hero -> path -> glimpse -> destination -> info -> final. `#site-nav` starts at `opacity: 0` with hero chrome and animates in during `runHeroIntro()` after `.hero-bottom`. **Mobile menu:** burger toggles `nav--menu-open` on `#site-nav`; overlay (`.nav-links.open`) and bar share `rgba(var(--color-page-bg-rgb), 0.92)` + `backdrop-filter: blur(20px)` for one continuous frosted sheet; nav anchors use smooth `transition` between targets.
- **RSVP delivery:** form reveal animation via GSAP; submit order: **localhost** → `POST /api/rsvp` (JSON); **production** → `POST` `VITE_RSVP_RELAY_URL` as **`application/x-www-form-urlencoded`** (`name`, `attendance`, optional `secret`). For **Google Apps Script** URLs (`script.google.com/macros/`), `fetch` uses **`no-cors`** so UI success does not require a readable CORS response (GAS often omits `Access-Control-Allow-Origin` on the response body). Other relays use `cors` + JSON `ok`. If relay URL set, no legacy direct Telegram from browser. Relays: GAS `Code.gs`, `php/rsvp.php`, Node `server.mjs`. Anti-spam: honeypot, min fill time, localStorage throttles. Success: shimmer on submit.
- **Guest personalization:** URL param `?guest=Имя` adds a hero greeting line (`<name>, будем рады видеть вас`), pre-fills RSVP name on reveal, and personalizes success confirmation text.
- **Metadata/OG:** absolute OG/Twitter meta tags in `index.html`; `public/og.webp` treated as immutable master per `public/OG_POLICY.md`.
- **Crawl baseline:** `public/robots.txt` now explicitly allows all crawlers (`User-agent: *`, `Allow: /`) to resolve Lighthouse parsing complaints on the single-page deploy; no sitemap is advertised yet.
- **SEO meta baseline:** `index.html` now includes explicit `<meta name="description">` for Lighthouse SEO completeness and better search snippet summary.
- **Accessibility landmark:** primary narrative sits in a single `<main id="main">` (after `#site-nav`) so auditors and screen readers get a documented main region; Lenis `html` classes do not replace this landmark. All major in-main sections expose explicit `aria-label`s (`История`, `Галерея`, `Детали`, `Важная информация`, `Финал и RSVP`) for assistive-tech clarity.
- **Accessibility contrast tuning:** muted UI copy (desktop nav links, countdown labels, destination meta labels, glimpse label, gallery counter, final date, and route-link accents) was darkened/lightened to improve WCAG contrast checks while keeping the same warm editorial palette.

## 5. Environment (scene/runtime constants)

| Item | Value |
|------|-------|
| Camera | Perspective `fov: 35`; resize updates aspect/projection only |
| Clear color | `#EAE7DC` opaque |
| Tone mapping | `ACESFilmicToneMapping`; exposure **`1.2` desktop / `1.1` coarse-pointer mobile** (`Renderer.js`) |
| Lights | Ambient `0.5`; Directional `1.05` at `(-4.0, 5.0, 4.0)` |
| Shadows | `VSMShadowMap`; coarse `512` + bias `-0.005` + radius `4`; fine `2048` + bias `-0.001` + radius `12` |
| Shadow catcher | Plane `25x25`, `ShadowMaterial opacity 0.45`, `z=-1.5`, receives shadows |
| DPR cap | **`2.0` max** — `Math.min(devicePixelRatio, 2.0)` on all pointers (`Sizes.js`) |
| AA | Native multisampling via `WebGLRenderer` `antialias: true` |
| Lenis | Desktop defaults: duration `2.0`, wheelMultiplier `0.8`, smoothWheel true, syncTouch true; coarse pointer uses native-scroll shim path |
| Rings timeline | Act I `0-30`, Act II `30-125`, Act III `125-145`, Act IV `145-160` |
| Act IV orbital (post-`#section-final` enter) | Root `glassRing.mesh.rotation.y` infinite loop **35s**; initial Z tilt **4.5s**, ease **`power2.inOut`** |
| Gallery | `TOTAL=16`, `POOL=7`, edge-gap fraction `0.055`, idle auto-pan `0.1 world units/s` |
| Glass ring (gold) | `MeshPhysicalMaterial`: **`roughness` `0.05`**, `metalness` `1`, **`clearcoat` `1`**, **`clearcoatRoughness` `0.02`**, **`ior` `2.5`**; initial `envMapIntensity` `0`, PMREM boost to **`1.6`** via `World.tryFadeEnvReflections()` only |

## 6. Next steps

- Optional: run real-device profiling (iPhone 13/14 class) on native renderer MSAA + VSM shadows and tune bias/radius if artifacts appear.
- Optional: polish Act IV final inertia/easing if artistic review wants stronger magnetic settle in Unity segment.
- Optional: add ultrawide guardrails for `.final-tagline` (hard width cap) if composition breaks on very wide screens.
- **Perf check:** with gallery open, spam-move the pointer over cards; expect stable FPS—raycast runs only while `container.visible`, only **7** meshes, and GSAP hover tweens fire on **hit change** only (not every raycast frame). Gallery grain is a few ALU ops/pixel in the existing ribbon shader (no extra RT/pass).
- Release readiness checklist:
  - [ ] Mobile stress-test: 3 full gallery cycles (`16` photos) on iOS/Android; verify no crash and no severe degradation.
  - [ ] Refresh sync: after gallery close, verify Act III/IV pins and scrub states are stable (no jumps/desync).
  - [ ] RSVP validation: with `VITE_RSVP_RELAY_URL` deployed, submit from RU mobile/Wi‑Fi and confirm Telegram receives the message (relay path, not direct `api.telegram.org` from browser).
  - [ ] Run Lighthouse against `vite preview` / production URL (not `vite dev`), then re-evaluate LCP/TBT priorities from that report.
