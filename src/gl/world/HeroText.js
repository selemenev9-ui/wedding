import * as THREE from 'three';
import { getWorld } from '../World.js';

/**
 * No-op stub — hero names are now rendered as DOM #hero-names on all screens.
 * Keeps the same public API so GSAP intro (group.scale 0→1) and World references
 * continue to work without modification.
 */
export default class HeroText {
    constructor() {
        const world = getWorld();
        if (!world) {
            throw new Error('HeroText: World singleton is not initialized');
        }

        this.scene = world.scene;

        this.root = new THREE.Group();
        this.root.name = 'HeroTextRoot';

        this.group = new THREE.Group();
        this.group.name = 'HeroText';
        this.group.visible = true;
        this.group.scale.setScalar(0);
        this.root.add(this.group);
        this.scene.add(this.root);

        /** Compatibility stub for World.tryFadeEnvReflections() */
        this.goldMaterial = null;

        this._built = true;
        this.ready = Promise.resolve();
    }

    _syncGoldEnvMap() {}

    destroy() {
        if (this.scene && this.root) this.scene.remove(this.root);
        this.goldMaterial = null;
        this.root = null;
        this.group = null;
        this._built = false;
    }
}
