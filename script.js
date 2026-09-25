const root = document.documentElement;
const refreshIcons = () => window.lucide && lucide.createIcons();

// ---------- Proyectos ----------
const categories = {
  dev: { label: "Desarrollo SIG", icon: "code-2" },
  ambiente: { label: "Medio ambiente", icon: "trees" },
  hidraulica: { label: "Obras hidráulicas", icon: "waves" },
  urbanismo: { label: "Urbanismo", icon: "building-2" },
};

const projects = [
  {
    category: "dev",
    title: "Plugin QGIS para análisis de cuencas",
    description: "Plugin en PyQGIS que automatiza la delimitación de cuencas y el cálculo de parámetros: reduce el tiempo de análisis un 70 % y estandariza la metodología en la empresa.",
    tags: ["Python", "PyQGIS", "Hidrología"],
  },
  {
    category: "dev",
    title: "Automatización cartográfica con ArcPy",
    description: "Serie de scripts en Python con ArcPy que generan cartografía temática e informes de forma automática, mejorando la productividad del equipo y la consistencia de los entregables.",
    tags: ["Python", "ArcPy", "Automatización"],
  },
  {
    category: "ambiente",
    title: "Monitoreo forestal en Guatemala",
    description: "Sistema de seguimiento de incentivos forestales con Collect Earth y SIG que aporta datos fiables para la certificación y la gestión sostenible de los recursos.",
    tags: ["Teledetección", "SIG", "Cooperación"],
  },
  {
    category: "ambiente",
    title: "Planes de prevención de incendios",
    description: "Responsable del componente SIG en la cartografía de prevención de incendios de 26 municipios de Tarragona, base técnica para la aprobación de los planes.",
    tags: ["Prevención", "SIG", "Planificación"],
  },
  {
    category: "hidraulica",
    title: "Restauración del DPH tras temporales (CHJ)",
    description: "Asistencia ambiental en obras de emergencia para restaurar daños en el Dominio Público Hidráulico, con SIG para planificar las actuaciones y garantizar su correcta ejecución.",
    tags: ["Restauración", "Obra civil", "Hidráulica"],
  },
  {
    category: "hidraulica",
    title: "Plan Maestro de Aguas Lluvias (El Salvador)",
    description: "Evaluación Ambiental Estratégica de un plan maestro de drenaje pluvial en San Salvador: identificación de vulnerabilidades y soluciones sostenibles con modelado SIG.",
    tags: ["EAE", "Hidrología", "Cooperación"],
  },
  {
    category: "urbanismo",
    title: "Modificación de PGOU «Pulmón Verde»",
    description: "Análisis técnico SIG para la modificación de un Plan General que crea un nuevo pulmón verde: cartografía de riesgos y estudio de impacto paisajístico.",
    tags: ["Urbanismo", "Paisaje", "Planificación"],
  },
  {
    category: "urbanismo",
    title: "EATE del plan general de Muro de Alcoy",
    description: "Dirección de la Evaluación Ambiental y Territorial Estratégica para la modificación del plan general, alineando el crecimiento urbano con la protección ambiental.",
    tags: ["EATE", "Legislación", "SIG"],
  },
];

const grid = document.getElementById("projectGrid");
grid.innerHTML = projects.map((p) => `
  <article class="card project reveal" data-category="${p.category}">
    <div class="project__top">
      <i data-lucide="${categories[p.category].icon}"></i>
      <span class="project__cat">${categories[p.category].label}</span>
    </div>
    <h3>${p.title}</h3>
    <p>${p.description}</p>
    <ul class="tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
  </article>`).join("");

document.querySelectorAll(".filter").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    });
    const f = btn.dataset.filter;
    grid.querySelectorAll(".project").forEach((card) => {
      card.classList.toggle("hidden", f !== "all" && card.dataset.category !== f);
    });
  });
});

refreshIcons();

// ---------- Tema claro/oscuro ----------
document.getElementById("themeToggle").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

// ---------- Menú móvil ----------
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
const setMenu = (open) => {
  navLinks.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", open);
  burger.innerHTML = `<i data-lucide="${open ? "x" : "menu"}"></i>`;
  refreshIcons();
};
burger.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// ---------- Texto que se escribe solo ----------
const words = ["Ingeniero de Montes.", "Especialista SIG.", "Director de equipos técnicos.", "Investigador en I+D+i.", "Desarrollador geoespacial."];
const typed = document.getElementById("typed");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) {
  typed.textContent = words[0];
} else {
  let w = 0, c = 0, deleting = false;
  (function type() {
    const word = words[w];
    c += deleting ? -1 : 1;
    typed.textContent = word.slice(0, c);
    let delay = deleting ? 45 : 110;
    if (!deleting && c === word.length) { deleting = true; delay = 1800; }
    else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 400; }
    setTimeout(type, delay);
  })();
}

// ---------- Contadores ----------
const animateCount = (el) => {
  const target = +el.dataset.count;
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / 1200, 1);
    el.textContent = prefix + Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// ---------- Aparición al hacer scroll ----------
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    entry.target.querySelectorAll("[data-count]").forEach(animateCount);
    observer.unobserve(entry.target);
  });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ---------- Navegación: sombra y sección activa ----------
const navbar = document.getElementById("navbar");
const links = [...navLinks.querySelectorAll("a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 20);
  const y = window.scrollY + 120;
  sections.forEach((sec, i) => {
    links[i].classList.toggle("active", sec.offsetTop <= y && sec.offsetTop + sec.offsetHeight > y);
  });
}, { passive: true });

// ---------- Visor SIG: coordenadas que siguen al ratón ----------
// Zona de referencia: Sierra de Aitana / embalse de Guadalest (Alicante)
const hud = { lat: document.getElementById("hudLat"), lon: document.getElementById("hudLon"), z: document.getElementById("hudZ") };
const heroEl = document.getElementById("inicio");
heroEl.addEventListener("pointermove", (e) => {
  const r = heroEl.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  hud.lat.textContent = (38.76 - fy * 0.07).toFixed(4) + "° N";
  hud.lon.textContent = (0.30 - fx * 0.11).toFixed(4) + "° W";
  hud.z.textContent = Math.round(1558 - fy * 900 + Math.sin(fx * 12) * 60).toLocaleString("es-ES") + " m";
}, { passive: true });

document.getElementById("year").textContent = new Date().getFullYear();
window.addEventListener("load", () => document.body.classList.add("loaded"));
