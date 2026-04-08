export default class Sizes {
    constructor() {
        this.width  = window.innerWidth;
        this.height = window.innerHeight;

        const coarse = typeof window !== 'undefined' &&
            window.matchMedia('(pointer: coarse)').matches;
        this.coarsePointer = coarse;

        const dprCap = coarse ? 1.5 : 2.0;
        this.pixelRatio = Math.min(window.devicePixelRatio, dprCap);
    }
}
