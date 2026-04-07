import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import ResourceLoader from './ResourceLoader.js';
import StudioDome from './world/StudioDome.js';

export default class World {
    static instance = null;

    /**
     * @param {{ canvas?: HTMLCanvasElement; sizes: { width: number; height: number; pixelRatio: number } }} config
     */
    constructor(config) {
        if (World.instance) {
            return World.instance;
        }

        if (!config) {
            throw new Error('World: config is required');
        }
        const { canvas, sizes } = config;
        if (!sizes) {
            throw new Error('World: config.sizes is required');
        }
        const { width, height, pixelRatio } = sizes;
        if (typeof width !== 'number' || typeof height !== 'number' || typeof pixelRatio !== 'number') {
            throw new Error('World: sizes must include numeric width, height, and pixelRatio');
        }
        if (width <= 0 || height <= 0) {
            throw new Error('World: sizes width and height must be positive');
        }
        if (canvas != null && !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('World: canvas must be an HTMLCanvasElement when provided');
        }

        World.instance = this;

        this.scene = new THREE.Scene();
        this.camera = new Camera(sizes, this.scene);
        this.renderer = new Renderer(sizes, this.scene, this.camera.instance, canvas);

        this.studioDome = new StudioDome();
        this.studioDome.init({ scene: this.scene });
        if (this.studioDome.mesh) {
            this.scene.add(this.studioDome.mesh);
        }

        // Softer key (less directional “hot” edges); fill from ambient compensates brightness
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.05);
        this.directionalLight.position.set(-2.5, 4.5, 3.5);
        this.directionalLight.castShadow = true;
        const sh = this.directionalLight.shadow;
        sh.mapSize.width = 2048;
        sh.mapSize.height = 2048;
        sh.camera.near = 0.5;
        sh.camera.far = 25;
        // Hero rings ~±1.5 world XY; ±6 sufficient with catcher z=-1.5 (behind rear ring ~-0.85)
        sh.camera.left = -6;
        sh.camera.right = 6;
        sh.camera.top = 6;
        sh.camera.bottom = -6;
        sh.bias = -0.001;
        sh.radius = 12;
        this.scene.add(this.ambientLight, this.directionalLight);

        const shadowGeo = new THREE.PlaneGeometry(25, 25);
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 });
        this.shadowCatcher = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowCatcher.position.z = -1.5;
        this.shadowCatcher.receiveShadow = true;
        this.scene.add(this.shadowCatcher);

        this.resources = new ResourceLoader([
            { name: 'envMap', type: 'hdri', path: '/hdri/studio_small_09_1k.hdr' },
            { name: 'ringA', type: 'gltf', path: '/models/ring_a.glb' },
            { name: 'ringB', type: 'gltf', path: '/models/ring_b.glb' },
            { name: 'heroText', type: 'gltf', path: '/models/hero_text_opt.glb' },
        ]);

        /** Set from `main.js` after `resources:ready` (3D hero lettering). */
        this.heroText = null;

        this._onResourcesReady = () => {
            this._setupEnvironment();
        };
        window.addEventListener('resources:ready', this._onResourcesReady);
    }

    _setupEnvironment() {
        const texture = this.resources.get('envMap');
        if (!texture) {
            return;
        }
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const pmrem = new PMREMGenerator(this.renderer.instance);
        const envTexture = pmrem.fromEquirectangular(texture).texture;
        this.scene.environment = envTexture;
        pmrem.dispose();
        texture.dispose();
        delete this.resources.items.envMap;
    }

    update() {
        this.renderer.update(this.scene, this.camera.instance);
    }

    destroy() {
        window.removeEventListener('resources:ready', this._onResourcesReady);

        if (this.scene) {
            if (this.scene.environment) {
                this.scene.environment.dispose();
            }
            this.scene.environment = null;
        }

        this.resources?.destroy();
        this.resources = null;

        this.studioDome?.dispose();
        this.studioDome = null;

        if (this.shadowCatcher) {
            this.shadowCatcher.removeFromParent();
            this.shadowCatcher.geometry?.dispose();
            const m = this.shadowCatcher.material;
            if (m) m.dispose();
            this.shadowCatcher = null;
        }

        this.ambientLight = null;
        this.directionalLight = null;

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.instance) {
                this.renderer.instance.dispose();
                const el = this.renderer.instance.domElement;
                if (el?.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }
        }

        this.scene.clear();

        World.instance = null;
    }
}

export const getWorld = () => World.instance;
