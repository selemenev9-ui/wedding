import * as THREE from 'three';
import { getWorld } from '../World.js';

const COUNT = 600;

const vertexShader = /* glsl */ `
attribute float aSpeed;
attribute float aRotSpeed;
attribute float aWobble;
attribute float aSeed;
attribute float aColor;

uniform float uTime;

varying vec2 vUv;
varying float vColorAttr;

void main() {
	vUv = uv;
	vColorAttr = aColor;

	vec3 transformed = position;
	transformed.z += aSpeed * 0.0;
	float ang = uTime * aRotSpeed;
	float c = cos( ang );
	float s = sin( ang );
	transformed.xy = mat2( c, -s, s, c ) * transformed.xy;

	vec4 worldPos;
#ifdef USE_INSTANCING
	worldPos = modelMatrix * instanceMatrix * vec4( transformed, 1.0 );
#else
	worldPos = modelMatrix * vec4( transformed, 1.0 );
#endif
	worldPos.x += sin( uTime * aWobble + aSeed ) * 0.3;

	gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying float vColorAttr;

void main() {
	vec3 rose = vec3( 0.957, 0.757, 0.757 );
	vec3 champagne = vec3( 0.945, 0.898, 0.675 );
	vec3 color = mix( rose, champagne, vColorAttr );
	float alpha = smoothstep( 1.0, 0.3, length( vUv - vec2( 0.5 ) ) * 2.2 );
	gl_FragColor = vec4( color, alpha * 0.55 );
}
`;

export default class Petals {
    constructor() {
        const world = getWorld();
        if (!world) {
            throw new Error('Petals: World singleton is not initialized');
        }
        this.scene = world.scene;

        const geometry = new THREE.PlaneGeometry(0.12, 0.18);

        const aSpeed = new Float32Array(COUNT);
        const aRotSpeed = new Float32Array(COUNT);
        const aWobble = new Float32Array(COUNT);
        const aSeed = new Float32Array(COUNT);
        const aColor = new Float32Array(COUNT);

        for (let i = 0; i < COUNT; i++) {
            aSpeed[i] = 0.008 + Math.random() * (0.025 - 0.008);
            aRotSpeed[i] = -0.02 + Math.random() * 0.04;
            aWobble[i] = 0.5 + Math.random() * 1.5;
            aSeed[i] = Math.random() * 6.28;
            aColor[i] = Math.random();
        }

        geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(aSpeed, 1));
        geometry.setAttribute('aRotSpeed', new THREE.InstancedBufferAttribute(aRotSpeed, 1));
        geometry.setAttribute('aWobble', new THREE.InstancedBufferAttribute(aWobble, 1));
        geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
        geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 1));

        this.aSpeed = aSpeed;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, COUNT);
        this.mesh.frustumCulled = false;

        this.dummy = new THREE.Object3D();
        this.posX = new Float32Array(COUNT);
        this.posY = new Float32Array(COUNT);
        this.posZ = new Float32Array(COUNT);

        for (let i = 0; i < COUNT; i++) {
            this.posX[i] = -6 + Math.random() * 12;
            this.posY[i] = 4 + Math.random() * 16;
            this.posZ[i] = -3 - Math.random() * 3;
            this.dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;

        this.scene.add(this.mesh);
        this._prevMs = null;
    }

    /**
     * @param {number} timeMs
     * @param {number} scrollProgress 0–1
     */
    update(timeMs, scrollProgress) {
        const mat = /** @type {THREE.ShaderMaterial} */ (this.mesh.material);
        mat.uniforms.uTime.value = timeMs * 0.001;

        const dt =
            this._prevMs !== null ? Math.min((timeMs - this._prevMs) / 1000, 0.05) : 1 / 60;
        this._prevMs = timeMs;

        const fallMul = 1.0 + scrollProgress * 3.0;
        const step = 60 * dt;

        for (let i = 0; i < COUNT; i++) {
            this.posY[i] -= this.aSpeed[i] * fallMul * step;

            if (this.posY[i] < -5) {
                this.posY[i] = 14 + Math.random() * 6;
            }

            this.dummy.position.set(this.posX[i], this.posY[i], this.posZ[i]);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
    }
}
