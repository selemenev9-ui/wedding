import * as THREE from 'three';
import gsap from 'gsap';
import { getWorld } from '../World.js';

/* ─────────────────────────────────────────────────────────────────────
   Configuration
───────────────────────────────────────────────────────────────────── */
const TOTAL     = 24;
const POOL      = 7;
const BASE_PATH = '/photos/gallery/';

/* ─────────────────────────────────────────────────────────────────────
   GLSL — Vertex
   • Primary Z-bow (horizontal scroll bend) — 0.8× for visible drama
   • Subtle Y-wave (organic "sail" feeling at speed) — 0.12×
───────────────────────────────────────────────────────────────────── */
const VERT = /* glsl */`
    uniform float uVelocity;
    varying vec2  vUv;

    #define PI 3.14159265

    void main() {
        vUv = uv;
        vec3 pos = position;

        float curveZ = sin(uv.x * PI) * uVelocity * 0.8;
        float curveY = sin(uv.y * PI) * uVelocity * 0.12;
        pos.z += curveZ;
        pos.y += curveY;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

/* ─────────────────────────────────────────────────────────────────────
   GLSL — Fragment
   • Rounded corners via aspect-correct SDF (r = 4% card height)
   • Subtle vignette — dims edges 12–22%, centre untouched
───────────────────────────────────────────────────────────────────── */
const FRAG = /* glsl */`
    uniform sampler2D uTexture;
    uniform float     uOpacity;
    uniform float     uAspect;   // card width / card height  (= image ratio)
    varying vec2      vUv;

    void main() {
        vec4 col = texture2D(uTexture, vUv);

        // ── Aspect-correct rounded-rect SDF ───────────────────────────
        // Work in a space where Y ∈ [-0.5, 0.5], X ∈ [-uAspect*0.5, uAspect*0.5]
        // so the corner radius r is a uniform fraction of card HEIGHT.
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        float r = 0.04;
        vec2 q = abs(p) - vec2(uAspect * 0.5 - r, 0.5 - r);
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        float roundMask = 1.0 - smoothstep(-0.008, 0.008, d);

        // ── Subtle vignette (vig=1 at centre, 0 at corners) ──────────
        float vig = 1.0 - dot(vUv - 0.5, (vUv - 0.5) * 2.2);
        vig = clamp(vig, 0.0, 1.0);
        col.rgb *= mix(1.0, vig, 0.22);

        gl_FragColor = vec4(col.rgb, col.a * roundMask * uOpacity);
    }
`;

/* ─────────────────────────────────────────────────────────────────────
   Shared fallback (1×1 dark tile — avoids white flash on first load)
   Module-level: created once, never disposed.
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
            uAspect:   { value: 2 / 3 },
        },
        vertexShader:   VERT,
        fragmentShader: FRAG,
        transparent:    true,
        depthWrite:     false,
    });
}

/* ═════════════════════════════════════════════════════════════════════
   GalleryRibbon — Infinite Object-Pool WebGL Carousel

   Architecture:
   • POOL = 7 meshes share one PlaneGeometry — draw calls = 7, static.
   • _computeLayout() / _applyScale() called ONLY on open() + resize().
     RAF loop is pure physics + teleport + position/velocity uniforms.
   • Textures loaded lazily (open / teleport).  Cache prevents duplicates.
   • Entry: cards rise from Y below, staggered centre-outward.
   • Exit:  cards fall down, staggered edge-inward.
   • Physics: EWMA drag velocity (frame-rate-stable) + wheel normalisation.
═════════════════════════════════════════════════════════════════════ */
export default class GalleryRibbon {

    constructor() {
        this._w = getWorld();
        if (!this._w) throw new Error('GalleryRibbon: World not ready');

        // Shared geometry — 32×32 segments for smooth per-vertex Z-bow
        this._geo = new THREE.PlaneGeometry(1, 1.5, 32, 32);

        /* Lazy texture system */
        this._texCache   = new Map();
        this._texPending = new Set();
        this._ratioByIdx = new Map();

        this._maxRatio     = 2 / 3;
        this._defaultRatio = 2 / 3;

        /* ── Scroll physics ───────────────────────────────────────── */
        this.scrollTarget  = 0;
        this.scrollCurrent = 0;
        this._prevScroll   = 0;
        this._velocity     = 0;
        this._rawVel       = 0;
        this._momentum     = 0;

        /* ── Drag state ──────────────────────────────────────────── */
        this._dragging    = false;
        this._dragLastX   = 0;
        this._dragVel     = 0;      // EWMA velocity — frame-rate stable
        this._isTouchDrag = false;

        /* ── Layout (set only on open/resize — NOT every RAF) ──────── */
        this._itemH  = 1.5;
        this._stride = 1.12;

        /* ── Counter DOM ─────────────────────────────────────────── */
        this._counterEl        = document.getElementById('gallery-counter');
        this._lastCounterVal   = -1;
        this._counterThrottle  = 0;

        /* ── Pool ────────────────────────────────────────────────── */
        this.container = new THREE.Group();
        this.container.visible = false;
        this._meshes = [];
        this._buildPool();
        this._w.scene.add(this.container);

        /* ── Bound handlers ──────────────────────────────────────── */
        this._downBound  = (e) => this._onPointerDown(e);
        this._moveBound  = (e) => this._onPointerMove(e);
        this._upBound    = () => this._onPointerUp();
        this._wheelBound = (e) => this._onWheel(e);

        window.addEventListener('pointerdown', this._downBound);
        window.addEventListener('pointermove', this._moveBound);
        window.addEventListener('pointerup',   this._upBound);
        window.addEventListener('wheel',       this._wheelBound, { passive: true });
    }

    /* ── Pool construction ──────────────────────────────────────────── */

    _buildPool() {
        this._computeLayout();
        const half = Math.floor(POOL / 2);
        for (let i = 0; i < POOL; i++) {
            const mesh = new THREE.Mesh(this._geo, _makeMat());
            mesh.userData.imgIdx = i % TOTAL;
            mesh.userData.offset = (i - half) * this._stride;
            mesh.position.z      = 0;
            this._applyScale(mesh);
            this.container.add(mesh);
            this._meshes.push(mesh);
        }
    }

    _gapWorld() { return this._itemH * 0.06; }

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
       Card height = 80% of visible world height.
       Called only from open() and resize() — NOT from RAF update().
    ─────────────────────────────────────────────────────────────── */
    _computeLayout() {
        const cam    = this._w.camera.instance;
        const camZ   = Math.max(0.5, cam.position.z);
        const vFOV   = THREE.MathUtils.degToRad(cam.fov);
        const worldH = 2 * camZ * Math.tan(vFOV * 0.5);
        this._itemH  = worldH * 0.80;
        this._recomputeStride();
    }

    /* PlaneGeometry(1,1.5): world height = scale.y*1.5, world width = scale.x
       scale.x = _itemH * ratio,  scale.y = _itemH / 1.5
       uAspect  = world_width / world_height = ratio                        */
    _applyScale(mesh) {
        const idx   = mesh.userData.imgIdx;
        const ratio = this._ratioByIdx.get(idx) ?? this._defaultRatio;
        mesh.scale.set(this._itemH * ratio, this._itemH / 1.5, 1);
        mesh.material.uniforms.uAspect.value = ratio;
    }

    /* ── Lazy texture loader ─────────────────────────────────────────
       1. No HTTP request unless explicitly triggered.
       2. Never fires twice concurrently for the same idx.
       3. On load: applied to ALL current meshes showing that idx.
    ─────────────────────────────────────────────────────────────── */
    _applyTexture(mesh, idx) {
        idx = ((idx % TOTAL) + TOTAL) % TOTAL;

        if (this._texCache.has(idx)) {
            mesh.material.uniforms.uTexture.value = this._texCache.get(idx);
            this._applyScale(mesh);
            return;
        }

        mesh.material.uniforms.uTexture.value = _FALLBACK;
        if (this._texPending.has(idx)) return;
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
                if (this._maxRatio > prevMax + 1e-6) this._rebalanceOffsets();

                for (const m of this._meshes) {
                    if (m.userData.imgIdx === idx) {
                        m.material.uniforms.uTexture.value = tex;
                        this._applyScale(m);
                    }
                }
            },
            undefined,
            () => { this._texPending.delete(idx); }
        );
    }

    /* ── Public API ─────────────────────────────────────────────── */

    /**
     * Show the ribbon.
     * Entry animation: cards rise from Y=-65% itemH, staggered centre → outward.
     */
    open() {
        this._syncMaxRatioFromCache();
        this._computeLayout();
        this._resetState();
        this.container.visible = true;

        // Load first 7 textures
        for (const m of this._meshes) {
            this._applyTexture(m, m.userData.imgIdx);
        }

        // Stagger order: centre card first, then alternate outward
        // Pool indices: 0 1 2 [3] 4 5 6  → 3, 2, 4, 1, 5, 0, 6
        const entryOrder = [3, 2, 4, 1, 5, 0, 6];
        entryOrder.forEach((poolIdx, staggerI) => {
            const m     = this._meshes[poolIdx];
            const delay = staggerI * 0.07;

            m.position.y = -this._itemH * 0.65; // start below screen

            gsap.to(m.position, {
                y:        0,
                duration: 1.3,
                delay,
                ease:     'expo.out',
            });
            gsap.to(m.material.uniforms.uOpacity, {
                value:    1,
                duration: 0.9,
                delay,
                ease:     'power2.out',
            });
        });
    }

    /**
     * Fade-and-fall exit. Outer cards first, centre last.
     * @param {() => void} [onComplete]
     */
    close(onComplete) {
        this._dragging = false;
        this._momentum = 0;

        // Exit order: edges first, centre last — reverse of entry
        const exitOrder = [0, 6, 1, 5, 2, 4, 3];
        const tl = gsap.timeline({
            onComplete: () => {
                this.container.visible = false;
                // Reset Y so next open() starts cleanly
                for (const m of this._meshes) m.position.y = 0;
                onComplete?.();
            },
        });

        exitOrder.forEach((poolIdx, staggerI) => {
            const m = this._meshes[poolIdx];
            const t = staggerI * 0.04;
            tl.to(m.position,
                { y: -this._itemH * 0.45, duration: 0.5, ease: 'power2.in' },
                t,
            );
            tl.to(m.material.uniforms.uOpacity,
                { value: 0, duration: 0.38, ease: 'power2.in' },
                t,
            );
        });
    }

    /** Call on window resize while gallery is open. */
    resize() {
        if (!this.container.visible) return;
        this._computeLayout();
        for (const m of this._meshes) this._applyScale(m);
    }

    /* ── Main update (RAF) ─────────────────────────────────────────
       Strictly: scroll physics + pool teleport + uniforms.
       _computeLayout() and _applyScale() are intentionally absent here.
    ─────────────────────────────────────────────────────────────── */
    update() {
        if (!this.container.visible) return;

        // Momentum decay while not actively dragging
        if (!this._dragging) {
            this._momentum    *= 0.91;
            this.scrollTarget += this._momentum;
        }

        // Lerp — touch gets a snappier factor for immediate feedback
        const lerpF = this._isTouchDrag ? 0.10 : 0.085;
        this.scrollCurrent += (this.scrollTarget - this.scrollCurrent) * lerpF;

        // Per-frame velocity → EWMA smooth → shader
        this._rawVel    = this.scrollCurrent - this._prevScroll;
        this._prevScroll = this.scrollCurrent;
        this._velocity  += (this._rawVel - this._velocity) * 0.18;

        const shaderVel = THREE.MathUtils.clamp(
            this._velocity / Math.max(0.001, this._stride),
            -2.0, 2.0,
        );

        const halfBound = (POOL * this._stride) * 0.5 + this._stride;

        for (const m of this._meshes) {
            const worldX = this.scrollCurrent + m.userData.offset;

            if (worldX < -halfBound) {
                m.userData.offset += POOL * this._stride;
                const newIdx = (m.userData.imgIdx + POOL) % TOTAL;
                m.userData.imgIdx = newIdx;
                this._applyTexture(m, newIdx);

            } else if (worldX > halfBound) {
                m.userData.offset -= POOL * this._stride;
                const newIdx = ((m.userData.imgIdx - POOL) % TOTAL + TOTAL) % TOTAL;
                m.userData.imgIdx = newIdx;
                this._applyTexture(m, newIdx);
            }

            m.position.x = this.scrollCurrent + m.userData.offset;
            m.material.uniforms.uVelocity.value = shaderVel;
        }

        // ── Counter: throttled to ~10 fps (every 6 frames @ 60fps) ──
        if (this._counterEl) {
            this._counterThrottle++;
            if (this._counterThrottle >= 6) {
                this._counterThrottle = 0;
                // Nearest mesh to world-X = 0 → its image number
                let bestDist = Infinity, bestIdx = 0;
                for (const m of this._meshes) {
                    const dx = Math.abs(this.scrollCurrent + m.userData.offset);
                    if (dx < bestDist) { bestDist = dx; bestIdx = m.userData.imgIdx; }
                }
                const displayNum = bestIdx + 1;
                if (displayNum !== this._lastCounterVal) {
                    this._lastCounterVal = displayNum;
                    this._counterEl.textContent =
                        String(displayNum).padStart(2, '0') +
                        ' / ' +
                        String(TOTAL).padStart(2, '0');
                }
            }
        }
    }

    /* ── Interaction ─────────────────────────────────────────────── */

    _px2world() {
        const cam    = this._w.camera.instance;
        const camZ   = Math.max(0.5, cam.position.z);
        const vFOV   = THREE.MathUtils.degToRad(cam.fov);
        const worldH = 2 * camZ * Math.tan(vFOV * 0.5);
        return worldH / window.innerHeight;
    }

    _onPointerDown(e) {
        if (!this.container.visible) return;
        this._dragging    = true;
        this._dragLastX   = e.clientX;
        this._dragVel     = 0;
        this._momentum    = 0;
        this._isTouchDrag = e.pointerType === 'touch';
    }

    _onPointerMove(e) {
        if (!this._dragging || !this.container.visible) return;
        const delta        = (e.clientX - this._dragLastX) * this._px2world();
        this.scrollTarget += delta;
        // EWMA: tracks recent drag speed without single-frame spikes
        this._dragVel      = this._dragVel * 0.65 + delta * 0.35;
        this._dragLastX    = e.clientX;
    }

    _onPointerUp() {
        if (!this._dragging) return;
        this._dragging = false;
        // Inject EWMA velocity as post-release momentum
        this._momentum = this._dragVel * 9;
    }

    _onWheel(e) {
        if (!this.container.visible) return;
        this._momentum = 0;
        // Normalise: clamp large values (trackpad sends 3px, mouse 100px, Magic Mouse 0.5px)
        const rawDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120);
        this.scrollTarget -= rawDelta * this._px2world() * 2.5;
    }

    /* ── Internals ──────────────────────────────────────────────── */

    _resetState() {
        this.scrollTarget    = 0;
        this.scrollCurrent   = 0;
        this._prevScroll     = 0;
        this._velocity       = 0;
        this._rawVel         = 0;
        this._momentum       = 0;
        this._dragVel        = 0;
        this._dragging       = false;
        this._lastCounterVal = -1;
        this._counterThrottle = 0;

        this._syncMaxRatioFromCache();
        this._recomputeStride();

        const half = Math.floor(POOL / 2);
        for (let i = 0; i < POOL; i++) {
            const m = this._meshes[i];
            m.userData.imgIdx                   = i % TOTAL;
            m.userData.offset                   = (i - half) * this._stride;
            m.position.y                        = 0;
            m.material.uniforms.uOpacity.value  = 0;
            m.material.uniforms.uVelocity.value = 0;
            m.material.uniforms.uAspect.value   = this._defaultRatio;
            m.material.uniforms.uTexture.value  = _FALLBACK;
            this._applyScale(m);
        }
    }

    /* ── Cleanup ─────────────────────────────────────────────────── */

    destroy() {
        window.removeEventListener('pointerdown', this._downBound);
        window.removeEventListener('pointermove', this._moveBound);
        window.removeEventListener('pointerup',   this._upBound);
        window.removeEventListener('wheel',       this._wheelBound);

        this._w.scene.remove(this.container);
        this._geo.dispose();
        for (const m of this._meshes) m.material.dispose();
        for (const [, tex] of this._texCache) tex.dispose();

        this._texCache.clear();
        this._ratioByIdx.clear();
        this._meshes = [];
    }
}
