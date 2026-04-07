import * as THREE from 'three';
import gsap from 'gsap';
import { getWorld } from '../World.js';

/* ─────────────────────────────────────────────────────────────────────
   Configuration
───────────────────────────────────────────────────────────────────── */
const TOTAL     = 24;     // total images in the gallery
const POOL      = 7;      // live meshes (7 > ~3 visible → 2 buffer each side)
const BASE_PATH = '/photos/gallery/';

/* ─────────────────────────────────────────────────────────────────────
   GLSL — Vertex: Z-axis bend proportional to velocity
───────────────────────────────────────────────────────────────────── */
const VERT = /* glsl */`
    uniform float uVelocity;
    varying vec2  vUv;

    void main() {
        vUv = uv;
        vec3 pos = position;
        // Horizontal bow: 0 at UV edges, max at UV centre — driven by scroll velocity
        float curve = sin(uv.x * 3.14159265) * uVelocity * 0.5;
        pos.z += curve;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

/* ─────────────────────────────────────────────────────────────────────
   GLSL — Fragment: texture sample + opacity
───────────────────────────────────────────────────────────────────── */
const FRAG = /* glsl */`
    uniform sampler2D uTexture;
    uniform float     uOpacity;
    varying vec2      vUv;

    void main() {
        vec4 col = texture2D(uTexture, vUv);
        gl_FragColor = vec4(col.rgb, col.a * uOpacity);
    }
`;

/* ─────────────────────────────────────────────────────────────────────
   Shared module-level fallback (1×1 dark tile — avoids white flash)
   Never disposed — lives for the page's lifetime.
───────────────────────────────────────────────────────────────────── */
const _FALLBACK = (() => {
    const t = new THREE.DataTexture(new Uint8Array([24, 16, 12, 255]), 1, 1);
    t.needsUpdate = true;
    return t;
})();

function _makeMat() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTexture:  { value: _FALLBACK },
            uVelocity: { value: 0 },
            uOpacity:  { value: 0 },
        },
        vertexShader:   VERT,
        fragmentShader: FRAG,
        transparent:    true,
        depthWrite:     false,
    });
}

/* ═════════════════════════════════════════════════════════════════════
   GalleryRibbon — Infinite Object-Pool WebGL Carousel

   Pool invariants:
   • Each mesh owns an `offset` (its position relative to scrollCurrent).
   • When a mesh's world-X falls outside ±halfRibbon it is "teleported"
     to the opposite end and assigned the next/previous image index.
   • Textures are NEVER loaded at construction — only when a mesh first
     becomes visible (open() / teleport). Cache prevents double-loading.
═════════════════════════════════════════════════════════════════════ */
export default class GalleryRibbon {

    constructor() {
        this._w = getWorld();
        if (!this._w) throw new Error('GalleryRibbon: World not ready');

        // Shared geometry — 32×32 segments give smooth per-vertex Z-bow
        this._geo = new THREE.PlaneGeometry(1, 1.5, 32, 32);

        /* Lazy texture system
           _texCache   : idx → THREE.Texture  (loaded)
           _texPending : Set<idx>              (in-flight, not yet cached)
           _ratioByIdx : idx → width/height   (per-image aspect; drives scale.x) */
        this._texCache   = new Map();
        this._texPending = new Set();
        this._ratioByIdx = new Map();

        /** Max width/height among loaded gallery images — sets uniform pool stride */
        this._maxRatio   = 2 / 3; // sensible portrait default before any decode
        this._defaultRatio = 2 / 3;

        /* ── Scroll physics ───────────────────────────────────────── */
        this.scrollTarget  = 0;
        this.scrollCurrent = 0;
        this._prevScroll   = 0;
        this._velocity     = 0;   // smoothed — fed to shader
        this._rawVel       = 0;   // single-frame delta
        this._momentum     = 0;   // post-drag inertia

        /* ── Drag state ──────────────────────────────────────────── */
        this._dragging  = false;
        this._dragLastX = 0;
        this._dragDelta = 0;

        /* ── Layout (computed from frustum) ───────────────────────
           Geometry Plane(1,1.5): world width = scale.x, world height = scale.y * 1.5
           Target world height = _itemH → scale.y = _itemH / 1.5
           Target world width  = _itemH * ratio → scale.x = _itemH * ratio
        ─────────────────────────────────────────────────────────── */
        this._itemH  = 1.5;
        this._stride = 1.12;

        /* ── Mesh pool ───────────────────────────────────────────── */
        this.container = new THREE.Group();
        this.container.visible = false;
        this._meshes = [];
        this._buildPool();
        this._w.scene.add(this.container);

        /* ── Bound interaction handlers ──────────────────────────── */
        this._downBound  = (e) => this._onPointerDown(e);
        this._moveBound  = (e) => this._onPointerMove(e);
        this._upBound    = () => this._onPointerUp();
        this._wheelBound = (e) => this._onWheel(e);

        window.addEventListener('pointerdown', this._downBound);
        window.addEventListener('pointermove', this._moveBound);
        window.addEventListener('pointerup',   this._upBound);
        window.addEventListener('wheel',       this._wheelBound, { passive: true });
    }

    /* ── Build pool ─────────────────────────────────────────────────
       Meshes are created with fallback texture and opacity:0.
       NO image files are fetched here — deferred to open().
    ─────────────────────────────────────────────────────────────── */
    _buildPool() {
        this._computeLayout(); // sets _itemH + _stride from _maxRatio
        const half = Math.floor(POOL / 2);
        for (let i = 0; i < POOL; i++) {
            const mesh = new THREE.Mesh(this._geo, _makeMat());
            mesh.userData.imgIdx  = i % TOTAL;
            mesh.userData.offset  = (i - half) * this._stride;
            mesh.position.z       = 0;
            this._applyScale(mesh);
            this.container.add(mesh);
            this._meshes.push(mesh);
        }
    }

    _gapWorld() {
        return this._itemH * 0.06;
    }

    /** Horizontal spacing between card centres = tallest card width + gap */
    _recomputeStride() {
        this._stride = this._itemH * this._maxRatio + this._gapWorld();
    }

    _rebalanceOffsets() {
        const half = Math.floor(POOL / 2);
        for (let i = 0; i < POOL; i++) {
            this._meshes[i].userData.offset = (i - half) * this._stride;
        }
    }

    _syncMaxRatioFromCache() {
        let m = this._defaultRatio;
        for (const r of this._ratioByIdx.values()) {
            if (r > m) m = r;
        }
        this._maxRatio = m;
    }

    /* ── Frustum-derived layout ─────────────────────────────────────
       Card height = 80% of visible world height. Width is per-texture.
    ─────────────────────────────────────────────────────────────── */
    _computeLayout() {
        const cam    = this._w.camera.instance;
        const camZ   = Math.max(0.5, cam.position.z);
        const vFOV   = THREE.MathUtils.degToRad(cam.fov);
        const worldH = 2 * camZ * Math.tan(vFOV * 0.5);
        this._itemH = worldH * 0.80;
        this._recomputeStride();
    }

    /**
     * PlaneGeometry(1, 1.5): world height = scale.y * 1.5, world width = scale.x * 1
     * Preserve texture aspect: width/height = ratio → scale.x = _itemH * ratio, scale.y = _itemH / 1.5
     */
    _applyScale(mesh) {
        const idx   = mesh.userData.imgIdx;
        const ratio = this._ratioByIdx.get(idx) ?? this._defaultRatio;
        mesh.scale.set(this._itemH * ratio, this._itemH / 1.5, 1);
    }

    /* ── Lazy texture loader ────────────────────────────────────────
       Guarantees:
       1. No file request unless explicitly called.
       2. Never fetches the same idx twice concurrently.
       3. On load: applied to ALL current meshes showing that idx
          (handles case where load resolves after a pool teleport).
    ─────────────────────────────────────────────────────────────── */
    _applyTexture(mesh, idx) {
        idx = ((idx % TOTAL) + TOTAL) % TOTAL;

        if (this._texCache.has(idx)) {
            mesh.material.uniforms.uTexture.value = this._texCache.get(idx);
            this._applyScale(mesh);
            return;
        }

        // Show dark fallback while loading — no white flash
        mesh.material.uniforms.uTexture.value = _FALLBACK;

        if (this._texPending.has(idx)) return; // already in-flight
        this._texPending.add(idx);

        new THREE.TextureLoader().load(
            `${BASE_PATH}${idx + 1}.webp`,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                const img = tex.image;
                const ratio = img?.width && img?.height
                    ? img.width / img.height
                    : this._defaultRatio;

                this._ratioByIdx.set(idx, ratio);
                const prevMax = this._maxRatio;
                this._maxRatio = Math.max(this._maxRatio, ratio);

                this._texCache.set(idx, tex);
                this._texPending.delete(idx);

                this._recomputeStride();
                if (this._maxRatio > prevMax + 1e-6) {
                    this._rebalanceOffsets();
                }

                for (const m of this._meshes) {
                    if (m.userData.imgIdx === idx) {
                        m.material.uniforms.uTexture.value = tex;
                        this._applyScale(m);
                    }
                }
            },
            undefined,
            () => { this._texPending.delete(idx); } // on error: unblock
        );
    }

    /* ── Public API ─────────────────────────────────────────────── */

    /**
     * Show the ribbon. Resets scroll state, triggers first-demand
     * texture loads for the 7 initial visible slots, then fades in.
     */
    open() {
        this._syncMaxRatioFromCache();
        this._computeLayout();
        this._resetState();
        this.container.visible = true;

        // First-demand load: only the 7 pool slots — lazy, not all 24
        for (const m of this._meshes) {
            this._applyTexture(m, m.userData.imgIdx);
        }

        // Staggered per-mesh fade-in
        this._meshes.forEach((m, i) => {
            gsap.to(m.material.uniforms.uOpacity, {
                value:    1,
                duration: 0.7,
                delay:    i * 0.045,
                ease:     'power2.out',
            });
        });
    }

    /**
     * Fade out and hide. Accepts an optional onComplete for GlassRing restore.
     * @param {() => void} [onComplete]
     */
    close(onComplete) {
        this._dragging = false;
        this._momentum = 0;

        const tl = gsap.timeline({
            onComplete: () => {
                this.container.visible = false;
                onComplete?.();
            },
        });

        this._meshes.forEach((m, i) => {
            tl.to(
                m.material.uniforms.uOpacity,
                { value: 0, duration: 0.45, ease: 'power2.in' },
                i * 0.025,
            );
        });
    }

    /**
     * Call on window resize when the gallery is open.
     */
    resize() {
        if (!this.container.visible) return;
        this._computeLayout();
        this._recomputeStride();
        for (const m of this._meshes) this._applyScale(m);
    }

    /* ── Main update (called every RAF) ────────────────────────────
       Pool teleport math:
       • Each mesh has an `offset` in world units relative to scrollCurrent.
       • world_x = scrollCurrent + offset
       • Boundary = half the total ribbon width + one stride of buffer.
       • If world_x leaves the boundary, the mesh is snapped to the
         opposite end and re-assigned the next/previous image index.
    ─────────────────────────────────────────────────────────────── */
    update() {
        if (!this.container.visible) return;

        // Frustum height drives _itemH; stride follows cached max ratio
        this._computeLayout();

        // Momentum decay while not dragging
        if (!this._dragging) {
            this._momentum    *= 0.92;
            this.scrollTarget += this._momentum;
        }

        // Lerp current → target  (0.08 ≈ smooth ~18-frame lag)
        this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * 0.08;

        // Per-frame velocity → smoothed for shader
        this._rawVel   = this.scrollCurrent - this._prevScroll;
        this._prevScroll = this.scrollCurrent;
        this._velocity  += (this._rawVel - this._velocity) * 0.18;

        // Normalise velocity to stride units, then clamp for shader
        const shaderVel = THREE.MathUtils.clamp(
            this._velocity / Math.max(0.001, this._stride),
            -2.0, 2.0,
        );

        // Total pool span + one stride of buffer on each side
        const halfBound = (POOL * this._stride) * 0.5 + this._stride;

        for (const m of this._meshes) {
            const worldX = this.scrollCurrent + m.userData.offset;

            if (worldX < -halfBound) {
                // Fell off left → teleport to right end, advance image index
                m.userData.offset += POOL * this._stride;
                const newIdx = (m.userData.imgIdx + POOL) % TOTAL;
                m.userData.imgIdx = newIdx;
                this._applyTexture(m, newIdx);

            } else if (worldX > halfBound) {
                // Fell off right → teleport to left end, step back image index
                m.userData.offset -= POOL * this._stride;
                const newIdx = ((m.userData.imgIdx - POOL) % TOTAL + TOTAL) % TOTAL;
                m.userData.imgIdx = newIdx;
                this._applyTexture(m, newIdx);
            }

            m.position.x = this.scrollCurrent + m.userData.offset;
            this._applyScale(m);
            m.material.uniforms.uVelocity.value = shaderVel;
        }
    }

    /* ── Interaction ────────────────────────────────────────────── */

    /** Pixels → world-units conversion using current camera frustum. */
    _px2world() {
        const cam    = this._w.camera.instance;
        const camZ   = Math.max(0.5, cam.position.z);
        const vFOV   = THREE.MathUtils.degToRad(cam.fov);
        const worldH = 2 * camZ * Math.tan(vFOV * 0.5);
        return worldH / window.innerHeight;
    }

    _onPointerDown(e) {
        if (!this.container.visible) return;
        this._dragging  = true;
        this._dragLastX = e.clientX;
        this._dragDelta = 0;
        this._momentum  = 0; // cancel existing momentum on new grab
    }

    _onPointerMove(e) {
        if (!this._dragging || !this.container.visible) return;
        const delta        = (e.clientX - this._dragLastX) * this._px2world();
        this.scrollTarget += delta;
        this._dragDelta    = delta;   // store for release inertia
        this._dragLastX    = e.clientX;
    }

    _onPointerUp() {
        if (!this._dragging) return;
        this._dragging = false;
        // Inject drag velocity as post-release momentum (factor ≈ 14 frames)
        this._momentum = this._dragDelta * 14;
    }

    _onWheel(e) {
        if (!this.container.visible) return;
        this._momentum     = 0; // wheel overrides drag momentum
        this.scrollTarget -= e.deltaY * this._px2world() * 2.5;
    }

    /* ── Internals ──────────────────────────────────────────────── */

    _resetState() {
        this.scrollTarget  = 0;
        this.scrollCurrent = 0;
        this._prevScroll   = 0;
        this._velocity     = 0;
        this._rawVel       = 0;
        this._momentum     = 0;
        this._dragDelta    = 0;
        this._dragging     = false;

        this._syncMaxRatioFromCache();
        this._recomputeStride();

        const half = Math.floor(POOL / 2);
        for (let i = 0; i < POOL; i++) {
            const m = this._meshes[i];
            m.userData.imgIdx               = i % TOTAL;
            m.userData.offset               = (i - half) * this._stride;
            m.material.uniforms.uOpacity.value  = 0;
            m.material.uniforms.uVelocity.value = 0;
            m.material.uniforms.uTexture.value  = _FALLBACK;
            this._applyScale(m);
        }
    }

    /* ── Cleanup ────────────────────────────────────────────────── */

    destroy() {
        window.removeEventListener('pointerdown', this._downBound);
        window.removeEventListener('pointermove', this._moveBound);
        window.removeEventListener('pointerup',   this._upBound);
        window.removeEventListener('wheel',       this._wheelBound);

        this._w.scene.remove(this.container);
        this._geo.dispose();

        for (const m of this._meshes) {
            m.material.dispose();
        }

        for (const [, tex] of this._texCache) {
            tex.dispose();
        }

        this._texCache.clear();
        this._ratioByIdx.clear();
        this._meshes = [];
    }
}
