import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import Sizes from './utils/Sizes.js';
import World, { getWorld } from './gl/World.js';
import GlassRing from './gl/world/GlassRing.js';
import HeroText from './gl/world/HeroText.js';
import Scroll, { bindGlassRingScrollEffects } from './modules/Scroll.js';

if (!gsap.plugins?.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
}


if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
if (window.scrollY === 0) {
    gsap.set('#hero-overlay', { opacity: 1 });
}

// `#hero-names` visibility: `setupHeroTextMedia` once `HeroText` exists (asynchronous layered loading).
gsap.set('.hero-bottom, .hero-scroll-indicator, #site-nav', { opacity: 0 });

if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
    import('./modules/Cursor.js')
        .then(({ default: Cursor }) => {
            new Cursor();
        })
        .catch((err) => {
            console.warn('Cursor lazy-load failed:', err);
        });
}

// ── Preloader SVG ring progress ───────────────────────────────────────
const CIRCUMFERENCE = 238.76;
const preloaderArc = document.getElementById('preloader-arc');

// Idle slow rotation on the SVG wrap while loading
const preloaderWrap = document.querySelector('.preloader-ring-wrap');
if (preloaderWrap) {
    gsap.to(preloaderWrap, {
        rotation: 360,
        duration: 18,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
    });
}

if (preloaderArc) {
    gsap.set(preloaderArc, { attr: { 'stroke-dashoffset': CIRCUMFERENCE } });

    window.addEventListener('resources:progress', (e) => {
        const ratio = e.detail?.ratio ?? 0;
        gsap.to(preloaderArc, {
            attr: { 'stroke-dashoffset': CIRCUMFERENCE * (1 - ratio) },
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
        });
    });
}
// ─────────────────────────────────────────────────────────────────────

const sizes = new Sizes();
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const world = new World({ canvas, sizes });
world.resize(sizes.width, sizes.height, sizes.pixelRatio);

window.addEventListener('mousemove', (e) => {
    const w = sizes.width;
    const h = sizes.height;
    if (w <= 0 || h <= 0) return;
    const ndcX = (e.clientX / w) * 2 - 1;
    const ndcY = -(e.clientY / h) * 2 + 1;
    world.updateMouse(ndcX, ndcY);
});

/** @type {import('./gl/world/GlassRing.js').default | null} */
let glassRing = null;

/** @type {import('./gl/world/HeroText.js').default | null} */
let heroText = null;

/** Settled after `GlassRing` / `HeroText` constructors run (idle/yield to cut TBT). */
let meshInitResolve = () => {};
const meshInitPromise = new Promise((resolve) => {
    meshInitResolve = resolve;
});

function scheduleIdleMeshInit(fn) {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => fn(), { timeout: 250 });
    } else {
        setTimeout(fn, 0);
    }
}

/** @type {InstanceType<typeof SplitType> | null} */
let heroSplitTagline = null;
/** @type {gsap.core.Timeline | null} */
let heroIntroTimeline = null;
let heroIntroCompleted = false;
let heroSplitResizeTimer = 0;
const HERO_SPLIT_DEBOUNCE_MS = 150;
const HERO_NAMES_MIN_PX = 60;
const HERO_NAMES_MAX_PX = 148;
const HERO_NAMES_SIDE_PADDING_PX = 32;

function fitHeroNamesToViewport() {
    if (typeof window === 'undefined') return;
    const heroNamesDOM = document.querySelector('#hero-names');
    if (!heroNamesDOM) return;

    const shouldStack = window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches;
    heroNamesDOM.classList.toggle('hero-names--stacked', shouldStack);
    if (!shouldStack) {
        heroNamesDOM.style.removeProperty('max-width');
        heroNamesDOM.style.removeProperty('white-space');
        heroNamesDOM.style.removeProperty('display');
        heroNamesDOM.style.removeProperty('flex-wrap');
        heroNamesDOM.style.removeProperty('justify-content');
        heroNamesDOM.style.removeProperty('font-size');
        return;
    }

    const maxWidth = Math.max(0, window.innerWidth - HERO_NAMES_SIDE_PADDING_PX);
    let sizePx = Math.min(
        HERO_NAMES_MAX_PX,
        window.innerWidth * 0.27,
        window.innerHeight * 0.215,
    );
    sizePx = Math.max(HERO_NAMES_MIN_PX, Math.floor(sizePx));

    // Stacked intent (all narrow devices): keep title large while fitting viewport width.
    heroNamesDOM.style.maxWidth = `${maxWidth}px`;
    heroNamesDOM.style.whiteSpace = 'normal';
    heroNamesDOM.style.display = 'flex';
    heroNamesDOM.style.flexWrap = 'nowrap';
    heroNamesDOM.style.justifyContent = 'center';
    heroNamesDOM.style.fontSize = `${sizePx}px`;

    // If a narrow viewport still overflows due to glyph metrics, reduce gradually.
    let guard = 0;
    while (heroNamesDOM.getBoundingClientRect().width > maxWidth && sizePx > HERO_NAMES_MIN_PX && guard < 200) {
        sizePx -= 1;
        heroNamesDOM.style.fontSize = `${sizePx}px`;
        guard += 1;
    }
}

function setHeroNamesState({ opacity = 1, y = 0, scale = 1, pointerEvents = 'none' } = {}) {
    const heroNamesDOM = document.querySelector('#hero-names');
    if (!heroNamesDOM) return;
    gsap.set(heroNamesDOM, {
        opacity,
        y,
        scale,
        pointerEvents,
        clearProps: 'display',
        xPercent: -50,
        yPercent: -50,
        x: 0,
    });
}

/**
 * Initialise `#hero-names` DOM element state — shown on all screens.
 * @param {import('./gl/world/HeroText.js').default | null} _ht
 */
function setupHeroTextMedia(_ht) {
    const heroNamesDOM = document.querySelector('#hero-names');
    if (!heroNamesDOM || typeof window === 'undefined') return;
    setHeroNamesState({ opacity: heroIntroCompleted ? 1 : 0, y: heroIntroCompleted ? 0 : 20 });
    fitHeroNamesToViewport();
}

/**
 * @param {'hidden' | 'visible'} visibility
 */
function rebuildHeroSplits(visibility) {
    const taglineEl = document.querySelector('.hero-tagline');
    if (!taglineEl) return;

    heroSplitTagline?.revert();

    heroSplitTagline = new SplitType(taglineEl, { types: 'words' });

    if (visibility === 'visible') {
        gsap.set(heroSplitTagline.words, { y: '0%', opacity: 1 });
    } else {
        gsap.set(heroSplitTagline.words, { y: '100%', opacity: 0 });
    }
}

function handleHeroSplitResize() {
    if (!heroSplitTagline) return;

    if (heroIntroTimeline) {
        heroIntroTimeline.kill();
        heroIntroTimeline = null;
        heroIntroCompleted = true;
        if (glassRing?.mesh) {
            gsap.set(glassRing.mesh.scale, { x: 1, y: 1, z: 1 });
        }
        gsap.set(['.hero-tagline', '.hero-bottom'], {
            opacity: 1,
            y: 0,
        });
        setHeroNamesState({ opacity: 1, y: 0, scale: 1, pointerEvents: 'none' });
        gsap.killTweensOf('.hero-scroll-indicator');
        gsap.set('.hero-scroll-indicator', {
            opacity: 1,
            scaleY: 1,
            transformOrigin: 'top center',
        });
        startWeddingCountdownTicker();
    }

    rebuildHeroSplits(heroIntroCompleted ? 'visible' : 'hidden');
    fitHeroNamesToViewport();
    ScrollTrigger.refresh();
}

window.addEventListener('resize', () => {
    window.clearTimeout(heroSplitResizeTimer);
    heroSplitResizeTimer = window.setTimeout(handleHeroSplitResize, HERO_SPLIT_DEBOUNCE_MS);
});

let galleryRibbon = null;
let galleryRibbonPromise = null;

async function ensureGalleryRibbon() {
    if (galleryRibbon) return galleryRibbon;
    if (!galleryRibbonPromise) {
        galleryRibbonPromise = import('./gl/world/GalleryRibbon.js')
            .then(({ default: GalleryRibbon }) => {
                galleryRibbon = new GalleryRibbon();
                const wr = getWorld();
                if (wr) wr.galleryRibbon = galleryRibbon;
                return galleryRibbon;
            })
            .catch((err) => {
                galleryRibbonPromise = null;
                throw err;
            });
    }
    return galleryRibbonPromise;
}

let mouseParallax = { update: () => {}, destroy: () => {} };

const scroll = new Scroll();
scroll.lenis.stop();
scroll.resize();

const { lenis } = scroll;

scheduleIdleMeshInit(() => {
    try {
        glassRing = new GlassRing();
        glassRing.mesh.scale.setScalar(0);

        try {
            heroText = new HeroText();
            const w = getWorld();
            if (w) {
                w.heroText = heroText;
                w.glassRing = glassRing;
            }
        } catch (e) {
            console.error('HeroText init failed:', e);
        }

        const _kickEnvFade = () => world.tryFadeEnvReflections?.();
        _kickEnvFade();
        heroText?.ready.then(_kickEnvFade);
        glassRing.ready.then(_kickEnvFade);

        setupHeroTextMedia(heroText);

        if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
            import('./modules/MouseParallax.js')
                .then(({ default: MouseParallax }) => {
                    mouseParallax.destroy();
                    if (!glassRing?.mesh) return;
                    mouseParallax = new MouseParallax([{ object: glassRing.mesh, depth: 0.06 }]);
                })
                .catch((err) => {
                    console.warn('MouseParallax lazy-load failed:', err);
                });
        }
    } finally {
        meshInitResolve();
    }
});

let ringScrollEffectsBound = false;
function ensureRingScrollEffectsBound() {
    if (ringScrollEffectsBound || !glassRing) return;
    bindGlassRingScrollEffects(glassRing);
    ringScrollEffectsBound = true;
    scroll.resize();
}

let loggedDrawCalls = false;

lenis.on('scroll', () => {
    ScrollTrigger.update();
});

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);

    galleryRibbon?.update();
    glassRing?.update();
    mouseParallax.update();
    world.update();
    if (!loggedDrawCalls) {
        loggedDrawCalls = true;
        console.log('Draw calls:', world.renderer.instance.info.render.calls);
    }
});
gsap.ticker.lagSmoothing(0);

/** Hero overlay: scrubbed fade + lift over first ~800px (replaces scrollY > 80 snap). */
gsap.fromTo(
    '#hero-overlay',
    { opacity: 1, y: 0 },
    {
        opacity: 0,
        y: -56,
        ease: 'none',
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: '+=800',
            scrub: true,
        },
    },
);

ScrollTrigger.create({
    trigger: 'body',
    start: 'top -80px',
    toggleClass: { targets: '#site-nav', className: 'nav--scrolled' },
});

/** Local ceremony time (MSK, UTC+3) */
const WEDDING_COUNTDOWN_TARGET = new Date('2026-09-19T16:00:00+03:00');

/** Started after hero intro completes (or resize-aborted intro) so the 1s timer does not compete with boot TBT. */
let weddingCountdownIntervalId = 0;
function startWeddingCountdownTicker() {
    if (weddingCountdownIntervalId !== 0) return;
    tickWeddingCountdown();
    weddingCountdownIntervalId = window.setInterval(tickWeddingCountdown, 1000);
}

function tickWeddingCountdown() {
    const elDays = document.getElementById('cd-days');
    const elHours = document.getElementById('cd-hours');
    const elMinutes = document.getElementById('cd-minutes');
    if (!elDays || !elHours || !elMinutes) return;

    let ms = WEDDING_COUNTDOWN_TARGET.getTime() - Date.now();
    if (ms <= 0) {
        elDays.textContent = '000';
        elHours.textContent = '00';
        elMinutes.textContent = '00';
        return;
    }

    const days = Math.floor(ms / 86400000);
    ms %= 86400000;
    const hours = Math.floor(ms / 3600000);
    ms %= 3600000;
    const minutes = Math.floor(ms / 60000);

    elDays.textContent = String(days).padStart(3, '0');
    elHours.textContent = String(hours).padStart(2, '0');
    elMinutes.textContent = String(minutes).padStart(2, '0');
}

/** Defer path SplitType + ring `ScrollTrigger` wiring to the next frame so the preloader can paint first. */
function flushDeferredRingScrollBind() {
    ensureRingScrollEffectsBound();
    ScrollTrigger.refresh();
}

function runHeroIntro() {
    scroll.resize();
    scroll.lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();

    scroll.lenis.start();

    heroIntroCompleted = false;
    rebuildHeroSplits('hidden');

    gsap.killTweensOf('#hero-names');

    if (heroSplitTagline?.words?.length) {
        gsap.set(heroSplitTagline.words, { y: '0%', opacity: 0 });
    }
    gsap.set('.hero-tagline', { opacity: 0, y: 20, xPercent: -50, x: 0 });
    setHeroNamesState({ opacity: 0, y: 20, scale: 1, pointerEvents: 'none' });
    fitHeroNamesToViewport();
    gsap.set('.hero-bottom', { opacity: 0, y: 20 });

    heroIntroTimeline = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
            heroIntroCompleted = true;
            heroIntroTimeline = null;
            ScrollTrigger.refresh();
            startWeddingCountdownTicker();
            gsap.to('.hero-scroll-indicator', {
                scaleY: 0.5,
                opacity: 0.3,
                duration: 1,
                yoyo: true,
                repeat: -1,
                ease: 'power1.inOut',
                transformOrigin: 'top center',
            });
        },
    });

    const ringScaleIn = { x: 1, y: 1, z: 1, duration: 3.2, ease: 'expo.out' };
    if (glassRing?._built) {
        gsap.set(glassRing.mesh.rotation, { y: Math.PI * -0.15, z: Math.PI * 0.05 });
        heroIntroTimeline
            .to(glassRing.mesh.scale, ringScaleIn, 0.05)
            .to(glassRing.mesh.rotation, { x: 0, y: 0, z: 0, duration: 3.2, ease: 'power3.out' }, 0.05);
    } else if (glassRing) {
        glassRing.ready.then(() => {
            gsap.set(glassRing.mesh.rotation, { y: Math.PI * -0.15, z: Math.PI * 0.05 });
            gsap.to(glassRing.mesh.scale, ringScaleIn);
            gsap.to(glassRing.mesh.rotation, { x: 0, y: 0, z: 0, duration: 3.2, ease: 'power3.out' });
        });
    }

    const introHeroIn = '-=0.8';
    const introSt = '<0.15';
    heroIntroTimeline.fromTo(
        '.hero-tagline',
        { opacity: 0, y: 20, xPercent: -50, x: 0 },
        {
            opacity: 1,
            y: 0,
            xPercent: -50,
            x: 0,
            duration: 1.2,
            clearProps: 'all',
        },
        introHeroIn,
    );
    if (heroSplitTagline?.words?.length) {
        heroIntroTimeline.to(
            heroSplitTagline.words,
            {
                opacity: 1,
                duration: 0.75,
                ease: 'expo.out',
                stagger: { amount: 0.2, from: 'start' },
            },
            '<',
        );
    }
    heroIntroTimeline.fromTo(
        '#hero-names',
        { opacity: 0, y: 20, xPercent: -50, yPercent: -50, x: 0 },
        {
            opacity: 1,
            y: 0,
            xPercent: -50,
            yPercent: -50,
            x: 0,
            duration: 1.2,
        },
        introSt,
    );
    heroIntroTimeline.fromTo(
        '.hero-bottom',
        { opacity: 0, y: 20 },
        {
            opacity: 1,
            y: 0,
            duration: 1.2,
            clearProps: 'all',
        },
        introSt,
    );
    heroIntroTimeline.fromTo(
        '#site-nav',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1.2, clearProps: 'all' },
        introSt,
    );

    heroIntroTimeline.fromTo(
        '.hero-scroll-indicator',
        {
            opacity: 0,
            scaleY: 0,
            xPercent: -50,
            x: 0,
            transformOrigin: 'top center',
        },
        { opacity: 1, scaleY: 1, xPercent: -50, x: 0, duration: 1.0, ease: 'expo.out', clearProps: 'all' },
        '>',
    );
}

async function launchExperience() {
    await meshInitPromise;
    if (heroText) await heroText.ready;

    // Block experience until critical typography is fully loaded to prevent SplitType miscalculations
    try {
        await Promise.all([
            document.fonts.load('1em "Playfair Display"'),
            document.fonts.load('1em "Manrope"'),
        ]);
    } catch (e) {
        console.warn('Font Loading API failed/timeout, proceeding with fallback:', e);
    }

    const preloader = document.getElementById('preloader');
    if (preloader) {
        if (preloaderArc) {
            gsap.to(preloaderArc, {
                attr: { 'stroke-dashoffset': 0 },
                duration: 0.35,
                ease: 'power2.out',
            });
        }
        gsap.to(preloader, {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay: 0.2,
            onStart: () => {
                if (preloaderWrap) gsap.killTweensOf(preloaderWrap);
                requestAnimationFrame(() => flushDeferredRingScrollBind());
            },
            onComplete: () => {
                preloader.remove();
                runHeroIntro();
            },
        });
    } else {
        requestAnimationFrame(() => {
            flushDeferredRingScrollBind();
            runHeroIntro();
        });
    }
}

launchExperience();

const navBurger = document.getElementById('nav-burger');
const navLinksEl = document.querySelector('.nav-links');
const siteNavEl = document.getElementById('site-nav');

function closeMobileNav() {
    if (!navBurger || !navLinksEl) return;
    navBurger.classList.remove('active');
    navLinksEl.classList.remove('open');
    navBurger.setAttribute('aria-expanded', 'false');
    siteNavEl?.classList.remove('nav--menu-open');
}

if (navBurger && navLinksEl) {
    navBurger.addEventListener('click', () => {
        const open = !navLinksEl.classList.contains('open');
        navBurger.classList.toggle('active', open);
        navLinksEl.classList.toggle('open', open);
        navBurger.setAttribute('aria-expanded', open ? 'true' : 'false');
        siteNavEl?.classList.toggle('nav--menu-open', open);
    });
}

document.querySelectorAll('.nav-links a').forEach((a) => {
    a.addEventListener('click', (e) => {
        e.preventDefault();
        closeMobileNav();
        document.querySelector(e.target.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
    });
});

gsap.set('#hero-overlay', { pointerEvents: 'none' });

// Ensure overlay starts fully hidden (autoAlpha owns both opacity + visibility)
gsap.set('#gallery-overlay', { autoAlpha: 0 });

function getGuestFromUrl() {
    if (typeof window === 'undefined') return '';
    const raw = new URLSearchParams(window.location.search).get('guest') || '';
    const normalized = raw.replace(/\+/g, ' ').trim().slice(0, 48);
    return normalized.replace(/[<>"'`]/g, '').replace(/\s{2,}/g, ' ');
}

const guestNameFromUrl = getGuestFromUrl();
if (guestNameFromUrl) {
    const heroTagline = document.querySelector('.hero-tagline');
    if (heroTagline) {
        const note = document.createElement('p');
        note.className = 'hero-guest-note';
        note.textContent = `${guestNameFromUrl}, будем рады видеть вас`;
        heroTagline.insertAdjacentElement('afterend', note);
    }
}

const rsvpForm = document.getElementById('rsvp-form');
const btnRevealRsvp = document.getElementById('btn-reveal-rsvp');
const RSVP_MIN_FILL_MS = 2500;
const RSVP_WINDOW_MS = 10 * 60 * 1000;
const RSVP_MAX_PER_WINDOW = 2;
const RSVP_NAME_REPEAT_BLOCK_MS = 12 * 60 * 60 * 1000;
const RSVP_GLOBAL_COOLDOWN_MS = 45 * 1000;
const RSVP_RATE_KEY = 'rsvp_submit_events_v2';
let rsvpRevealAt = Date.now();

const normalizeNameKey = (name) =>
    String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .slice(0, 64);

if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = rsvpForm.querySelector('.submit-btn');
        const rsvpStatus = document.getElementById('rsvp-status');
        const nameEl = document.getElementById('rsvp-name');
        const honeyEl = document.getElementById('rsvp-company');
        const attendanceEl = rsvpForm.querySelector('input[name="attendance"]:checked');

        if (!submitBtn || !nameEl || !attendanceEl || !rsvpStatus) return;

        const nameInput = nameEl.value.trim();
        const attendance = attendanceEl.value;

        if (!nameInput) return;

        // Cheap anti-bot barrier for static hosting: hidden honeypot + fill-time + local rate limit.
        if (honeyEl && honeyEl.value.trim()) {
            return;
        }
        if (Date.now() - rsvpRevealAt < RSVP_MIN_FILL_MS) {
            rsvpStatus.textContent = 'Похоже, форма отправлена слишком быстро. Попробуйте через пару секунд.';
            rsvpStatus.style.color = '#9a7b4a';
            return;
        }
        try {
            const now = Date.now();
            const prev = JSON.parse(localStorage.getItem(RSVP_RATE_KEY) || '[]');
            const events = Array.isArray(prev)
                ? prev.filter((e) =>
                    e &&
                    Number.isFinite(e.ts) &&
                    typeof e.nameKey === 'string' &&
                    now - e.ts < RSVP_NAME_REPEAT_BLOCK_MS,
                )
                : [];
            const recentWindow = events.filter((e) => now - e.ts < RSVP_WINDOW_MS);
            if (recentWindow.length >= RSVP_MAX_PER_WINDOW) {
                rsvpStatus.textContent = 'Слишком много попыток. Повторите чуть позже.';
                rsvpStatus.style.color = '#9a7b4a';
                return;
            }
            const latestTs = recentWindow.reduce((mx, e) => Math.max(mx, e.ts), 0);
            if (latestTs > 0 && now - latestTs < RSVP_GLOBAL_COOLDOWN_MS) {
                rsvpStatus.textContent = 'Подождите немного перед следующей отправкой.';
                rsvpStatus.style.color = '#9a7b4a';
                return;
            }
            const nameKey = normalizeNameKey(nameInput);
            const sameNameRecent = events.some((e) => e.nameKey === nameKey && now - e.ts < RSVP_NAME_REPEAT_BLOCK_MS);
            if (sameNameRecent) {
                rsvpStatus.textContent = 'Похоже, этот гость уже отправлял ответ. Если нужно изменить статус — напишите нам.';
                rsvpStatus.style.color = '#9a7b4a';
                return;
            }
            events.push({ ts: now, nameKey });
            localStorage.setItem(RSVP_RATE_KEY, JSON.stringify(events.slice(-20)));
        } catch {
            // noop: storage may be unavailable in private mode
        }

        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;

        try {
            const relayUrl = (
                import.meta.env.VITE_RSVP_RELAY_URL ||
                import.meta.env.VITE_RSVP_API_URL ||
                ''
            ).trim();
            const relaySecret = (import.meta.env.VITE_RSVP_RELAY_SECRET || '').trim();
            const token = import.meta.env.VITE_TG_BOT_TOKEN;
            const chatId = import.meta.env.VITE_TG_CHAT_ID;

            let delivered = false;
            let lastError = null;
            const canUseLocalRsvpApi =
                typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1');

            // 1) Vite dev / preview: same-origin middleware (token stays on machine).
            if (canUseLocalRsvpApi) {
                try {
                    const rsvpRes = await fetch('/api/rsvp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: nameInput, attendance }),
                    });
                    const rsvpData = await rsvpRes.json().catch(() => ({ ok: false }));
                    delivered = !!(rsvpRes.ok && rsvpData.ok);
                    if (!delivered) {
                        lastError = new Error(rsvpData.description || 'RSVP API Error');
                    }
                } catch (err) {
                    lastError = err;
                }
            }

            // 2) Production relay: x-www-form-urlencoded = simple POST (no preflight).
            //    Google Apps Script often does not expose CORS headers on the response, so mode:cors fails
            //    when reading JSON even though Telegram delivery succeeds — use no-cors for script.google.com only.
            if (!delivered && relayUrl) {
                try {
                    const params = new URLSearchParams();
                    params.set('name', nameInput);
                    params.set('attendance', attendance);
                    if (relaySecret) {
                        params.set('secret', relaySecret);
                    }
                    const body = params.toString();
                    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                    const isGoogleAppsScript = /script\.google\.com\/macros\//i.test(relayUrl);

                    if (isGoogleAppsScript) {
                        await fetch(relayUrl, {
                            method: 'POST',
                            headers,
                            body,
                            mode: 'no-cors',
                            cache: 'no-store',
                            credentials: 'omit',
                        });
                        delivered = true;
                    } else {
                        const rsvpRes = await fetch(relayUrl, {
                            method: 'POST',
                            headers,
                            body,
                            mode: 'cors',
                            cache: 'no-store',
                            credentials: 'omit',
                        });
                        const rsvpData = await rsvpRes.json().catch(() => ({ ok: false }));
                        delivered = !!(rsvpRes.ok && rsvpData.ok);
                        if (!delivered) {
                            lastError = new Error(
                                rsvpData.description || rsvpData.error || 'RSVP relay error',
                            );
                        }
                    }
                } catch (err) {
                    lastError = err;
                }
            }

            // 3) Legacy: browser → Telegram only if no relay URL. If relay is configured but failed, do not
            //    use no-cors GET here — it often "completes" without a readable response and fakes success.
            if (!delivered && token && chatId && !relayUrl) {
                const escapeHtml = (value) =>
                    String(value)
                        .replaceAll('&', '&amp;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;');
                const safeName = escapeHtml(nameInput);
                const statusLabel =
                    attendance === 'Буду' ? '✅ С удовольствием буду' : '❌ К сожалению, не смогу';
                const safeStatus = escapeHtml(statusLabel);
                const sentAt = new Date().toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                });
                const safeSentAt = escapeHtml(sentAt);
                const source = escapeHtml(
                    typeof window !== 'undefined' ? window.location.hostname : 'unknown',
                );
                const message =
                    `<b>RSVP • Катя & Артём</b>\n` +
                    `━━━━━━━━━━━━━━\n` +
                    `🕊 <b>Новый ответ на приглашение</b>\n\n` +
                    `👤 <b>Гость</b>\n` +
                    `${safeName}\n\n` +
                    `📌 <b>Статус</b>\n` +
                    `${safeStatus}\n\n` +
                    `🕒 <b>Время:</b> ${safeSentAt}\n` +
                    `🌐 <b>Источник:</b> ${source}`;
                const directTelegramUrl =
                    `https://api.telegram.org/bot${token}/sendMessage` +
                    `?chat_id=${encodeURIComponent(chatId)}` +
                    `&text=${encodeURIComponent(message)}` +
                    `&parse_mode=HTML`;

                try {
                    await fetch(directTelegramUrl, {
                        method: 'GET',
                        mode: 'no-cors',
                        cache: 'no-store',
                    });
                    delivered = true;
                } catch (err) {
                    lastError = err;
                }
            }

            if (!delivered) {
                const cfgHint =
                    import.meta.env.DEV &&
                    ' Укажите VITE_RSVP_RELAY_URL или VITE_TG_BOT_TOKEN + VITE_TG_CHAT_ID в .env.';
                throw lastError || new Error(`Не удалось доставить RSVP.${cfgHint || ''}`);
            }

            submitBtn.classList.add('submit-btn--success');
            rsvpStatus.textContent = guestNameFromUrl
                ? `Спасибо, ${guestNameFromUrl}! Увидимся совсем скоро.`
                : 'Спасибо! Ваш ответ записан. Увидимся совсем скоро.';
            rsvpStatus.style.color = '#8b6f3d';
            rsvpForm.reset();
            submitBtn.style.display = 'none';
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('RSVP Fatal Error:', err);
            }
            rsvpStatus.textContent =
                'Не удалось отправить ответ. Попробуйте чуть позже или напишите нам в Telegram.';
            rsvpStatus.style.color = '#ff4b4b';
            submitBtn.textContent = 'Отправить';
            submitBtn.disabled = false;
        }
    });
}

/* ── Gallery scene background tween ─────────────────────────────────
   Tweens StudioDome material colour + renderer clear colour in sync.
   On open → near-black (#0d0a07) so photos "float" in dark space.
   On close → restore warm pearl (#EAE7DC).
   Works without importing THREE: StudioDome._material.color is a
   THREE.Color with normalised r/g/b we can tween directly.
────────────────────────────────────────────────────────────────────── */
const _bgProxy = { r: 0, g: 0, b: 0 };
let   _bgTween = null;

function tweenSceneBg(r, g, b, duration = 0.85) {
    const domeMat  = world?.studioDome?._material;
    const renderer = world?.renderer?.instance;
    if (!domeMat || !renderer) return;

    _bgTween?.kill();
    // Seed proxy from current dome colour so tween always starts where we are
    _bgProxy.r = domeMat.color.r;
    _bgProxy.g = domeMat.color.g;
    _bgProxy.b = domeMat.color.b;

    _bgTween = gsap.to(_bgProxy, {
        r, g, b,
        duration,
        ease: 'power2.out',
        onUpdate() {
            domeMat.color.setRGB(_bgProxy.r, _bgProxy.g, _bgProxy.b);
            renderer.setClearColor(domeMat.color, 1);
        },
    });
}

/* ── Gallery mode toggle ─────────────────────────────────────────────
   Main narrative DOM fades with opacity + pointer-events only (no autoAlpha
   / visibility) so layout & ScrollTrigger pin math stay intact; WebGL reads
   through. Lenis stops while gallery is open.
────────────────────────────────────────────────────────────────────── */
const GALLERY_DOM_HIDE =
    '#site-nav, #section-path, #section-glimpse, #section-destination, #section-final, .section-divider';
const galleryOverlay  = document.getElementById('gallery-overlay');
const btnOpenGallery  = document.getElementById('btn-open-gallery');
const btnCloseGallery = document.getElementById('btn-close-gallery');

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('gallery-active') && btnCloseGallery) {
        btnCloseGallery.click();
    }
});

if (btnOpenGallery) {
    btnOpenGallery.addEventListener('click', async () => {
        scroll.lenis.stop();
        document.body.classList.add('gallery-active');

        gsap.to('#gallery-overlay', {
            autoAlpha: 1,
            duration: 0.6,
            ease: 'power2.out',
            onStart: () => {
                galleryOverlay.style.pointerEvents = 'auto';
                galleryOverlay.setAttribute('aria-hidden', 'false');
                btnCloseGallery.removeAttribute('tabindex');
            },
        });

        gsap.to(GALLERY_DOM_HIDE, {
            opacity: 0,
            pointerEvents: 'none',
            duration: 0.6,
            ease: 'power2.out',
        });

        if (glassRing) glassRing.mesh.visible = false;

        // Dark gallery room — slightly lifted from pure black so cards feel less “filtered”
        tweenSceneBg(26 / 255, 22 / 255, 18 / 255, 0.85);

        try {
            const ribbon = await ensureGalleryRibbon();
            await ribbon.open();
        } catch (err) {
            console.error('GalleryRibbon open failed:', err);
            document.body.classList.remove('gallery-active');
            gsap.set('#gallery-overlay', { autoAlpha: 0 });
            gsap.set(GALLERY_DOM_HIDE, { opacity: 1, pointerEvents: 'auto' });
            if (glassRing) glassRing.mesh.visible = true;
            tweenSceneBg(234 / 255, 231 / 255, 220 / 255, 0.2);
            scroll.lenis.start();
        }
    });
}

if (btnCloseGallery) {
    btnCloseGallery.addEventListener('click', () => {
        document.body.classList.remove('gallery-active');

        gsap.to('#gallery-overlay', {
            autoAlpha: 0,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
                galleryOverlay.style.pointerEvents = 'none';
                galleryOverlay.setAttribute('aria-hidden', 'true');
                btnCloseGallery.setAttribute('tabindex', '-1');
            },
        });

        gsap.to(GALLERY_DOM_HIDE, {
            opacity: 1,
            pointerEvents: 'auto',
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => {
                // Wait one frame so restored layout is committed before recalculating pin metrics.
                requestAnimationFrame(() => {
                    ScrollTrigger.refresh();
                });
            },
        });

        // Restore warm pearl as cards fall away
        tweenSceneBg(234 / 255, 231 / 255, 220 / 255, 0.7);

        if (galleryRibbon) {
            galleryRibbon.close(() => {
                if (glassRing) glassRing.mesh.visible = true;
            });
        } else if (glassRing) {
            glassRing.mesh.visible = true;
        }

        scroll.lenis.start();
    });
}

if (btnRevealRsvp && rsvpForm) {
    btnRevealRsvp.addEventListener('click', () => {
        if (rsvpForm.style.display === 'flex') return;
        rsvpRevealAt = Date.now();
        btnRevealRsvp.style.display = 'none';
        rsvpForm.style.display = 'flex';
        const rsvpStatus = document.getElementById('rsvp-status');
        const nameEl = document.getElementById('rsvp-name');
        if (nameEl && guestNameFromUrl && !nameEl.value.trim()) {
            nameEl.value = guestNameFromUrl;
        }
        if (rsvpStatus && guestNameFromUrl) {
            rsvpStatus.textContent = `${guestNameFromUrl}, будем рады видеть вас.`;
            rsvpStatus.style.color = 'rgba(18, 12, 8, 0.52)';
        }
        gsap.fromTo(
            rsvpForm,
            { height: 0, autoAlpha: 0, overflow: 'hidden' },
            {
                height: 'auto',
                autoAlpha: 1,
                duration: 0.8,
                ease: 'power3.out',
                onComplete: () => {
                    ScrollTrigger.refresh();
                },
            },
        );
    });
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    sizes.coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2.0);

    world.resize(sizes.width, sizes.height, sizes.pixelRatio);
    scroll.resize();
    fitHeroNamesToViewport();
});

