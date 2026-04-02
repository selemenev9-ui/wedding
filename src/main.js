// --- PRELOADER ---
let prog = 0;
const bar = document.getElementById('preloader-bar');
const iv = setInterval(() => {
  prog += Math.random() * 1.2;
  if (prog >= 100) { prog = 100; clearInterval(iv); }
  if (bar) bar.style.width = prog + '%';
}, 40);
window.addEventListener('load', () => {
  setTimeout(() => {
    gsap.to('#preloader', { opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => {
      document.getElementById('preloader').style.display = 'none';
    }});
  }, 1500);
});
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from '@studio-freight/lenis'

const lenis = new Lenis({ duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
function raf(time) { lenis.raf(time); requestAnimationFrame(raf) }
requestAnimationFrame(raf)
// --- 3D КУРСОР: КОЛЬЦО ---
const cursorScript = document.createElement('script');
cursorScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
cursorScript.onload = () => {
  const T = window.THREE;
  const c = document.getElementById('cursor-3d');
  const DPR = window.devicePixelRatio || 1;
  c.width = 60 * DPR; c.height = 60 * DPR;
  const renderer = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  renderer.setSize(60, 60); renderer.setPixelRatio(DPR);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Env map для металлика
  const envW = 256, envH = 128;
  const envData = new Float32Array(4 * envW * envH);
  for (let i = 0; i < envW * envH; i++) {
    const ny = Math.floor(i / envW) / envH;
    const el = 1 - ny;
    const nx = (i % envW) / envW;
    const key = Math.pow(Math.max(0, Math.cos(nx * Math.PI * 2 - 0.8)) * el, 3) * 8;
    const rim = Math.pow(Math.max(0, Math.cos(nx * Math.PI * 2 - Math.PI * 1.3)) * (1 - el), 2) * 4;
    envData[i*4]   = el*0.3 + key + rim*0.83;
    envData[i*4+1] = el*0.25 + key*0.92 + rim*0.69;
    envData[i*4+2] = el*0.15 + key*0.72 + rim*0.13;
    envData[i*4+3] = 1;
  }
  const envTex = new T.DataTexture(envData, envW, envH, T.RGBAFormat, T.FloatType);
  envTex.mapping = T.EquirectangularReflectionMapping;
  envTex.needsUpdate = true;
  const pmrem = new T.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  pmrem.dispose(); envTex.dispose();

  // Золотой материал
  const goldMat = new T.MeshStandardMaterial({
    color: 0xD4AF37, metalness: 1.0, roughness: 0.08, envMapIntensity: 3.0
  });
  // Бриллиант
  const diamondMat = new T.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.0, roughness: 0.0,
    transparent: true, opacity: 0.85, envMapIntensity: 4.0
  });

  // Кольцо
  const ring = new T.Mesh(new T.TorusGeometry(1, 0.18, 32, 120), goldMat);
  ring.rotation.x = Math.PI / 5;
  scene.add(ring);

  // Оправа (маленькие цилиндры вокруг бриллианта)
  const settingGeo = new T.CylinderGeometry(0.06, 0.04, 0.4, 8);
  const settingPositions = [
    [0, 1.3, 0], [0.3, 1.2, 0], [-0.3, 1.2, 0],
    [0.3, 1.5, 0], [-0.3, 1.5, 0], [0, 1.6, 0]
  ];
  settingPositions.forEach(([x, y, z]) => {
    const m = new T.Mesh(settingGeo, goldMat);
    m.position.set(x, y, z);
    scene.add(m);
  });

  // Бриллиант (октаэдр)
  const diamond = new T.Mesh(new T.OctahedronGeometry(0.35, 0), diamondMat);
  diamond.position.set(0, 1.42, 0);
  diamond.rotation.y = Math.PI / 4;
  scene.add(diamond);

  // Свет
  scene.add(new T.AmbientLight(0xffffff, 0.2));
  const kl = new T.DirectionalLight(0xfff3d0, 5);
  kl.position.set(3, 6, 6); scene.add(kl);
  const fl = new T.DirectionalLight(0xD4AF37, 2.5);
  fl.position.set(-4, -1, 4); scene.add(fl);
  const rl = new T.DirectionalLight(0xffffff, 3);
  rl.position.set(0, -4, -3); scene.add(rl);

  // Анимация вращения
  let t = 0;
  function animRing() {
    requestAnimationFrame(animRing);
    t += 0.02;
    ring.rotation.y = t;
    diamond.rotation.y = t * 1.5;
    renderer.render(scene, camera);
  }
  animRing();

  // Следит за курсором
  let mx = 0, my = 0, cx2 = 0, cy2 = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    c.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => c.style.opacity = '0');
  (function moveCursor() {
    cx2 += (mx - cx2) * 0.12;
    cy2 += (my - cy2) * 0.12;
    c.style.left = cx2 + 'px';
    c.style.top = cy2 + 'px';
    requestAnimationFrame(moveCursor);
  })();

  // Увеличение при наведении
  document.querySelectorAll('a,button,img').forEach(el => {
    el.addEventListener('mouseenter', () => c.style.transform = 'translate(-50%,-50%) scale(1.6)');
    el.addEventListener('mouseleave', () => c.style.transform = 'translate(-50%,-50%) scale(1)');
  });
};
document.head.appendChild(cursorScript);
document.querySelectorAll('a,button,img').forEach(el => {
  el.addEventListener('mouseenter', () => cur.style.transform = 'translate(-50%,-50%) scale(2)');
  el.addEventListener('mouseleave', () => cur.style.transform = 'translate(-50%,-50%) scale(1)');
});

gsap.registerPlugin(ScrollTrigger);

gsap.set(".gsap-hero", { y: 40, opacity: 0 });

const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
tl.to(".gsap-hero", { duration: 1.5, y: 0, opacity: 1, stagger: 0.2 });

gsap.from(".gsap-timer", {
  scrollTrigger: {
    trigger: ".gsap-timer",
    start: "top 85%",
  },
  y: 50,
  opacity: 0,
  duration: 1.2,
  stagger: 0.2,
  ease: "power3.out"
});

// --- ЛОГИКА ТАЙМЕРА ---
const weddingDate = new Date(2026, 7, 8, 12, 0).getTime();
function updateTimer() {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  if (distance < 0) {
    document.getElementById("days").innerText = "00";
    document.getElementById("hours").innerText = "00";
    document.getElementById("minutes").innerText = "00";
    document.getElementById("seconds").innerText = "00";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById("days").innerText = days < 10 ? "0" + days : days;
  document.getElementById("hours").innerText = hours < 10 ? "0" + hours : hours;
  document.getElementById("minutes").innerText = minutes < 10 ? "0" + minutes : minutes;
  document.getElementById("seconds").innerText = seconds < 10 ? "0" + seconds : seconds;
}

updateTimer();
setInterval(updateTimer, 1000);

// --- АНИМАЦИЯ СЕКЦИИ ДЕТАЛЕЙ ---
gsap.from(".gsap-details", {
  scrollTrigger: { trigger: "#details", start: "top 80%" },
  y: 40, opacity: 0, duration: 1.2, stagger: 0.2, ease: "power3.out"
});

gsap.from(".gsap-details-card", {
  scrollTrigger: { trigger: "#details", start: "top 70%" },
  y: 60, opacity: 0, duration: 1, stagger: 0.25, ease: "power3.out"
});

// --- АНИМАЦИЯ ГАЛЕРЕИ ---
gsap.from(".gsap-gallery", {
  scrollTrigger: { trigger: "#gallery", start: "top 80%" },
  y: 40, opacity: 0, duration: 1.2, stagger: 0.2, ease: "power3.out"
});

gsap.from(".gsap-photo", {
  scrollTrigger: { trigger: "#masonry-grid", start: "top 85%" },
  y: 60, opacity: 0, duration: 0.8, stagger: 0.05, ease: "power3.out"
});

// --- РЕГИСТРАЦИЯ SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

// --- ЗОЛОТЫЕ ЧАСТИЦЫ ---
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = -Math.random() * 0.5 - 0.2;
    this.opacity = Math.random() * 0.8 + 0.4;
    this.life = 0;
    this.maxLife = Math.random() * 200 + 100;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;
    if (this.life > this.maxLife) this.reset();
  }
  draw() {
    const progress = this.life / this.maxLife;
    const alpha = this.opacity * Math.sin(progress * Math.PI);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
    ctx.fill();
  }
}

const particles = [];
for (let i = 0; i < 120; i++) {
  const p = new Particle();
  p.life = Math.random() * p.maxLife;
  particles.push(p);
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// --- 3D КОЛЬЦА ---
const ringsScript = document.createElement('script');
ringsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
ringsScript.onload = () => {
  const canvas = document.getElementById('rings-3d');
  if (!canvas) return;

  function initRings() {
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W === 0 || H === 0) { setTimeout(initRings, 100); return; }

    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;

    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const scene = new THREE.Scene();

    // --- ENV MAP: процедурная тёплая студийная среда ---
    // Без env map металл r128 выглядит пластиком — нет реальных отражений.
    // Генерируем equirectangular текстуру с тёплым ключевым светом и тёмным полом.
    const envW = 512, envH = 256;
    const envData = new Float32Array(4 * envW * envH);
    for (let i = 0; i < envW * envH; i++) {
      const nx = (i % envW) / envW;       // 0..1 горизонталь
      const ny = Math.floor(i / envW) / envH; // 0..1 вертикаль
      const elevation = 1.0 - ny;

      // Ключевой свет — тёплый, сверху-справа
      const keyAngle = nx * Math.PI * 2;
      const keyDot = Math.max(0, Math.cos(keyAngle - 0.8)) * elevation;
      const keyIntensity = Math.pow(keyDot, 3) * 8.0;

      // Золотой контровой — снизу-слева
      const rimDot = Math.max(0, Math.cos(keyAngle - Math.PI * 1.3)) * (1.0 - elevation);
      const rimIntensity = Math.pow(rimDot, 2) * 4.0;

      // Мягкое рассеяние сверху
      const ambient = elevation * 0.25;

      const r = ambient * 0.95 + keyIntensity * 1.0  + rimIntensity * 0.83;
      const g = ambient * 0.85 + keyIntensity * 0.92 + rimIntensity * 0.69;
      const b = ambient * 0.65 + keyIntensity * 0.72 + rimIntensity * 0.13;

      envData[i * 4]     = r;
      envData[i * 4 + 1] = g;
      envData[i * 4 + 2] = b;
      envData[i * 4 + 3] = 1.0;
    }

    const envTex = new THREE.DataTexture(envData, envW, envH, THREE.RGBAFormat, THREE.FloatType);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.needsUpdate = true;

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromEquirectangular(envTex).texture;
    scene.environment = envMap;
    pmrem.dispose();
    envTex.dispose();

    const aspect = W / H;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 0.5, 7);

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 1.0,
      roughness: 0.08,
      envMapIntensity: 3.0,
    });

    const size = Math.min(W, 600) / 300;
    const geo = new THREE.TorusGeometry(0.75 * size, 0.065 * size, 64, 200);
    const ring1 = new THREE.Mesh(geo, goldMat);
    const ring2 = new THREE.Mesh(geo, goldMat);
    ring1.position.x = -0.55 * size;
    ring2.position.x = 0.55 * size;
    ring1.rotation.x = Math.PI / 7;
    ring2.rotation.x = Math.PI / 7;
    ring1.position.y = 0.2 * size;
    ring2.position.y = 0.2 * size;
    scene.add(ring1);
    scene.add(ring2);

    // Ambient: минимальный — только чтобы не было абсолютной черноты
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    // Ключевой: яркий тёплый — главный блик
    const key = new THREE.DirectionalLight(0xfff3d0, 5);
    key.position.set(3, 6, 6);
    scene.add(key);

    // Золотой заполняющий: цветной подсвет снизу
    const fill = new THREE.DirectionalLight(0xD4AF37, 2.5);
    fill.position.set(-4, -1, 4);
    scene.add(fill);

    // Контровой: отделяет кольца от фона
    const rim = new THREE.DirectionalLight(0xffffff, 3.5);
    rim.position.set(0, -4, -3);
    scene.add(rim);

    // Верхний point: мягкое тёплое заполнение
    const top = new THREE.PointLight(0xfff5cc, 4, 25);
    top.position.set(0, 5, 4);
    scene.add(top);

    // Боковой point: усиливает металличность
    const side = new THREE.PointLight(0xffe8a0, 3, 20);
    side.position.set(-5, 2, 3);
    scene.add(side);

    window.addEventListener('resize', () => {
      const nW = canvas.offsetWidth;
      const nH = canvas.offsetHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });

    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.006;
      ring1.rotation.y = t;
      ring2.rotation.y = -t;
      ring1.rotation.z = Math.sin(t * 0.4) * 0.1;
      ring2.rotation.z = Math.sin(t * 0.4 + 1) * 0.1;
      renderer.render(scene, camera);
    }
    animate();
  }

  initRings();
};
document.head.appendChild(ringsScript);
// --- АНИМАЦИЯ ИСТОРИИ ---
gsap.from(".gsap-story", {
  scrollTrigger: { trigger: "#story", start: "top 80%" },
  y: 40, opacity: 0, duration: 1.2, stagger: 0.2, ease: "power3.out"
});
gsap.utils.toArray(".gsap-story-item").forEach((el, i) => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 85%" },
    x: i % 2 === 0 ? -60 : 60,
    opacity: 0, duration: 1, ease: "power3.out"
  });
});
// --- АНИМАЦИЯ ПРОГРАММЫ ---
gsap.from(".gsap-schedule", {
  scrollTrigger: { trigger: "#schedule", start: "top 80%" },
  y: 40, opacity: 0, duration: 1.2, stagger: 0.2, ease: "power3.out"
});
gsap.utils.toArray(".gsap-schedule-item").forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: "top 90%" },
    x: -40, opacity: 0, duration: 0.8, ease: "power3.out"
  });
});
// --- НАВИГАЦИЯ: фон при скролле ---
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    navbar.style.background = 'rgba(26,26,26,0.92)';
    navbar.style.backdropFilter = 'blur(12px)';
    navbar.style.padding = '12px 40px';
  } else {
    navbar.style.background = 'transparent';
    navbar.style.backdropFilter = 'none';
    navbar.style.padding = '20px 40px';
  }
});
// --- ПАРАЛЛАКС ГАЛЕРЕЯ ---
gsap.utils.toArray(".gsap-photo img").forEach(img => {
  gsap.to(img, {
    yPercent: -15,
    ease: "none",
    scrollTrigger: {
      trigger: img,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});
gsap.utils.toArray(".gsap-photo img").forEach(img => {
  gsap.to(img, {
    yPercent: -15,
    ease: "none",
    scrollTrigger: {
      trigger: img,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});
// --- LIGHTBOX ---
document.querySelectorAll('.gsap-photo img').forEach(img => {
  img.style.cursor = 'pointer';
  img.addEventListener('click', () => {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = img.src;
    lb.style.display = 'flex';
  });
});
// --- СЧЁТЧИК ЦИФР ---
function animateCounter(el, target, duration) {
  let start = 0;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    el.innerText = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.innerText = target;
  };
  requestAnimationFrame(step);
}

ScrollTrigger.create({
  trigger: "#details",
  start: "top 80%",
  once: true,
  onEnter: () => {
    animateCounter(document.getElementById("days"), 
      Math.floor((new Date(2026,7,8) - new Date()) / 86400000), 1500);
  }
});
const scrollBar = document.createElement('div');
scrollBar.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:#D4AF37;z-index:99998;width:0%;transition:width 0.1s;';
document.body.appendChild(scrollBar);
window.addEventListener('scroll', () => {
  const p = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  scrollBar.style.width = p + '%';
});
// --- ЭФФЕКТ ПЕЧАТНОЙ МАШИНКИ ---
const h1 = document.querySelector('h1.gsap-hero');
if (h1) {
  const text = h1.innerText;
  h1.innerHTML = '<span id="typed"></span>';
  let i = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      document.getElementById('typed').innerText += text[i];
      i++;
      if (i >= text.length) clearInterval(iv);
    }, 80);
  }, 1800);
}