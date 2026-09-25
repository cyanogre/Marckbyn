// Bosque digital: nube de puntos tipo LiDAR que crece, se mece con el viento
// y es recorrida por un barrido láser. Dibujado en <canvas>, sin dependencias.
(() => {
  const canvas = document.getElementById("forest");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let trees = [], ridge = [], fireflies = [];
  let accent = [100, 255, 218], glow = [255, 224, 138], hi = [200, 255, 240], glowAlpha = 0.8;
  let start = performance.now();
  let running = false, visible = true;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  // Generador pseudoaleatorio con semilla: el bosque es siempre el mismo
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const readColors = () => {
    const css = getComputedStyle(document.documentElement);
    const hex = css.getPropertyValue("--accent").trim().replace("#", "");
    if (hex.length === 6) accent = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const light = document.documentElement.dataset.theme === "light";
    glow = light ? [214, 140, 20] : [255, 224, 138];
    glowAlpha = light ? 0.45 : 0.8;
    // Color de los puntos iluminados por el barrido: más claro en tema oscuro, más intenso en claro
    hi = light ? [6, 78, 59] : [220, 255, 245];
  };

  // ---------- Formas de árbol (coordenadas normalizadas: y=0 base, y=1 copa) ----------
  function pine(n) {
    const pts = [];
    const tiers = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < n * 0.08; i++) pts.push((rand() - 0.5) * 0.02, rand() * 0.25); // tronco
    for (let i = 0; i < n; i++) {
      const y = 0.12 + Math.pow(rand(), 0.8) * 0.88;
      const f = (y - 0.12) / 0.88;
      const tier = (f * tiers) % 1; // perfil en "dientes de sierra" de las ramas
      const r = 0.26 * (1 - f) * (0.55 + 0.45 * tier) + 0.01;
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 0.35 + 0.65; // más densidad en la superficie
      pts.push(Math.cos(a) * r * d, y - Math.abs(Math.sin(a)) * 0.02);
    }
    return pts;
  }

  function broadleaf(n) {
    const pts = [];
    for (let i = 0; i < n * 0.1; i++) pts.push((rand() - 0.5) * 0.03, rand() * 0.45);
    const blobs = 3 + Math.floor(rand() * 3);
    const centers = Array.from({ length: blobs }, () => [
      (rand() - 0.5) * 0.3, 0.55 + rand() * 0.25, 0.14 + rand() * 0.1,
    ]);
    for (let i = 0; i < n; i++) {
      const [cx, cy, r] = centers[i % blobs];
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 0.3 + 0.7;
      pts.push(cx + Math.cos(a) * r * d * 1.1, cy + Math.sin(a) * r * d * 0.85);
    }
    return pts;
  }

  // ---------- Construcción de la escena ----------
  function build() {
    seed = 42;
    trees = [];
    const density = Math.min(1, W / 1400) * (W < 700 ? 0.8 : 1);
    const layers = [
      { z: 0.15, count: 46, pts: 90 },
      { z: 0.4, count: 30, pts: 150 },
      { z: 0.65, count: 17, pts: 240 },
      { z: 0.92, count: 8, pts: 380 },
    ];
    for (const L of layers) {
      const count = Math.max(4, Math.round(L.count * density));
      for (let i = 0; i < count; i++) {
        const isPine = rand() < 0.72;
        const z = L.z + (rand() - 0.5) * 0.08;
        trees.push({
          z,
          x: (i + rand() * 0.9) / count,
          h: lerp(0.8, 1.15, rand()),
          pts: Float32Array.from(isPine ? pine(L.pts) : broadleaf(L.pts * 0.9)),
          phase: rand() * Math.PI * 2,
          delay: rand() * 0.9 + (1 - z) * 0.4,
        });
      }
    }
    trees.sort((a, b) => a.z - b.z);

    // Cordillera lejana hecha de puntos
    ridge = [];
    for (let i = 0; i <= 260; i++) {
      const t = i / 260;
      const y = 0.5 * Math.sin(t * 7 + 1) + 0.3 * Math.sin(t * 17 + 2) + 0.15 * Math.sin(t * 41);
      ridge.push(t, y);
    }

    fireflies = Array.from({ length: W < 700 ? 10 : 22 }, () => ({
      x: rand(), y: 0.45 + rand() * 0.55, r: 0.8 + rand() * 1.3,
      vx: (rand() - 0.5) * 0.012, vy: -0.004 - rand() * 0.01,
      phase: rand() * Math.PI * 2,
    }));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const newW = rect.width, newH = rect.height;
    const rebuild = Math.abs(newW - W) > 80 || !trees.length;
    W = newW; H = newH;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (rebuild) build();
    if (!running) draw(performance.now());
  }

  // ---------- Dibujo ----------
  function draw(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, W, H);
    const [ar, ag, ab] = accent;

    mouse.x = lerp(mouse.x, mouse.tx, 0.04);
    mouse.y = lerp(mouse.y, mouse.ty, 0.04);

    // Barrido LiDAR: una banda vertical que cruza la escena cada ~9 s
    const scanPeriod = 9;
    const scanX = reduceMotion ? -1 : (((t % scanPeriod) / scanPeriod) * 1.4 - 0.2) * W;
    const scanW = Math.max(60, W * 0.06);

    if (scanX > -scanW && scanX < W + scanW) {
      const g = ctx.createLinearGradient(scanX - scanW, 0, scanX + scanW, 0);
      g.addColorStop(0, `rgba(${ar},${ag},${ab},0)`);
      g.addColorStop(0.5, `rgba(${ar},${ag},${ab},0.07)`);
      g.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(scanX - scanW, H * 0.3, scanW * 2, H * 0.7);
      ctx.fillStyle = `rgba(${ar},${ag},${ab},0.35)`;
      ctx.fillRect(scanX, H * 0.3, 1, H * 0.7);
    }

    // Cordillera
    const ridgeBase = H * 0.62, ridgeAmp = H * 0.07;
    const rOff = mouse.x * 6;
    for (let i = 0; i < ridge.length; i += 2) {
      const x = ridge[i] * W + rOff;
      const y = ridgeBase - ridge[i + 1] * ridgeAmp;
      ctx.fillStyle = `rgba(${ar},${ag},${ab},0.22)`;
      ctx.fillRect(x, y, 1.2, 1.2);
      for (let k = 1; k < 4; k++) { // relleno difuminado bajo la cresta
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${0.07 / k})`;
        ctx.fillRect(x, y + k * 9 + ((i * 7) % 5), 1, 1);
      }
    }

    // Árboles
    const baseH = Math.min(H * 0.44, W * 0.55, 380);
    for (const tree of trees) {
      const z = tree.z;
      const groundY = H * (0.66 + 0.34 * z);
      const size = baseH * tree.h * (0.28 + 0.85 * z);
      const px = mouse.x * 40 * z, py = mouse.y * 10 * z;
      const cx = tree.x * (W + 120) - 60 + px;
      const grow = reduceMotion ? 1 : easeOut(Math.min(1, Math.max(0, (t - tree.delay) / 2.2)));
      if (grow <= 0) continue;

      const alpha = 0.16 + 0.62 * z;
      const dot = 0.7 + 1.3 * z;
      const wind = reduceMotion ? 0 : Math.sin(t * 0.9 + tree.phase + tree.x * 3) * 0.035
        + Math.sin(t * 2.1 + tree.phase * 2) * 0.008;
      const near = Math.abs(cx - scanX) < scanW;

      ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`;
      const p = tree.pts;
      for (let i = 0; i < p.length; i += 2) {
        const hy = p[i + 1];
        if (hy > grow) continue;
        const sway = wind * hy * hy * size;
        const x = cx + p[i] * size + sway;
        const y = groundY + py - hy * size;
        if (near && Math.abs(x - scanX) < scanW * 0.6) {
          ctx.fillStyle = `rgba(${hi[0]},${hi[1]},${hi[2]},${Math.min(1, alpha + 0.4)})`;
          ctx.fillRect(x, y, dot + 0.6, dot + 0.6);
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`;
        } else {
          ctx.fillRect(x, y, dot, dot);
        }
      }
    }

    // Suelo: líneas de puntos por capa
    for (let l = 0; l < 4; l++) {
      const z = 0.15 + l * 0.26;
      const y0 = H * (0.66 + 0.34 * z) + mouse.y * 10 * z;
      ctx.fillStyle = `rgba(${ar},${ag},${ab},${0.08 + 0.2 * z})`;
      for (let x = (l * 13) % 9; x < W; x += 9 - l * 1.5) {
        ctx.fillRect(x, y0 + Math.sin(x * 0.05 + l) * 2, 1, 1);
      }
    }

    // Luciérnagas
    const [gr, gg, gb] = glow;
    for (const f of fireflies) {
      if (!reduceMotion) {
        f.x += f.vx * 0.016 + Math.sin(t * 0.7 + f.phase) * 0.0003;
        f.y += f.vy * 0.016;
        if (f.y < 0.35) { f.y = 1.02; f.x = rand(); }
        if (f.x < -0.02) f.x = 1.02; else if (f.x > 1.02) f.x = -0.02;
      }
      const flick = 0.35 + 0.65 * Math.pow(Math.sin(t * 1.6 + f.phase) * 0.5 + 0.5, 2);
      const x = f.x * W + mouse.x * 25, y = f.y * H;
      const g = ctx.createRadialGradient(x, y, 0, x, y, f.r * 6);
      g.addColorStop(0, `rgba(${gr},${gg},${gb},${glowAlpha * flick})`);
      g.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - f.r * 6, y - f.r * 6, f.r * 12, f.r * 12);
    }
  }

  function loop(now) {
    if (!running) return;
    draw(now);
    requestAnimationFrame(loop);
  }
  const play = () => {
    if (reduceMotion || running || !visible || document.hidden) return;
    running = true;
    requestAnimationFrame(loop);
  };
  const pause = () => { running = false; };

  // ---------- Eventos ----------
  window.addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }).observe(canvas);
  new MutationObserver(() => { readColors(); if (!running) draw(performance.now()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  readColors();
  resize();
  if (reduceMotion) draw(performance.now() + 1e6);
  play();
})();
