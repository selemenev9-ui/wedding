import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import Sizes from './utils/Sizes.js';
import World, { getWorld } from './gl/World.js';
import GlassRing from './gl/world/GlassRing.js';
import HeroText from './gl/world/HeroText.js';
import Scroll, { bindGlassRingScrollEffects } from './modules/Scroll.js';
import MouseParallax from './modules/MouseParallax.js';
import GlimpseGallery from './gl/world/GlimpseGallery.js';
import GalleryRibbon from './gl/world/GalleryRibbon.js';
import Cursor from './modules/Cursor.js';

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

// `#hero-names` visibility: `setupHeroTextMedia` after HeroText init (`resources:ready`)
gsap.set('.hero-bottom, .hero-scroll-indicator', { opacity: 0 });

if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
    new Cursor();
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
world.camera.resize(sizes);

/** @type {import('./gl/world/GlassRing.js').default | null} */
let glassRing = null;

/** @type {import('./gl/world/HeroText.js').default | null} */
let heroText = null;

/** @type {InstanceType<typeof SplitType> | null} */
let heroSplitTagline = null;
/** @type {gsap.core.Timeline | null} */
let heroIntroTimeline = null;
let heroIntroCompleted = false;
let heroSplitResizeTimer = 0;
const HERO_SPLIT_DEBOUNCE_MS = 150;
const HERO_MOBILE_QUERY = '(max-width: 767px) and (pointer: coarse)';

function isHeroMobileViewport() {
    return typeof window !== 'undefined' && window.matchMedia(HERO_MOBILE_QUERY).matches;
}

function setHeroNamesState({ opacity = 1, y = 0, scale = 1, pointerEvents = 'auto' } = {}) {
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
 * WebGL hero vs DOM `#hero-names`: `matchMedia (max-width: 767px)`.
 * @param {import('./gl/world/HeroText.js').default | null} ht
 */
function setupHeroTextMedia(ht) {
    const heroNamesDOM = document.querySelector('#hero-names');
    if (!heroNamesDOM || typeof window === 'undefined') return;

    const mobileMediaQuery = window.matchMedia(HERO_MOBILE_QUERY);

    function handleHeroTextMedia(mq) {
        const matches = mq.matches;
        gsap.killTweensOf(heroNamesDOM);
        if (matches) {
            if (ht?.root) ht.root.visible = false;
            setHeroNamesState({ opacity: heroIntroCompleted ? 1 : 0, y: heroIntroCompleted ? 0 : 20 });
        } else {
            if (ht?.root) ht.root.visible = true;
            setHeroNamesState({ opacity: 0, y: 0, scale: 1, pointerEvents: 'none' });
            /* Desktop: hard-hidden via CSS `display: none` — no GSAP on #hero-names. */
        }
        ScrollTrigger.refresh();
    }

    handleHeroTextMedia(mobileMediaQuery);
    mobileMediaQuery.addEventListener('change', handleHeroTextMedia);
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
        if (isHeroMobileViewport()) {
            setHeroNamesState({ opacity: 1, y: 0, scale: 1, pointerEvents: 'auto' });
        } else {
            gsap.killTweensOf('#hero-names');
        }
        gsap.killTweensOf('.hero-scroll-indicator');
        gsap.set('.hero-scroll-indicator', {
            opacity: 1,
            scaleY: 1,
            transformOrigin: 'top center',
        });
    }

    rebuildHeroSplits(heroIntroCompleted ? 'visible' : 'hidden');
    ScrollTrigger.refresh();
}

window.addEventListener('resize', () => {
    window.clearTimeout(heroSplitResizeTimer);
    heroSplitResizeTimer = window.setTimeout(handleHeroSplitResize, HERO_SPLIT_DEBOUNCE_MS);
});

// GlimpseGallery / GalleryRibbon require only World.instance — no resources:ready dependency
const glimpseGallery = new GlimpseGallery();
const galleryRibbon  = new GalleryRibbon();

let mouseParallax = new MouseParallax([]);

const scroll = new Scroll();
scroll.lenis.stop();
scroll.resize();

const { lenis } = scroll;

// Scroll velocity — captured from Lenis event, smoothed on GSAP ticker (same frame as WebGL)
let _rawVelocity   = 0;
let smoothVelocity = 0;
let loggedDrawCalls = false;

lenis.on('scroll', (e) => {
    _rawVelocity = e.velocity;
    ScrollTrigger.update();
});

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);

    smoothVelocity += (_rawVelocity - smoothVelocity) * 0.12;
    glimpseGallery.update(smoothVelocity);
    galleryRibbon.update();
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

const WEDDING_COUNTDOWN_TARGET = new Date('2026-08-08T15:00:00Z');

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

tickWeddingCountdown();
setInterval(tickWeddingCountdown, 1000);

window.addEventListener('resources:ready', () => {
    const preloader = document.getElementById('preloader');

    glassRing = new GlassRing();
    glassRing.mesh.scale.setScalar(0);

    try {
        heroText = new HeroText();
        const w = getWorld();
        if (w) w.heroText = heroText;
    } catch (e) {
        console.error('HeroText init failed:', e);
    }

    setupHeroTextMedia(heroText);

    const runIntro = () => {
        bindGlassRingScrollEffects(glassRing);
        scroll.resize();
        scroll.lenis.scrollTo(0, { immediate: true });
        ScrollTrigger.refresh();

        mouseParallax.destroy();
        const parallaxLayers = [{ object: glassRing.mesh, depth: 0.06 }];
        if (heroText?.root) {
            parallaxLayers.push({ object: heroText.root, depth: 0.035 });
        }
        mouseParallax = new MouseParallax(parallaxLayers);

        scroll.lenis.start();

        heroIntroCompleted = false;
        rebuildHeroSplits('hidden');

        const isHeroMobile = isHeroMobileViewport();

        if (isHeroMobile) {
            gsap.killTweensOf('#hero-names');
        }

        if (heroSplitTagline?.words?.length) {
            gsap.set(heroSplitTagline.words, { y: '0%', opacity: 0 });
        }
        gsap.set('.hero-tagline', { opacity: 0, y: 20, xPercent: -50, x: 0 });
        if (isHeroMobile) {
            setHeroNamesState({ opacity: 0, y: 20, scale: 1, pointerEvents: 'auto' });
        }
        gsap.set('.hero-bottom', { opacity: 0, y: 20 });

        heroIntroTimeline = gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                heroIntroCompleted = true;
                heroIntroTimeline = null;
                ScrollTrigger.refresh();
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

        // Glass ring scales in
        heroIntroTimeline.to(
            glassRing.mesh.scale,
            { x: 1, y: 1, z: 1, duration: 2.0, ease: 'elastic.out(1, 0.5)' },
            0.05,
        );

        if (heroText?.group) {
            heroIntroTimeline.to(
                heroText.group.scale,
                { x: 1, y: 1, z: 1, duration: 1.15, ease: 'expo.out' },
                0.1,
            );
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
        if (isHeroMobile) {
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
        }
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

        // Scroll indicator
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
    };

    if (preloader) {
        // Fill the arc to 100% then fade out
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
            },
            onComplete: () => {
                preloader.remove();
                runIntro();
            },
        });
    } else {
        runIntro();
    }
});

const navBurger = document.getElementById('nav-burger');
const navLinksEl = document.querySelector('.nav-links');

function closeMobileNav() {
    if (!navBurger || !navLinksEl) return;
    navBurger.classList.remove('active');
    navLinksEl.classList.remove('open');
    navBurger.setAttribute('aria-expanded', 'false');
}

if (navBurger && navLinksEl) {
    navBurger.addEventListener('click', () => {
        const open = !navLinksEl.classList.contains('open');
        navBurger.classList.toggle('active', open);
        navLinksEl.classList.toggle('open', open);
        navBurger.setAttribute('aria-expanded', open ? 'true' : 'false');
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

const rsvpForm = document.getElementById('rsvp-form');
const btnRevealRsvp = document.getElementById('btn-reveal-rsvp');
if (btnRevealRsvp && rsvpForm) {
    btnRevealRsvp.addEventListener('click', () => {
        btnRevealRsvp.style.display = 'none';
        rsvpForm.style.display = 'flex';
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

if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = rsvpForm.querySelector('.submit-btn');
        const rsvpStatus = document.getElementById('rsvp-status');
        const nameEl = document.getElementById('rsvp-name');
        const attendanceEl = rsvpForm.querySelector('input[name="attendance"]:checked');

        if (!submitBtn || !nameEl || !attendanceEl || !rsvpStatus) return;

        const nameInput = nameEl.value.trim();
        const attendance = attendanceEl.value;

        if (!nameInput) return;

        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;

        const message = `🕊 *Новый ответ на приглашение* \n\n*Гость:* ${nameInput}\n*Статус:* ${attendance}`;

        try {
            const token = import.meta.env.VITE_TG_BOT_TOKEN;
            const chatId = import.meta.env.VITE_TG_CHAT_ID;

            console.log('Env Check:', { hasToken: !!token, hasChatId: !!chatId });
            if (!token || !chatId) {
                throw new Error('Missing VITE_TG_* env');
            }

            let delivered = false;
            let lastError = null;
            const canUseLocalRsvpApi =
                typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1');

            // Preferred route when backend exists (dev/preview/custom server).
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

            // GitHub Pages fallback: direct Telegram request via no-cors.
            if (!delivered) {
                const directTelegramUrl =
                    `https://api.telegram.org/bot${token}/sendMessage` +
                    `?chat_id=${encodeURIComponent(chatId)}` +
                    `&text=${encodeURIComponent(message)}` +
                    `&parse_mode=Markdown`;

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
                throw lastError || new Error('Telegram delivery failed');
            }

            rsvpStatus.textContent = 'Спасибо! Ваш ответ записан.';
            rsvpStatus.style.color = '#8b6f3d';
            rsvpForm.reset();
            submitBtn.style.display = 'none';
        } catch (err) {
            console.error('RSVP Fatal Error:', err);
            rsvpStatus.textContent = 'Ошибка отправки. Проверьте консоль.';
            rsvpStatus.style.color = '#ff4b4b';
            submitBtn.textContent = 'Отправить';
            submitBtn.disabled = false;
        }
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
    btnOpenGallery.addEventListener('click', () => {
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

        galleryRibbon.open();
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
        });

        galleryRibbon.close(() => {
            if (glassRing) glassRing.mesh.visible = true;
        });

        scroll.lenis.start();
        ScrollTrigger.refresh();
    });
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    const renderScale = isFinePointer ? 1.5 : 1.0;
    const dprCap = isFinePointer ? 2 : 2;
    sizes.pixelRatio = Math.min(window.devicePixelRatio * renderScale, dprCap);

    world.camera.resize(sizes);
    world.renderer.resize(sizes);
    scroll.resize();
    galleryRibbon.resize();
});

