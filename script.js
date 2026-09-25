// Tema claro/oscuro (recuerda la preferencia del visitante)
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

function getSavedTheme() {
  try { return localStorage.getItem("theme"); } catch { return null; }
}
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
root.dataset.theme = getSavedTheme() || (prefersDark ? "dark" : "light");

toggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

// Animación al hacer scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Resalta la sección activa en el menú
const links = document.querySelectorAll(".nav__links a");
const sections = [...links].map((a) => document.querySelector(a.getAttribute("href")));
window.addEventListener("scroll", () => {
  const y = window.scrollY + 120;
  sections.forEach((sec, i) => {
    links[i].classList.toggle("active", sec.offsetTop <= y && sec.offsetTop + sec.offsetHeight > y);
  });
}, { passive: true });

document.getElementById("year").textContent = new Date().getFullYear();
