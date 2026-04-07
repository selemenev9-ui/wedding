# Project context (save state)

### Executor discipline (commands & directives)

- **Validate before execute:** Before running shell commands or applying edits from a user directive, check that steps match the real project (paths, APIs, package versions). If a command or change is **known to fail** (invalid syntax, wrong tool flags, APIs that do not exist for this stack) or rests on **false premises** (wrong file locations, invented APIs), **stop** and surface the issue — do **not** blindly apply.
- **Logic / math / transform space:** If a directive **contradicts Three.js (or similar) invariants**, or is **internally inconsistent**, **say so plainly**, **do not ship a wrong “fix”**, and **record the correct rule here** (or in code comments near the fix).
- **Axis labels ≠ screen axes:** `Object3D.position.{x,y,z}` are **parent-local**. **World / camera “up”** is **not** “always local Y” — parent **rotation** (e.g. **`rotation.x = π/2`** on the glTF root) remaps axes so a naive **`position.y += δ`** can move geometry along **depth** instead of **screen vertical**. For “stack on mobile”, define the intent in **world** (e.g. **±world Y**) or **view space**, then apply **`addScaledVector(R_parent⁻¹·û_world, δ)`** (or equivalent `worldToLocal`), **not** blind increments on a single local axis unless you’ve proven alignment.

## Phase: Act II Ribbon — Infinite Object-Pool WebGL Gallery with Bend Shader

The classic template (story cards, location/map, DOM gallery, wishes form, lightbox) is **removed**. The page is **hero + three narrative sections + final**, driven by **3D rings**, **3D hero lettering** on desktop, and DOM **tagline** + **`#hero-names`**: **`main.js`** **`setupHeroTextMedia`**: **`matchMedia('(max-width: 767px)')`** — mobile **`heroText.root.visible = false`**, **`gsap.set`** DOM visible; desktop WebGL on, DOM hidden. **`change`** listener for breakpoint crosses.

### `.env` at project root (required)

- The file **`.env` exists in the repository root** (same level as `package.json`, `vite.config.js`, `index.html`). It is **gitignored** and must be created locally (copy from `.env.example` if needed).
- **Keys:** `VITE_TG_BOT_TOKEN`, `VITE_TG_CHAT_ID` — loaded by Vite into `import.meta.env` for the client RSVP flow; **`vite.config.js`** also proxies **`/api/telegram` → `api.telegram.org`** (dev / preview) and may use the same vars in **`POST /api/rsvp`** middleware.
- **Token fix:** `VITE_TG_BOT_TOKEN` was corrected — the segment after `…u1` must be **`FlXZZ5`** (lowercase **`l`**, letter **`X`**), not **`FIXZZ5`** (capital **`I`** misread for **`l`**). Wrong character caused Telegram `401 Unauthorized`.

## 0. Vision & Target Aesthetic

- **Target**: Awwwards SOTD direction; stable 60fps. **DOM perf:** no permanent **`will-change`** on SplitType glyph nodes (`.hero-tagline .word`, `.path-text .char`; hero names are **3D**, not SplitType chars). Reduces extra compositing layers at rest.
- **Palette (light premium)**: **DOM + WebGL studio unified warm base** **`#EAE7DC`** — `html/body`, `#preloader`, `theme-color` meta, CSS `--color-page-bg` / `--color-page-bg-rgb` (234, 231, 220); matches `Renderer.setClearColor` + **`StudioDome`**. **Typography/UI**: **3D names** truffle `#120c08` (**HeroText** matte **`DoubleSide`**); **3D ampersand** gold **`#e0b354`** — **`envMap`** = **`scene.environment`** (PMREM from **`envMap`** HDRI), **`envMapIntensity 1.5`**, **`metalness 1`**, **`roughness 0.12`**; DOM **tagline** / path / final — **no `text-shadow`** on `.hero-tagline`, `.path-text`, `.final-tagline`; **`#hero-names`**: **desktop** **`display:none !important`** (no DOM/WebGL double text); **mobile** **`setupHeroTextMedia`** + intro / **`masterTl`** scrub. Muted `rgba(18,12,8,0.45–0.5)`; accent gold `#8b6f3d` / `#9a7b4a`. Glass rings: `#e0b354` PBR. Sections transparent over fixed WebGL.
- **Ring choreography — single `masterTl`** (`trigger:'body'`, `end:'bottom bottom'`, `scrub:1.5`). **Initialized only after `pathDomTl` and `glimpseDomTl`** so `body` scrub range includes **`+=1500`** (Act I) and **`+=3000`** (Act II) pinSpacing. **Act I (0→30):** **`world.heroText.root.scale`** **`1→0`** with **`power2.inOut`** — 3D hero names clear before Act II crossover / path section “Две истории…”. **Mobile (`max-width:767px`):** same segment **`fromTo`** on **`#hero-names`** **`{ opacity:1, y:0, scale:1 }` → `{ opacity:0, y:50, scale:0.9, power2.inOut }`**, **`duration:30`**, `@0` — DOM names sink/fade with Act I.
  - Timeline **absolute span 0 → 160**; Act II crossover **`dur 95`** (slow rings during glimpse photo pin).
  - **(pos 0, dur 30)** Act I — curtain; **(pos 30, dur 95)** Act II — crossover; **(pos 125, dur 20)** Act III — Unity; **(pos 145, dur 15)** Act IV — persist + yaw.
  - Camera on same masterTl: `z 6.5 → 5 → 4.85 → 4.55`.
- **DOM ScrollTriggers**:
  - `#section-path`: `pathDomTl`, `pin:true`, `end:'+=1500'`, `scrub:1.2`.
  - `#section-glimpse`: `glimpseDomTl`, `pin:true`, `end:'+=3000'`, `scrub:1` — timeline **0–100** + button overlap: mask **0–40** (`power2.inOut`); **`.glimpse-label`** `autoAlpha:0`, `y:-12` same **0–40**; `.glimpse-img-2` **opacity 1** **40–70**; `.glimpse-img-3` **70–100**; `#btn-open-gallery` tween **unchanged** (`autoAlpha`, `y:-10`, `dur 15`, `'-=10'`). `gsap.set` img-2/3 `opacity:0`; btn `autoAlpha:0`; label `autoAlpha:1` prep.
  - **Act III** `.destination-content`: `gsap.to` + ScrollTrigger `trigger:'#section-destination'`, `start:'top 75%'`, `end:'center center'`, `scrub:true`, `autoAlpha:1`, `y:0`, `ease:'none'`.
  - **Act IV** `.final-date`, `.final-tagline`: `gsap.to` array + stagger `0.15`, `trigger:'#section-final'`, `start:'top 60%'`, `end:'bottom 90%'`, `scrub:true`, `ease:'none'`. Initial `gsap.set` with `.destination-content` shares `autoAlpha:0`, `y:30`.
- `matchMedia`: desktop vs mobile `X`/`S` multipliers; `floatA`/`floatB` perpetual `rotation.y` (~52s / ~60s).
- **Lenis** defaults: `duration:2.0`, exponential easing, `wheelMultiplier:0.8`, `smoothWheel:true`, `autoRaf:false`. **Single frame source:** `gsap.ticker.add` drives **`lenis.raf(time * 1000)`** then **`world.update()`**, `glimpseGallery`, `galleryRibbon`, `glassRing`, `mouseParallax`, and scroll-velocity smoothing — **no separate `requestAnimationFrame`** loop (avoids micro-desync vs WebGL).

## 1. Stack and folder structure

| Layer | Choice |
|--------|--------|
| Build | Vite |
| Post FX | **Balanced AA stack:** `RenderPass` → `SMAAPass` → `OutputPass` (**no bloom**). **`EffectComposer`** **`WebGLRenderTarget`** **`samples: 8`** (MSAA 8×) + **`SMAAPass`**. `HalfFloatType`. WebGL: `alpha: false`, **`setClearColor('#EAE7DC', 1)`**. **`shadowMap`**: **`PCFSoftShadowMap`**. `antialias:false` on canvas (AA = MSAA + post AA). **Canvas CSS footprint lock:** after `setSize`, renderer sets `domElement.style.width/height = ${sizes.width/height}px` (constructor + `resize`) for Windows scaling / DPR consistency. |
| 3D | Three.js (~0.183); **glTF** via **`GLTFLoader`** + **Draco** + **`MeshoptDecoder`** (`EXT_meshopt_compression` / `KHR_meshopt_compression`) — **no baked AO textures** on hero text; lean geometry + compression for FPS |
| Scroll | Lenis, GSAP + ScrollTrigger |
| RSVP / Telegram | **Root `.env`** → `VITE_TG_*`. **`main.js`**: `fetch('/api/telegram/bot…/sendMessage?…')` — **Vite `server.proxy` / `preview.proxy`** forwards to **`api.telegram.org`** (replaces unstable **AllOrigins**). Debug logs retained. Optional **`POST /api/rsvp`** middleware still in `vite.config.js`. |

```
.env (root, gitignored)           # MUST exist locally: VITE_TG_BOT_TOKEN, VITE_TG_CHAT_ID — see § top
.env.example                      # Template without secrets
vite.config.js                    # proxy `/api/telegram` → api.telegram.org; plugin POST `/api/rsvp` → Telegram
index.html                         # OG meta, preloader, hero, Act I–III + final + #gallery-overlay
src/main.js                        # GSAP ticker; **`setupHeroTextMedia`** (`matchMedia`); HeroText intro; GlassRing; tagline SplitType
src/gl/World.js                    # Singleton; `heroText` ref; StudioDome; lights; shadow catcher; dispose all
src/gl/Camera.js                  # PerspectiveCamera **fov 35**; `resize`: **`aspect`** + **`updateProjectionMatrix`** only (`position` — **Scroll.js** `masterTl`)
src/gl/Renderer.js                 # EffectComposer + MSAA RT (samples:8) → Render → SMAA → Output; clear `#EAE7DC`
src/utils/Sizes.js                 # dynamic DPR with desktop supersample: fine pointer `devicePixelRatio*1.5` capped at 2; coarse pointer capped at 2 (+ main `resize` sync)
src/gl/world/StudioDome.js         # Massive BackSide sphere; matte `#EAE7DC`; `receiveShadow: false`
src/style.css                      # hero mobile: `#hero-names` Playfair + flex void; glimpse; pins
src/modules/Scroll.js              # pathDomTl → glimpseDomTl (pin +=3000) → masterTl (0–160, Act II dur 95)
src/gl/world/GlimpseGallery.js     # WebGL DOM-bridge (no active trackers; reserved)
src/gl/world/GalleryRibbon.js      # Infinite Object-Pool carousel + bend shader
src/gl/world/HeroText.js           # hero_text_opt.glb — Meshopt; cast yes / receive no; intro scale
src/gl/ResourceLoader.js           # HDRI, textures, fonts; GLTF + Draco + MeshoptDecoder
public/photos/scroll/              # 1.webp, 2.webp, 3.webp — Act II cascade
public/photos/gallery/             # 1.webp … 24.webp — full ribbon gallery
public/photos/                     # 5.webp, 12.webp (legacy)
public/og.webp                     # Open Graph share image 1200×630 (`og:image:width` / `:height` in index)
public/CNAME                       # GitHub Pages custom domain mapping: `katyartemwedding.ru`
public/models/                     # ring_a.glb, ring_b.glb, hero_text_opt.glb (Meshopt — required for load)
```

## 2. Implemented features (current)

- **Intro**: preloader fade → `bindGlassRingScrollEffects`, `lenis.start()`, **`heroIntroTimeline`** (**`defaults: { ease: 'power3.out' }`**): rings `elastic.out` scale + **`HeroText.group.scale`** `0→1` **`expo.out`** (~1.15s) when WebGL hero on; bottom cluster is animated via **`.hero-bottom`** (`opacity`/`y` only — no GSAP `x`/`xPercent`, centering comes from CSS `left:50% + translateX(-50%)`); mobile `#hero-names` remains separate; **`.hero-tagline`** SplitType words still fade in aligned to intro; scroll indicator after. **`isHeroMobile` in `runIntro` now uses `matchMedia('(max-width: 767px) and (pointer: coarse)')`**. Duplicate consecutive `.hero-bottom` `fromTo` was removed (single tween remains). **`ScrollTrigger.refresh()`** on intro **complete**. **MouseParallax**: rings + **`heroText.root`**. **`gsap.ticker`** drives Lenis + **`world.update()`**.
- **Mobile hero-name state surgery (single-controller + disappearance fix)**: root cause of “appears then vanishes” was `runIntro` mobile tween using `clearProps: 'all'` on `#hero-names`, which restored CSS base `opacity: 0` after intro. Introduced a single state helper in `main.js` (`setHeroNamesState`) plus shared query constant (`HERO_MOBILE_QUERY`) to centralize mobile HTML-name visibility/transform handling (`opacity`, `y`, `scale`, `xPercent/yPercent`, `pointerEvents`). `setupHeroTextMedia`, `runIntro`, and `handleHeroSplitResize` now call this helper (no scattered ad-hoc sets). Mobile intro keeps final visible state (no clearProps reset). In `Scroll.js`, mobile scrub condition is aligned to coarse-pointer query (`(max-width: 767px) and (pointer: coarse)`) and keeps `immediateRender:false` to avoid startup side-effects.
- **Header / hero (P1)**: `#site-nav.nav--scrolled` — frosted bar `background: rgba(253,251,247,0.25)`, `backdrop-filter: blur(16px)`. `.nav-logo` — Manrope, small caps (`0.62rem`, `font-weight:600`, `text-transform:uppercase`, `letter-spacing:0.2em`). **`#hero-overlay`**: `gsap.fromTo` + ScrollTrigger `trigger:'body'`, `start:'top top'`, `end:'+=800'`, `scrub:true` — opacity `1→0`, `y` `0→-56` (`ease:'none'`). **`nav--scrolled`**: `ScrollTrigger.create` on `body`, `start:'top -80px'`, `toggleClass` on `#site-nav`. **`.hero-overlay__inner`**: **`position:relative`**, **`width/height:100%`**, **`min-height:100vh`**, no flex centering; children absolutely positioned — **`.hero-tagline`** top rail (**`top: clamp(48px,10vh,96px)`**, `font-size: clamp(0.75rem,1.8vw,1rem)`, `letter-spacing:0.28em`, `color: rgba(18,12,8,0.62)`); **new `.hero-bottom` wrapper** groups **`.hero-date` + `#countdown`** (`position:absolute`, `bottom: clamp(20px,5vh,56px)`, centered, column flex, gap clamp) so date always sits above numbers without overlap; **`.hero-date`** now static inside wrapper (keeps typography styles only); **`#countdown`** keeps row layout/gap styles; **`.hero-scroll-indicator`** stays outside wrapper at `bottom: 8px + safe-area`; **`#hero-names`** mobile vertical center (`top/left 50%` + GSAP **`xPercent`/`yPercent`**). Pointer-gated behavior is aligned in both CSS and JS: `setupHeroTextMedia` and `handleHeroSplitResize` use **`matchMedia('(max-width: 767px) and (pointer: coarse)')`**; CSS compact hero overrides activate only on **`@media (max-width:767px) and (pointer: coarse)`**. In that touch block: **`.hero-bottom`** `bottom: clamp(12px,3vh,28px)`, `gap: 0.5rem`; **`#hero-names`** **`font-size: min(clamp(3rem,30vw,7.5rem),28vh)`** (still larger than earlier baseline but constrained to avoid overlap with `.hero-bottom` on real devices), `line-height:1.05`, `will-change`.
- **Hero DOM name scale (base style update)**: in `src/style.css`, base `#hero-names` (outside media queries) `font-size` changed from **`clamp(2.5rem, 12vw, 5rem)`** to **`clamp(2.5rem, 20vw, 7rem)`**. Mobile coarse-pointer override block remains unchanged.
- **Open Graph / share**: `index.html` head uses absolute HTTPS metadata for stable crawlers/cards: `og:url` = **`https://katyartemwedding.ru/`**, `og:site_name`, `og:image` + `og:image:secure_url` = **`https://katyartemwedding.ru/og.webp?v=3`**, `og:image:type` `image/webp`, dimensions **1200×630**, `og:type: website`. Added `twitter:card=summary_large_image` + `twitter:title/description/image`. `public/og.webp` is replaced with Telegram-safe centered composition derived from generated variant 2 (same premium style, safer crop behavior).
- **Header nav** (`index.html` `.nav-links`): **three links only** — **История** → `#section-path`, **Галерея** → `#section-glimpse`, **Детали** → `#section-destination` (location + RSVP live below; **`#section-final`** outro has **no** nav item). Lenis / `scrollIntoView` unchanged for listed anchors. **`#section-final`** landmark: **`aria-label="RSVP"`** (closing / RSVP emotional block; reach by scroll).
- **World** (Singleton: guard → **config validation** → `World.instance`; `getWorld()`), **`heroText`**: nullable ref set from **`main.js`** on `resources:ready` ( **`HeroText`** instance). **`studioDome`**: **`StudioDome`** — **`init({ scene })`** then **`scene.add(mesh)`**; **`dispose()`** removes mesh + disposes geo/material before teardown. **Lights**: **`AmbientLight`** `0xffffff, 0.5` (fill); **`DirectionalLight`** `0xffffff, 1.05` (~34% softer than former 1.6), **`position.set(-2.5, 4.5, 3.5)`** (top-left softbox — ring silhouette on wall, not edge “pill”), **`castShadow: true`**, shadow map **2048×2048**, camera **near 0.5 / far 25**, ortho **±6** (hero ~±1.5 world XY), **`bias -0.001`**, **`shadow.radius = 12`** (heavy blur for ~2 unit ring→wall gap; Three **r183** uses `PCFShadowMap` when `PCFSoftShadowMap` requested — `radius` still softens). **Shadow catcher**: **`PlaneGeometry(25, 25)`** + **`ShadowMaterial`** `opacity: 0.28` (soft atmospheric darkening), **`position.z = -1.5`** (clear of rear ring absolute z ≈ **-0.85**), **`receiveShadow: true`** — only surface that receives shadows (dome off). **`destroy()`**: remove catcher, dispose geometry + material. **ResourceLoader**: HDRI, **ringA/B** + **`heroText`** **`/models/hero_text_opt.glb`**, **Draco** + **`MeshoptDecoder`** on **`GLTFLoader`**. **GlassRing** (PBR gold). **Hero resting positions**: `groupA(-0.35, 0.1, 0.5)`, `groupB(0.28, -0.1, -0.5)` — **1.0 unit Z separation**.
- **Studio dome (cyclorama)**: **`StudioDome`** — `SphereGeometry(40, 64, 64)`, **`MeshStandardMaterial`** `color #EAE7DC`, **`side: BackSide`**, `roughness 1`, `metalness 0`; **`mesh.receiveShadow = false`** (no dome shadow calc / artifacts).
- **Renderer / post**: **`EffectComposer`** with **`WebGLRenderTarget`** **MSAA `samples: 8`** + **`HalfFloatType`**, then **Render → SMAA → Output** (**`UnrealBloomPass` removed**). **`setClearColor('#EAE7DC', 1)`**, `alpha: false`; **`shadowMap`** **on**, **`PCFSoftShadowMap`**; scene fill = **StudioDome** interior. **DPR:** **`src/utils/Sizes.js`** and **`resize`** in **`main.js`** — dynamic desktop supersample: fine pointer/desktop **`Math.min(window.devicePixelRatio * 1.5, 2)`**, coarse pointer/mobile **`Math.min(window.devicePixelRatio, 2)`** (not `src/gl/Sizes.js`).
- **HeroText** (`src/gl/world/HeroText.js`): **`this.root`** public **`THREE.Group`**. **`hero_text_opt.glb`** — **`_normalizeToScene(gltf.scene, 2.8)`**, **`root.position (0, 0.28, 1.5)`**, **`group.scale`** `0` → intro GSAP. **`root.visible`** — **`main.js`** **`setupHeroTextMedia`**. **Materials:** **`truffleMaterial`** — **`MeshStandardMaterial`** `#120c08`, **`roughness 1`**, **`metalness 0`**, **`envMapIntensity 0`**, **`envMap null`**, **`side: DoubleSide`**; **`goldMaterial`** — **`MeshPhysicalMaterial`** `#e0b354`, **`metalness 1`**, **`roughness 0.12`**, **`envMapIntensity 1.5`**, **`envMap`** synced from **`scene.environment`** (**`_syncGoldEnvMap`**, microtask retry if env not ready). Traverse: **`ampersand`** in **`mesh.name`** or **`material.name`** → gold; else truffle; **truffle-only** meshes **`scale.multiplyScalar(1.001)`**. **`rotation.x = π/2`**, **`castShadow`**, **`receiveShadow: false`**.
- **HeroText** (`src/gl/world/HeroText.js`): **`this.root`** public **`THREE.Group`**. **`hero_text_opt.glb`** — **`_normalizeToScene(gltf.scene, 2.8)`**, **`root.position (0, 0.28, 1.5)`**, **`group.scale`** `0` → intro GSAP. **`root.visible`** — **`main.js`** **`setupHeroTextMedia`**. **Materials:** **`truffleMaterial`** — **`MeshStandardMaterial`** `#120c08`, **`roughness 1`**, **`metalness 0`**, **`envMapIntensity 0`**, **`envMap null`**, **`side: FrontSide`** (surgical aliasing mitigation to remove back-face edge artifacts on thin hero glyphs), **`dithering: false`** (to remove potential temporal grain on dark text over bright background); **`goldMaterial`** — **`MeshPhysicalMaterial`** `#e0b354`, **`metalness 1`**, **`roughness 0.12`**, **`envMapIntensity 1.5`**, **`envMap`** synced from **`scene.environment`** (**`_syncGoldEnvMap`**, microtask retry if env not ready). Traverse: **`ampersand`** in **`mesh.name`** or **`material.name`** → gold; else truffle; truffle glyph meshes now keep authored scale (**removed previous `scale.multiplyScalar(1.001)` micro-offset to reduce temporal edge crawl**). **`rotation.x = π/2`**, **`castShadow: false`** (anti-crawl test for text edges), **`receiveShadow: false`**.
- **GlassRing shadows**: each ingested glTF **`Mesh`** gets **`castShadow = true`**; **`receiveShadow`** not set on rings (performance).
- **Act I** — `#section-path` `100vh` pinned (`pin:true, end:'+=1500'`). **`pathDomTl` base-100**: thread `scaleY 0→1` dur **100** @0; path copy via **SplitType chars** (stagger in/out, see Phase 2). `.path-text` — single line (**`nowrap`**), fluid **`clamp(1.5rem, 5vw, 3.5rem)`**, full width + **`5vw`** horizontal padding so `overflow:hidden` doesn’t clip first/last glyphs. `.golden-thread` CSS **full-viewport spine**: `height:100vh`, `transform-origin: top center` (matches GSAP `scaleY`).
- **Act II** — `#section-glimpse` `min-height:100vh`; scroll depth from **`pin: true`, `end: '+=3000'`** on `glimpseDomTl`.
  - **CSS stacking**: `.glimpse-pin-container` — `position:relative`, `height:100vh`, flex center, `overflow:hidden` (no column flex — mask is not pushing the button).
  - `.glimpse-expand-mask` — `position:relative`, `overflow:hidden`; `30vw` / `aspect-ratio:3/4`; GSAP → full viewport.
  - `.glimpse-img` — **viewport window**: `100vw`×`100vh`, centered with `left/top 50%` + `translate(-50%,-50%)`; base **`object-fit: cover`** (portrait / narrow viewports — mobile stays edge-to-edge); **`@media (min-aspect-ratio: 1/1)`** → **`object-fit: contain`** on landscape/desktop so vertical photos show full frame with side negative space, no awkward crop.
  - `.glimpse-img-1/2/3` — z-index 1/2/3; CSS **opacity** 1 / 0 / 0.
  - `.glimpse-action` — absolute over mask (`bottom:8vh`, centered). **`#btn-open-gallery`** (`.glimpse-action .editorial-btn`) — **P1 contrast**: solid **`#120c08`** background, ivory **`var(--color-page-bg)`** text; darker hover + light focus ring (overrides shared glass `.editorial-btn`).
  - **`glimpseDomTl`**: 0–40 mask + **`.glimpse-label`** fade → 40–70 / 70–100 opacity crossfades → same button tween as before.
- **Gallery UI State Toggle** (`main.js`):
  - **Safe DOM hide**: `#site-nav`, `#section-path`, `#section-glimpse`, `#section-destination`, `#section-final`, `.section-divider` only — **`#hero-overlay` excluded** so the ScrollTrigger-scrubbed hero overlay is not forced back to visible on gallery close.
  - Tweens: **`opacity: 0`** + **`pointerEvents: 'none'`** open (0.6s); **`opacity: 1`** + **`pointerEvents: 'auto'`** close (0.5s) — no `autoAlpha` on layout boxes; **no** gallery close hook touching `#hero-overlay`.
  - Open: `lenis.stop()` → **`document.body.classList.add('gallery-active')`** → overlay in + DOM fade; `glassRing.mesh.visible=false`; `galleryRibbon.open()`.
  - Close: `document.body.classList.remove('gallery-active')` → overlay out + DOM restore → `galleryRibbon.close` → rings back → `lenis.start()` → **`ScrollTrigger.refresh()`**.
  - Open adds **`gallery-active`** on `document.body`. **Escape**: global `keydown` — if `e.key === 'Escape'` and body has `gallery-active`, **`btnCloseGallery.click()`** (same path as button close).
  - `#gallery-overlay`: fixed, transparent background, z-index 100 (close control).
- **Shared `.editorial-btn`**: transparent, truffle text `#120c08`, `border: 1px solid rgba(18,12,8,0.22)`, `padding:12px 32px`, `border-radius:30px`, `backdrop-filter:blur(8px)`, uppercase, `letter-spacing:0.22em`.
- **GlimpseGallery** (`src/gl/world/GlimpseGallery.js`): finds no `.glimpse-tracker` nodes (old bounding-box replaced). Idle; reserved.
- **GalleryRibbon** (`src/gl/world/GalleryRibbon.js`) — Infinite Object-Pool WebGL carousel:
  - **Pool**: `POOL=7` `THREE.Mesh` objects sharing one `PlaneGeometry(1, 1.5, 32, 32)`. Added to a `THREE.Group container` — `visible=false` at construction.
  - **Zero init-time textures**: construction creates only dark-fallback-textured meshes. No HTTP requests.
  - **Per-texture aspect** (`_ratioByIdx`): on decode, `ratio = image.width / image.height`; `_applyScale(mesh)` uses `PlaneGeometry(1,1.5)` math: world height `_itemH` (80% frustum) → `scale.y = _itemH/1.5`, `scale.x = _itemH * ratio` (correct proportions, no stretch).
  - **Stride / gap**: `_stride = _itemH * _maxRatio + gap` where `_maxRatio` is the max ratio among loaded images (pool spacing fits the widest card); `gap = _itemH * 0.06`. When a new max ratio arrives, `_rebalanceOffsets()` recentres pool slots.
  - **Lazy loader** (`_applyTexture(mesh, idx)`): cache / pending / load; on resolve: store ratio, update `_maxRatio`, recompute stride, rebalance if needed, apply texture + `_applyScale` to matching meshes.
  - **`open()`**: `_syncMaxRatioFromCache()` → `_computeLayout()` → `_resetState()` → `container.visible = true` → `_applyTexture` for 7 slots → staggered `uOpacity`.
  - **`close(onComplete)`**: GSAP `uOpacity: 1→0` per mesh (staggered) → on timeline complete: `container.visible = false` → `onComplete()` (used to restore GlassRing).
  - **Infinite loop** in `update()`: per mesh, `worldX = scrollCurrent + offset`. If `worldX < -halfBound`: `offset += POOL*stride`, `imgIdx = (imgIdx+POOL)%TOTAL`, lazy-load. If `worldX > halfBound`: reverse. Result: seamless ring with no overlap.
  - **Frustum layout** (`_computeLayout()`): sets `_itemH` from camera FOV/z; `_recomputeStride()` couples stride to `_maxRatio` + proportional gap.
  - **Shader uniforms**: `uTexture`, `uVelocity` (normalised to stride units, clamped ±2), `uOpacity`.
  - **Vertex**: `float curve = sin(uv.x * PI) * uVelocity * 0.5; pos.z += curve;` — horizontal Z-bow.
  - **Fragment**: plain texture sample × `uOpacity`. `transparent:true, depthWrite:false`.
  - **Drag & inertia**: `pointerdown/move/up` → accumulates `scrollTarget`. On `pointerup`: `_momentum = dragDelta * 14`. Each frame: `_momentum *= 0.92`, `scrollTarget += _momentum`. Lerp `scrollCurrent → scrollTarget * 0.08`.
  - **Wheel**: `scrollTarget -= deltaY * px2world * 2.5`.
  - **`resize()`**: recomputes layout and re-scales meshes.
  - **`destroy()`**: removes event listeners, disposes geo, materials, textures.
- **Act III / Finale DOM**: `Scroll.js` sets `.destination-content`, `.final-date`, `.final-tagline` to `autoAlpha:0`, `y:30`; standalone scrub tweens as in §0. Rings persist as Unity backdrop through Act IV.
- **Final Section Climax** (`style.css` + `Scroll.js`): `.final-tagline` → Playfair Display italic, `clamp(4.5rem, 14vw, 14rem)`, `line-height:0.9`, `letter-spacing:-0.02em` — cinematic full-width sign-off. `.final-date` demoted to small uppercase Manrope label (0.65–0.85rem, opacity 0.7) above the giant text. `ScrollTrigger.create(once:true)` on `#section-final top 70%` → `onEnter`: perpetual `glassRing.mesh.rotation.y += 2π` (28s, `repeat:-1`) + subtle Z-tilt `0.08π` in 4.5s (orbital closing stance). Safe: **`masterTl`** scrubs **`groupA/groupB`** + **`heroText.root.scale`** only; never root **`glassRing.mesh.rotation`**.
- **Act III RSVP** (`index.html` + `style.css` + `main.js` + **`vite.config.js`**): **Root `.env`** required (`VITE_TG_BOT_TOKEN`, `VITE_TG_CHAT_ID`) — see **§ `.env` at project root** above. `.route-link` → Yandex Maps (venue `text` query). **`#btn-reveal-rsvp`** → **GSAP** reveal (`ScrollTrigger.refresh()` on complete). Delivery flow is static-hosting aware: on `localhost/127.0.0.1` first try **`POST /api/rsvp`** (dev/preview backend middleware), then fallback to direct Telegram GET with **`mode:'no-cors'`**; on production static domain (GitHub Pages) it skips `/api/rsvp` entirely and uses direct Telegram fallback, eliminating expected `405 /api/rsvp` console noise. Telegram message template uses **HTML parse mode** with premium structured layout: branded header (`RSVP • Катя & Артём`), divider, block sections for guest/status, expressive status labels (`✅ С удовольствием буду` / `❌ К сожалению, не смогу`), timestamp, and source host marker. User-provided fields are HTML-escaped before send. On any hard failure, logs **`RSVP Fatal Error`** + shows *«Ошибка отправки. Проверьте консоль.»*.

## 3. Environment

| Item | Value |
|------|-------|
| Camera | **`resize`**: только **`aspect`** и **`updateProjectionMatrix`**; **`position.y` / `z`** не трогает — **Scroll.js** **`masterTl`**. **`main.js`** вызывает **`camera.resize(sizes)`** после `new World`. |
| Clear (WebGL) | `#EAE7DC` (opaque); **studio fill** = `StudioDome` sphere; **DOM/page** = same (`--color-page-bg`) |
| Lights | **Ambient** `0.5`; **Directional** `1.05` @ **(-2.5, 4.5, 3.5)** — softer key + stronger fill |
| Shadows | Renderer requests `PCFSoftShadowMap` (Three **r183** → `PCFShadowMap`); directional **(-2.5, 4.5, 3.5)**; ortho **±6**; **`shadow.radius` 12**; **ShadowMaterial** `opacity 0.28`, plane **`z=-1.5`**; **StudioDome** does not receive; **rings + HeroText** **cast**; **HeroText** **`receiveShadow: false`** |
| HeroText pos | **`root (0, 0.05, 1.5)`**; **`targetMaxDim 2.8`**; **`matchMedia`** toggles **`root.visible`** + DOM `#hero-names`; **`group.scale`** intro; **`masterTl` Act I:** `root.scale → 0` |
| Rings | curtain(0–30) → crossover(30–125) → unity(125–145) → persist(145–160) |
| Act III RSVP | Vite proxy `/api/telegram` → Telegram API; debug logs in `main.js`; optional `POST /api/rsvp` |

## 4. Next steps

- Populate `public/photos/gallery/1.webp … 24.webp` with real assets.
- Ensure **`public/models/hero_text_opt.glb`** exists (**Meshopt**); otherwise ResourceLoader fails and **`resources:ready`** never fires.
- Add real models to `public/models/ring_a.glb`, `public/models/ring_b.glb`.
- Add HDRI to `public/hdri/studio_small_09_1k.hdr`.
- Optional: add a subtle vignette / grain pass to GalleryRibbon fragment shader for cinematic finish.
- Optional: tweak directional intensity / shadow bias if content or GLB scale changes.

---

## P0 Patches Applied (SOTD Typography & Meta Foundation)

- **`<title>`** → `Катя & Артём · 08.08.2026` (was placeholder "Awwwards 3D Project").
- **Font stack**: Added `Manrope` (wght 300/400/500/600) via Google Fonts alongside Playfair Display.
- **Typography split**:
  - `Playfair Display` — **`.hero-names` / `#hero-names`** (mobile visible; desktop WebGL hero **3D HeroText**), `.dest-title`, `.path-text`, `.preloader-text`.
  - `Manrope` — all UI/technical + **`.nav-logo`** (editorial mark): `body`, `.nav-logo`, `.hero-tagline`, `.hero-date`, `.cd-num`, `.cd-label`, `.nav-links a`, `.editorial-btn`, `.route-link`, `.rsvp-input`, `.rsvp-radio-label`, `.rsvp-status`, `.dest-date`, `.dest-address`, `.final-date` (`.final-tagline` = Playfair italic hero-scale).
- **`#site-nav.nav--scrolled`** — glass: `background: rgba(253,251,247,0.25)` + `blur(16px)` + `border-bottom: rgba(18,12,8,0.06)`.
- **Custom Cursor**: 8px truffle `#120c08` dot (no `mix-blend-mode` — readable on pearl). **`Cursor.js`**: **`gsap.quickTo`** on **`x`/`y`** (`duration: 0.4`, **`power2.out`**), **`window`** **`pointermove`** (passive), initial **`gsap.set`** **`xPercent`/`yPercent` `-50`** for centering; first move snaps position; **`document`** **`mouseleave`/`mouseenter`** toggles **`cursor--hidden`** when leaving viewport. Hover: **`gsap.to`** **`scale` `1.5`↔`1`** on **`a, button, [role="button"], label[for], .editorial-btn, .route-link, [data-hover], .rsvp-radio-label`**. **`destroy()`** removes listeners. **Touch / coarse pointer:** `main.js` only **`new Cursor()`** when **`matchMedia('(pointer: fine)').matches`**; constructor guard same. **`style.css`**: **`@media (pointer: coarse) { #cursor { display: none !important; } }`** failsafe (plus existing coarse rules for `cursor: auto`).
- **Act I Golden Thread (DOM glow)**: `width: 2px`, `left: calc(50% - 1px)`, `transform: scaleY(0)` only (GSAP-exclusive transform during scrub). Darker gold gradient + box-shadow on light studio.
- **Thematic Preloader**: pearl bg; track `rgba(18,12,8,0.08)`; arc `#9a7b4a`; text muted truffle. Progress + idle rotation unchanged.
- **Light premium palette inversion** (`StudioDome.js`, `Renderer.js`, `GlassRing.js`, `style.css`, `index.html` `theme-color`, `main.js` RSVP success colour): WebGL + **DOM page** **`#EAE7DC`** (`--color-page-bg`); rings `#e0b354`. **Final material** (anti-strobing): **`roughness 0.12`** (was 0.035 → 0.08 → 0.12 — spreads specular peak, ends pixel-level shimmer), **`envMapIntensity 0.9`** (was 2.2 → 1.4 → 0.9 — tame specular without post bloom), **`clearcoat` and `clearcoatRoughness` REMOVED** (secondary reflection layer was main aliasing source). `metalness 1.0`, `color #e0b354` unchanged. **`toneMappingExposure 1.0`** (was 1.2). **Post:** no **`UnrealBloomPass`** (minimal output). DOM: primary text `#120c08`, accents `#8b6f3d` / `#9a7b4a`; hero/path/finale headings **flat** (no `text-shadow`); `.editorial-btn` hover glass fill.
- **Hero scroll indicator pulse** (`main.js`): after `heroIntroTimeline` completes, `gsap.to('.hero-scroll-indicator', { scaleY:0.5, opacity:0.3, duration:1, yoyo:true, repeat:-1, ease:'power1.inOut', transformOrigin:'top center' })`. `handleHeroSplitResize` kills tweens on indicator before forced `gsap.set` when intro is interrupted.
- **Hero / tagline animation** (`main.js › runIntro`): **3D names** via **`HeroText`** intro when **`root.visible`**; DOM **`#hero-names`** in intro stagger **mobile only**; desktop stays hidden. **`split-type`** on **`.hero-tagline` → `words`** — words preset **`y:0%, opacity:0`** before unified hero DOM stagger. CSS: `.hero-names { overflow:hidden }` base; **`.hero-tagline .word`**, **`.path-text .char`** — **`display:inline-block`**.
- **Meta / mobile UX**: `index.html` — `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`; Google Fonts URL includes **`&display=swap`**. **Open Graph** (same file): `og:title` «Катя & Артём · 08.08.2026»; `og:description` «Приглашаем на свадьбу»; `og:image` **`/og.webp`** (file **`public/og.webp`**); **`og:image:width` `1200`**, **`og:image:height` `630`**; `og:type` `website`. For live previews (Telegram, FB, etc.) use absolute `https://…/og.webp` if relative URL fails. Mobile (`max-width:480px`): `.nav-links.open` — `background: rgba(253,251,247,0.95)`, `backdrop-filter: blur(10px)`.
- **P0 fixes**: `.golden-thread` — `left: calc(50% - 1px)`, `width: 2px`, CSS `transform: scaleY(0)` only (no `translateX(-50%)`) so GSAP `scaleY` scrub does not drop horizontal centering. **SplitType resize**: debounced `resize` (150ms) → `heroIntroTimeline.kill()` if active (then force ring scale + hero subcopy visible), `revert()` both splits, `rebuildHeroSplits(visible|hidden)` per `heroIntroCompleted`, `ScrollTrigger.refresh()`. Module refs: `heroSplitNames`, `heroSplitTagline`, `heroIntroTimeline`, `heroIntroCompleted`.

---

## Phase 2 — Act I (`#section-path`)

- **DOM**: `.path-container` (`height:100vh`), `.golden-thread` (`100vh`, `left: calc(50% - 1px)`, `width: 2px`, `transform-origin: top center`, CSS-only `scaleY(0)` until Scroll scrubs), path copy.
- **Scroll**: `pin:true, end:'+=1500'`, `scrub:1.2`. `pathDomTl`: thread @0 dur100; **SplitType chars** on `.path-text-1`/`.path-text-2` (`pathTextSplit1/2`, revert before rebuild on `matchMedia`): text-1 chars in `stagger amount:10` dur15 @0, out `stagger from:'end' amount:6.5` dur10 @35; text-2 in `amount:10` dur15 @50, out `amount:9` dur15 @85. CSS `.path-text`: **`width:100%`**, **`max-width:100%`**, **`padding:0 5vw`**, **`text-align:center`**, **`white-space:nowrap`**, **`font-size: clamp(1.5rem, 5vw, 3.5rem)`**, `overflow:hidden` (mask wider than glyphs); `.path-text .char { display:inline-block }` (no `will-change`). Centering: GSAP `xPercent/yPercent -50` on both path lines.

## Phase 3 — Act II (`#section-glimpse`) — absolute UI + pin +=3000

- **DOM**: pin-container (relative 100vh) → **`<p class="glimpse-label">Наша история</p>`** (minimal Manrope caps) → mask + `.glimpse-action` (**`#btn-open-gallery`** dark `#120c08` / pearl text for contrast); images viewport-sized inside mask — responsive **`object-fit`**: `cover` (portrait/mobile), `contain` at `min-aspect-ratio: 1/1` (landscape/desktop editorial).
- **JS**: `glimpseDomTl` scrub **0–40** mask + label out; **40–70 / 70–100** crossfades + unchanged `#btn-open-gallery` block.
- **GalleryRibbon** + overlay unchanged.

## Phase 4 — Act III (`#section-destination`)

- `150vh`; rings hit Unity at masterTl pos **125**.
- **ScrollTrigger (DOM)**: `.destination-content` `autoAlpha`/`y` scrub — `start:'top 75%'`, `end:'center center'`, `ease:'none'`.
- **Copy / RSVP**: `.route-link` (venue Yandex `text` URL); `#btn-reveal-rsvp` + **GSAP** reveal; `#rsvp-form` + Telegram via **Vite `/api/telegram` proxy** + console debug; **root `.env`** `VITE_TG_*`; styles in `style.css`.

## Phase 5 — Final (RSVP)

- **`#section-final`** `100vh`, **`aria-label="RSVP"`**; rings persist from masterTl pos **145**.
- **ScrollTrigger (DOM)**: `.final-date` + `.final-tagline` scrub with `stagger:0.15` — `start:'top 60%'`, `end:'bottom 90%'`, `ease:'none'`.
