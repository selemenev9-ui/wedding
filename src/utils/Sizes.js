export default class Sizes {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // Balanced desktop supersample: cleaner edges with safer FPS.
        const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
        const renderScale = isFinePointer ? 1.5 : 1.0;
        const dprCap = isFinePointer ? 2 : 2;
        this.pixelRatio = Math.min(window.devicePixelRatio * renderScale, dprCap);
    }
}