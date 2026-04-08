import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export default class Renderer {
    /**
     * @param {import('../utils/Sizes.js').default | { width: number; height: number; pixelRatio: number }} sizes
     * @param {THREE.Scene} scene
     * @param {THREE.PerspectiveCamera} camera
     * @param {HTMLCanvasElement} [canvas]
     */
    constructor(sizes, scene, camera, canvas) {
        const params = { antialias: false, alpha: false };
        if (canvas) {
            params.canvas = canvas;
        }
        this.instance = new THREE.WebGLRenderer(params);
        this.instance.setSize(sizes.width, sizes.height);
        this.instance.domElement.style.width = `${sizes.width}px`;
        this.instance.domElement.style.height = `${sizes.height}px`;
        this.instance.setPixelRatio(sizes.pixelRatio);
        // Matches StudioDome interior (#EAE7DC); avoids flash while loading
        this.instance.setClearColor('#EAE7DC', 1);

        this.instance.outputColorSpace = THREE.SRGBColorSpace;
        this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        this.instance.toneMappingExposure = 1.0;
        this.instance.shadowMap.enabled = true;
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

        if (!canvas) {
            document.body.appendChild(this.instance.domElement);
        }

        /** @type {EffectComposer | null} */
        this.composer = null;
        /** @type {SMAAPass | null} */
        this._smaaPass = null;
        /** @type {OutputPass | null} */
        this._outputPass = null;
        /** @type {RenderPass | null} */
        this._renderPass = null;

        this._scene = scene;
        this._camera = camera;
        this._sizes = sizes;
    }

    _ensureComposer() {
        if (this.composer) return;

        const size = new THREE.Vector2();
        this.instance.getSize(size);
        const pr = this.instance.getPixelRatio();

        // Desktop: MSAA 8x + SMAA. Coarse-pointer mobile: disable RT MSAA to cut GPU cost and keep SMAA.
        const rtSamples = this._sizes?.coarsePointer ? 0 : 8;
        const renderTarget = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
            samples: rtSamples,
            type: THREE.HalfFloatType, // match EffectComposer default (HDR-friendly before OutputPass)
        });
        renderTarget.texture.name = 'EffectComposer.rt1';

        const composer = new EffectComposer(this.instance, renderTarget);
        const renderPass = new RenderPass(this._scene, this._camera);
        this._renderPass = renderPass;
        composer.addPass(renderPass);

        const smaaPass = new SMAAPass();
        this._smaaPass = smaaPass;
        composer.addPass(smaaPass);

        const outputPass = new OutputPass();
        this._outputPass = outputPass;
        composer.addPass(outputPass);

        composer.setSize(size.x, size.y);
        composer.setPixelRatio(pr);

        this.composer = composer;
    }

    resize(sizes) {
        this._sizes = sizes;
        this.instance.setSize(sizes.width, sizes.height);
        this.instance.domElement.style.width = `${sizes.width}px`;
        this.instance.domElement.style.height = `${sizes.height}px`;
        this.instance.setPixelRatio(sizes.pixelRatio);
        if (this.composer) {
            this.composer.setSize(sizes.width, sizes.height);
            this.composer.setPixelRatio(sizes.pixelRatio);
        }
    }

    update(scene, camera) {
        this._scene = scene;
        this._camera = camera;
        this._ensureComposer();
        if (this._renderPass) {
            this._renderPass.scene = scene;
            this._renderPass.camera = camera;
        }
        this.composer.render();
    }

    dispose() {
        this._smaaPass?.dispose();
        this._smaaPass = null;
        this._outputPass?.dispose();
        this._outputPass = null;
        this.composer?.dispose();
        this.composer = null;
        this._renderPass = null;
    }
}
