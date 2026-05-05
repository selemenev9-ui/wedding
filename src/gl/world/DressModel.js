import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';
import { getWorld } from '../World.js';

const PRESETS = {
    'Шоколад': {
        chipColor:       '#5a4437',
        color:           '#8a6852',
        roughness:       0.58,
        sheen:           0.84,
        sheenRoughness:  0.16,
        sheenColor:      '#e0bea0',
        iridescence:     0.0,
        envMapIntensity: 0.40,
        satinLift:       0.15,
        satinContrast:   0.78,
        satinSaturation: 0.62,
        satinRim:        0.30,
        satinGlowColor:  '#e7c8a8',
    },
    'Жемчуг': {
        chipColor:       '#ded0c1',
        color:           '#cdb9a3',
        roughness:       0.52,
        sheen:           1.00,
        sheenRoughness:  0.10,
        sheenColor:      '#ffe6c8',
        iridescence:     0.16,
        envMapIntensity: 0.36,
        satinLift:       0.04,
        satinContrast:   0.92,
        satinSaturation: 0.86,
        satinRim:        0.18,
        satinGlowColor:  '#f7dcc0',
    },
    'Роза': {
        chipColor:       '#c39a9a',
        color:           '#c08d90',
        roughness:       0.50,
        sheen:           0.96,
        sheenRoughness:  0.12,
        sheenColor:      '#ffd7dc',
        iridescence:     0.0,
        envMapIntensity: 0.46,
        satinLift:       0.10,
        satinContrast:   0.82,
        satinSaturation: 0.72,
        satinRim:        0.26,
        satinGlowColor:  '#ffdce1',
    },
    'Фисташка': {
        chipColor:       '#99a287',
        color:           '#83906f',
        roughness:       0.56,
        sheen:           0.76,
        sheenRoughness:  0.15,
        sheenColor:      '#d9e3cd',
        iridescence:     0.0,
        envMapIntensity: 0.44,
        satinLift:       0.15,
        satinContrast:   0.74,
        satinSaturation: 0.74,
        satinRim:        0.29,
        satinGlowColor:  '#e0e6d4',
    },
};

export default class DressModel {
    constructor() {
        this._world = getWorld();
        if (!this._world) throw new Error('DressModel: World not ready');

        this._destroyed   = false;
        this._tracker     = document.querySelector('.dresscode-3d-wrap');
        this._shaderUniforms = null;
        this._dragging = false;
        this._dragPointerId = null;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._dragLastX = 0;
        this._dragLastTime = 0;
        this._dragIntent = false;
        this._rotationTargetY = 0;
        this._rotationVelocity = 0.003;

        const pearl = PRESETS['Жемчуг'];
        this._satinState = {
            lift:       pearl.satinLift,
            contrast:   pearl.satinContrast,
            saturation: pearl.satinSaturation,
            rim:        pearl.satinRim,
            glowColor:  new THREE.Color(pearl.satinGlowColor),
        };

        this._material = new THREE.MeshPhysicalMaterial({
            color:           new THREE.Color(pearl.color),
            metalness:       0.0,
            roughness:       pearl.roughness,
            sheen:           pearl.sheen,
            sheenRoughness:  pearl.sheenRoughness,
            sheenColor:      new THREE.Color(pearl.sheenColor),
            iridescence:                pearl.iridescence,
            iridescenceIOR:             1.85,
            iridescenceThicknessRange:  [80, 380],
            envMap:          this._world.scene.environment,
            envMapIntensity: pearl.envMapIntensity,
            side:            THREE.DoubleSide,
        });

        this._material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uSatinLift = { value: this._satinState.lift };
            shader.uniforms.uSatinContrast = { value: this._satinState.contrast };
            shader.uniforms.uSatinSaturation = { value: this._satinState.saturation };
            shader.uniforms.uSatinRim = { value: this._satinState.rim };
            shader.uniforms.uSatinGlowColor = { value: this._satinState.glowColor.clone() };
            this._shaderUniforms  = shader.uniforms;
            shader.vertexShader   = 'uniform float uTime;\nvarying vec3 vSatinObjectNormal;\n' + shader.vertexShader;
            shader.vertexShader   = shader.vertexShader.replace(
                '#include <begin_vertex>',
                /* glsl */`
                #include <begin_vertex>
                float sway    = sin(position.y * 2.8 + uTime * 0.85) * 0.006;
                float billow  = cos(position.x * 2.2 + position.y * 1.6 + uTime * 1.05) * 0.005;
                float flutter = sin(position.x * 4.0 + uTime * 1.40) * 0.003;
                transformed.x += sway + flutter;
                transformed.z += billow;
                `,
            );
            shader.vertexShader   = shader.vertexShader.replace(
                '#include <beginnormal_vertex>',
                /* glsl */`
                #include <beginnormal_vertex>
                vSatinObjectNormal = normalize(objectNormal);
                `,
            );
            shader.fragmentShader = 'uniform float uSatinLift;\nuniform float uSatinContrast;\nuniform float uSatinSaturation;\nuniform float uSatinRim;\nuniform vec3 uSatinGlowColor;\nvarying vec3 vSatinObjectNormal;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <lights_fragment_end>',
                /* glsl */`
                #include <lights_fragment_end>

                float satinFacing = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
                float satinRim = pow(1.0 - satinFacing, 2.2) * uSatinRim;
                float satinWarp = abs(vSatinObjectNormal.y);
                float satinThread = pow(1.0 - satinWarp, 1.8) * 0.16;

                vec3 satinDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
                vec3 satinLuma = vec3(dot(satinDiffuse, vec3(0.299, 0.587, 0.114)));
                satinDiffuse = mix(satinLuma, satinDiffuse, uSatinSaturation);
                satinDiffuse *= uSatinContrast;
                satinDiffuse += diffuseColor.rgb * uSatinLift * (1.0 - satinFacing) * 0.28;
                reflectedLight.directDiffuse = satinDiffuse * 0.62;
                reflectedLight.indirectDiffuse = satinDiffuse * 0.38;

                vec3 satinGlow = uSatinGlowColor * (satinRim + satinThread);
                reflectedLight.directSpecular = mix(reflectedLight.directSpecular, satinGlow, 0.18);
                reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, satinGlow * 0.65, 0.14);
                `,
            );
        };
        this._material.customProgramCacheKey = () => 'dress-satin-fabric-v2';

        this._floatGroup = new THREE.Group();
        this._floatGroup.visible = false;
        this._world.scene.add(this._floatGroup);

        this._listeners = [];
        this._load();
        this.bindSwatches();
        this.bindRotation();
    }

    _load() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load('/models/dress.glb', (gltf) => {
            if (this._destroyed) { dracoLoader.dispose(); return; }

            gltf.scene.traverse((child) => {
                if (!child.isMesh) return;
                child.material = this._material;
            });

            const box  = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            gltf.scene.scale.setScalar(2.8 / Math.max(size.x, size.y, size.z, 0.001));

            box.setFromObject(gltf.scene);
            gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));

            this._floatGroup.add(gltf.scene);
            dracoLoader.dispose();
        }, undefined, (err) => {
            console.error('DressModel: failed to load dress.glb', err);
            dracoLoader.dispose();
        });
    }

    morphTo(name) {
        const preset = PRESETS[name];
        if (!preset || !this._material || this._destroyed) return;

        const targetColor = new THREE.Color(preset.color);
        const targetSheen = new THREE.Color(preset.sheenColor);

        gsap.to(this._material.color, {
            r: targetColor.r,
            g: targetColor.g,
            b: targetColor.b,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => {
                this._material.needsUpdate = true;
            },
        });

        gsap.to(this._material.sheenColor, {
            r: targetSheen.r,
            g: targetSheen.g,
            b: targetSheen.b,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => {
                this._material.needsUpdate = true;
            },
        });

        gsap.to(this._material, {
            roughness:       preset.roughness,
            sheen:           preset.sheen,
            sheenRoughness:  preset.sheenRoughness,
            iridescence:     preset.iridescence,
            envMapIntensity: preset.envMapIntensity,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => {
                this._material.needsUpdate = true;
            },
        });

        const satinGlow = new THREE.Color(preset.satinGlowColor);
        gsap.to(this._satinState, {
            lift:       preset.satinLift,
            contrast:   preset.satinContrast,
            saturation: preset.satinSaturation,
            rim:        preset.satinRim,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => {
                if (!this._shaderUniforms) return;
                this._shaderUniforms.uSatinLift.value = this._satinState.lift;
                this._shaderUniforms.uSatinContrast.value = this._satinState.contrast;
                this._shaderUniforms.uSatinSaturation.value = this._satinState.saturation;
                this._shaderUniforms.uSatinRim.value = this._satinState.rim;
            },
        });

        gsap.to(this._satinState.glowColor, {
            r: satinGlow.r,
            g: satinGlow.g,
            b: satinGlow.b,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => {
                if (!this._shaderUniforms) return;
                this._shaderUniforms.uSatinGlowColor.value.copy(this._satinState.glowColor);
            },
        });
    }

    bindSwatches() {
        document.querySelectorAll('.dresscode-swatch').forEach((el) => {
            const name = el.querySelector('.dresscode-swatch-name')?.textContent?.trim();
            if (!name || !PRESETS[name]) return;
            el.querySelector('.dresscode-swatch-dot')
                .style.setProperty('--swatch-color', PRESETS[name].chipColor);
            const onActivate = () => this.morphTo(name);
            el.addEventListener('mouseenter', onActivate, { passive: true });
            el.addEventListener('touchstart',  onActivate, { passive: true });
            this._listeners.push({ el, onActivate });
        });
    }

    bindRotation() {
        if (!this._tracker) return;

        const onPointerDown = (event) => {
            this._dragging = true;
            this._dragPointerId = event.pointerId;
            this._dragStartX = event.clientX;
            this._dragStartY = event.clientY;
            this._dragLastX = event.clientX;
            this._dragLastTime = performance.now();
            this._dragIntent = false;
            this._rotationVelocity = 0;
            this._tracker.setPointerCapture(event.pointerId);
        };

        const onPointerMove = (event) => {
            if (!this._dragging || event.pointerId !== this._dragPointerId) return;

            const dxFromStart = event.clientX - this._dragStartX;
            const dyFromStart = event.clientY - this._dragStartY;
            if (!this._dragIntent) {
                if (Math.abs(dxFromStart) < 8) return;
                if (Math.abs(dyFromStart) > Math.abs(dxFromStart) * 1.15) return;
                this._dragIntent = true;
            }

            event.preventDefault();
            const now = performance.now();
            const dx = event.clientX - this._dragLastX;
            const dt = Math.max(now - this._dragLastTime, 16);
            const deltaRotation = dx * 0.012;
            this._rotationTargetY += deltaRotation;
            this._rotationVelocity = deltaRotation / dt * 16;
            this._dragLastX = event.clientX;
            this._dragLastTime = now;
        };

        const onPointerEnd = (event) => {
            if (event.pointerId !== this._dragPointerId) return;
            this._dragging = false;
            this._dragPointerId = null;
            this._dragIntent = false;
            this._tracker.releasePointerCapture(event.pointerId);
        };

        this._tracker.addEventListener('pointerdown', onPointerDown);
        this._tracker.addEventListener('pointermove', onPointerMove);
        this._tracker.addEventListener('pointerup', onPointerEnd);
        this._tracker.addEventListener('pointercancel', onPointerEnd);
        this._listeners.push({
            el: this._tracker,
            onPointerDown,
            onPointerMove,
            onPointerEnd,
        });
    }

    update() {
        if (this._destroyed || !this._tracker || !this._floatGroup.children.length) return;

        // Update fabric wave time
        if (this._shaderUniforms) {
            this._shaderUniforms.uTime.value = performance.now() * 0.001;
        }

        const rect = this._tracker.getBoundingClientRect();
        const vh   = window.innerHeight;
        const vw   = window.innerWidth;

        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            this._floatGroup.visible = false;
            return;
        }
        this._floatGroup.visible = true;

        const camera = this._world.camera.instance;
        const camZ   = camera.position.z;
        const vFOV   = THREE.MathUtils.degToRad(camera.fov);
        const worldH = 2 * camZ * Math.tan(vFOV * 0.5);
        const worldW = worldH * camera.aspect;

        const ndcX =  ((rect.left + rect.right)  / 2 / vw) * 2 - 1;
        const ndcY = -(((rect.top  + rect.bottom) / 2 / vh) * 2 - 1);

        const t = performance.now() * 0.001;
        this._floatGroup.position.x  = ndcX * worldW * 0.5;
        this._floatGroup.position.y  = (ndcY * worldH * 0.5)
                                      + Math.sin(t * 0.65) * 0.07
                                      + Math.sin(t * 0.3 + 1.2) * 0.025;
        if (!this._dragging) {
            this._rotationTargetY += this._rotationVelocity;
            this._rotationVelocity = this._rotationVelocity * 0.94 + 0.003 * 0.06;
        }
        this._floatGroup.rotation.y += (this._rotationTargetY - this._floatGroup.rotation.y) * 0.18;
    }

    destroy() {
        this._destroyed = true;
        for (const { el, onActivate } of this._listeners) {
            if (onActivate) {
                el.removeEventListener('mouseenter', onActivate);
                el.removeEventListener('touchstart',  onActivate);
            }
        }
        for (const { el, onPointerDown, onPointerMove, onPointerEnd } of this._listeners) {
            if (onPointerDown) {
                el.removeEventListener('pointerdown', onPointerDown);
                el.removeEventListener('pointermove', onPointerMove);
                el.removeEventListener('pointerup', onPointerEnd);
                el.removeEventListener('pointercancel', onPointerEnd);
            }
        }
        this._material?.dispose();
        if (this._world?.scene && this._floatGroup) {
            this._world.scene.remove(this._floatGroup);
        }
    }
}
