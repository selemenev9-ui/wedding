import * as THREE from 'three';
import { getWorld } from '../World.js';

const ROOT_Y = 0.05;
const ROOT_Z = 1.5;

/**
 * 3D hero lettering (Meshopt-compressed glTF). **`this.root`** — public **`THREE.Group`** for the hero text hierarchy.
 * **`group.scale`** intro in **`main.js`**. **`root.visible`** toggled with DOM fallback via **`main.js`** `matchMedia('(max-width: 767px)')`.
 *
 * Materials: **truffle** matte names (`#120c08`); **gold** ampersand — same PBR as **`GlassRing`** (`MeshPhysicalMaterial`).
 */
export default class HeroText {
    constructor() {
        const world = getWorld();
        if (!world) {
            throw new Error('HeroText: World singleton is not initialized');
        }

        this.scene = world.scene;
        this.resources = world.resources;

        this.root = new THREE.Group();
        this.root.name = 'HeroTextRoot';

        this.group = new THREE.Group();
        this.group.name = 'HeroText';
        this.group.visible = true;
        this.group.scale.setScalar(0);

        this.root.add(this.group);
        this.scene.add(this.root);

        /** @type {THREE.Object3D | null} */
        this._gltfRoot = null;

        /** Matte truffle — every non-ampersand mesh; FrontSide to avoid back-face edge artifacts on thin glyphs. */
        this.truffleMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#120c08'),
            roughness: 1.0,
            metalness: 0.0,
            envMapIntensity: 0,
            envMap: null,
            side: THREE.FrontSide,
            dithering: false,
            precision: 'highp',
        });

        /** Gold ampersand — ring-matched PBR; `envMap` = scene PMREM from `World` HDRI (see `_syncGoldEnvMap`). */
        this.goldMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#e0b354'),
            metalness: 1.0,
            roughness: 0.12,
            envMapIntensity: 0,
        });

        /** @type {Set<THREE.BufferGeometry>} */
        this._geometries = new Set();
        this._built = false;

        this.ready = this._init();
    }

    async _init() {
        try {
            const gltf = await this.resources.waitFor('heroText');
            this._buildFromGltf(/** @type {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF} */ (gltf));
        } catch (e) {
            console.error('HeroText: failed to load hero_text_opt.glb', e);
        }
    }

    /**
     * Ampersand if mesh **or** source material names suggest it (~`ampersand`, ~`ampersandmat`).
     * @param {THREE.Material | null | undefined} mat
     * @param {THREE.Mesh} mesh
     */
    _isAmpersandPart(mat, mesh) {
        const mn = (mesh.name || '').toLowerCase();
        if (mn.includes('ampersand')) return true;
        if (mat && typeof mat.name === 'string' && mat.name.toLowerCase().includes('ampersand')) {
            return true;
        }
        return false;
    }

    /**
     * Same IBL as rings: `scene.environment` from HDRI (PMREM in `World._setupEnvironment`).
     * Called from World after env is applied — keep public surface for `World.heroText`.
     */
    _syncGoldEnvMap() {
        if (!this.goldMaterial) return;
        const env = this.scene.environment;
        if (env) {
            this.goldMaterial.envMap = env;
        }
        this.goldMaterial.needsUpdate = true;
    }

    /**
     * @param {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF} gltf
     */
    _buildFromGltf(gltf) {
        if (this._built) return;

        gltf.scene.rotation.x = Math.PI / 2;
        gltf.scene.updateMatrixWorld(true);

        if (import.meta.env?.DEV) {
            const box0 = new THREE.Box3().setFromObject(gltf.scene);
            const sz0 = box0.getSize(new THREE.Vector3());
            console.log(
                '[HeroText] extents after rotation.x=+π/2 (X/Y/Z):',
                sz0.x.toFixed(3), sz0.y.toFixed(3), sz0.z.toFixed(3),
            );
        }

        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            if (child.geometry) this._geometries.add(child.geometry);

            const orig = Array.isArray(child.material) ? child.material : [child.material];
            const next = orig.map((m) => {
                const isAmp = this._isAmpersandPart(m, child);
                const mat = isAmp ? this.goldMaterial : this.truffleMaterial;
                if (m && m !== mat && typeof m.dispose === 'function') m.dispose();
                return mat;
            });
            child.material = orig.length > 1 ? next : next[0];

            // Preserve authoring scale; avoid micro-offset multiplier that can
            // introduce temporal edge crawl on thin glyph contours.

            child.castShadow = false;
            child.receiveShadow = false;
        });

        this._normalizeToScene(gltf.scene, 2.8);

        this._gltfRoot = gltf.scene;
        this.group.add(gltf.scene);

        this.root.position.set(0, ROOT_Y, ROOT_Z);

        this._syncGoldEnvMap();
        if (!this.scene.environment) {
            queueMicrotask(() => this._syncGoldEnvMap());
        }

        this._built = true;
    }

    /**
     * Uniform-scale root to targetMaxDim world-units, then center it.
     * @param {THREE.Object3D} root
     * @param {number} targetMaxDim
     */
    _normalizeToScene(root, targetMaxDim) {
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        if (box.isEmpty()) return;
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
        const s = THREE.MathUtils.clamp(targetMaxDim / maxDim, 0.02, 500);
        root.scale.setScalar(s);
        root.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(root);
        const center = box2.getCenter(new THREE.Vector3());
        root.position.sub(center);
    }

    destroy() {
        if (this.scene && this.root) this.scene.remove(this.root);
        if (this.truffleMaterial) {
            this.truffleMaterial.dispose();
            this.truffleMaterial = null;
        }
        if (this.goldMaterial) {
            this.goldMaterial.dispose();
            this.goldMaterial = null;
        }
        for (const geo of this._geometries) geo.dispose();
        this._geometries.clear();
        this._gltfRoot = null;
        this.root = null;
        this.group = null;
        this._built = false;
    }
}
