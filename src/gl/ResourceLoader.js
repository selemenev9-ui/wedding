import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * @typedef {{ name: string; type: 'hdri' | 'texture' | 'font' | 'gltf'; path: string }} AssetDescriptor
 */

export default class ResourceLoader {
    /**
     * @param {AssetDescriptor[]} assets
     */
    constructor(assets) {
        this.assets = assets;
        /** @type {Record<string, THREE.Texture | string | import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>} */
        this.items = {};
        this._textureLoader = new THREE.TextureLoader();
        this._hdrLoader = new HDRLoader();
        this._dracoLoader = new DRACOLoader();
        this._dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        this._gltfLoader = new GLTFLoader();
        this._gltfLoader.setDRACOLoader(this._dracoLoader);
        this._gltfLoader.setMeshoptDecoder(MeshoptDecoder);
        /** @type {string[]} */
        this._fontBlobUrls = [];
        this._loadAll();
    }

    _loadAll() {
        const total = this.assets.length;
        let loaded = 0;

        const onOne = () => {
            loaded++;
            window.dispatchEvent(
                new CustomEvent('resources:progress', { detail: { loaded, total, ratio: loaded / total } }),
            );
        };

        const tasks = this.assets.map((desc) =>
            this._loadOne(desc).then(() => {
                onOne();
            }),
        );

        Promise.all(tasks)
            .then(() => {
                window.dispatchEvent(new CustomEvent('resources:ready'));
            })
            .catch((err) => {
                console.error('ResourceLoader failed:', err);
            });
    }

    /**
     * @param {AssetDescriptor} desc
     * @returns {Promise<void>}
     */
    _loadOne(desc) {
        const { name, type, path } = desc;

        if (type === 'hdri') {
            return new Promise((resolve, reject) => {
                this._hdrLoader.load(
                    path,
                    (texture) => {
                        this.items[name] = texture;
                        resolve();
                    },
                    undefined,
                    reject,
                );
            });
        }

        if (type === 'texture') {
            return new Promise((resolve, reject) => {
                this._textureLoader.load(
                    path,
                    (texture) => {
                        this.items[name] = texture;
                        resolve();
                    },
                    undefined,
                    reject,
                );
            });
        }

        if (type === 'font') {
            return fetch(path)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`ResourceLoader font "${name}": ${res.status} ${path}`);
                    }
                    return res.blob();
                })
                .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    this._fontBlobUrls.push(url);
                    this.items[name] = url;
                });
        }

        if (type === 'gltf') {
            return new Promise((resolve, reject) => {
                this._gltfLoader.load(
                    path,
                    (gltf) => {
                        this.items[name] = gltf;
                        resolve();
                    },
                    undefined,
                    reject,
                );
            });
        }

        return Promise.reject(new Error(`ResourceLoader: unknown type "${type}" for "${name}"`));
    }

    /**
     * @param {string} name
     * @returns {THREE.Texture | string | import('three/examples/jsm/loaders/GLTFLoader.js').GLTF | undefined}
     */
    get(name) {
        return this.items[name];
    }

    destroy() {
        for (const url of this._fontBlobUrls) {
            URL.revokeObjectURL(url);
        }
        this._fontBlobUrls = [];

        for (const key of Object.keys(this.items)) {
            const item = this.items[key];
            if (item && typeof item.dispose === 'function') {
                item.dispose();
            }
        }

        this.items = {};

        this._dracoLoader?.dispose();
        this._dracoLoader = null;
    }
}
