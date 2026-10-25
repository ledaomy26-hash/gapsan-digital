(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // буквы заголовка: каждая выезжает снизу по очереди
  document.querySelectorAll("[data-split]").forEach(function (w, l) {
    var text = w.textContent;
    w.textContent = "";
    w.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(text, function (c, i) {
      var s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      s.style.setProperty("--i", i);
      s.style.setProperty("--l", l);
      w.appendChild(s);
    });
  });

  var start = function () { root.classList.add("loaded"); };
  if (document.readyState === "complete") requestAnimationFrame(start);
  else window.addEventListener("load", function () { requestAnimationFrame(start); });
  setTimeout(start, 2500); // если какая-то картинка грузится долго

  // появление блоков при прокрутке
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal, .steps li").forEach(function (el, i) {
    if (!el.closest(".hero")) io.observe(el);
  });

  // шапка темнеет после первого экрана
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  new IntersectionObserver(function (es) {
    nav.classList.toggle("scrolled", !es[0].isIntersecting);
  }, { rootMargin: "-80px 0px 0px 0px" }).observe(document.querySelector(".hero-title") || hero);

  // меню на телефоне
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open);
    menu.classList.toggle("open", open);
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { burger.setAttribute("aria-expanded", "false"); menu.classList.remove("open"); }
  });

  if (reduce) return;

  // лев слегка следует за мышью: глубина
  var lion = document.getElementById("lion");
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (lion && fine) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      lion.style.setProperty("--mx", (x * -22).toFixed(1) + "px");
      lion.style.setProperty("--my", (y * -16).toFixed(1) + "px");
    });
    hero.addEventListener("pointerleave", function () {
      lion.style.setProperty("--mx", "0px");
      lion.style.setProperty("--my", "0px");
    });
  }

  // общий золотой блик: логотип → надпись → лев, обратно, пауза 2 с.
  // Полоса идёт по экрану под углом 120°, её место — проекция точки x·0,866 + y·0,5
  var shines = Array.prototype.slice.call(document.querySelectorAll(".shine-el"));
  var brandEl = document.querySelector(".brand"), lionEl = document.querySelector(".lion-shine");
  var proj = function (x, y) { return x * 0.866 + y * 0.5; };
  var GO = 2600, PAUSE = 2000, BAND = 120, t0 = performance.now() + 3200;
  var ease = function (k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
  var heroOn = true, idle = false;
  new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; }).observe(hero);
  (function frame(now) {
    requestAnimationFrame(frame);
    var t = (now - t0) % (2 * GO + PAUSE), s = -9999;
    var run = heroOn && now >= t0 && t < 2 * GO;
    if (!run) { if (!idle) { shines.forEach(function (el) { el.style.setProperty("--s", "-9999px"); }); idle = true; } return; }
    idle = false;
    if (run) {
      var b = brandEl.getBoundingClientRect(), l = lionEl.getBoundingClientRect();
      var from = proj(b.left, b.top) - BAND, to = proj(l.right, l.bottom) + BAND;
      var k = t < GO ? ease(t / GO) : 1 - ease((t - GO) / GO);
      s = from + (to - from) * k;
    }
    shines.forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--bx", (-r.left).toFixed(1) + "px");
      el.style.setProperty("--by", (-r.top).toFixed(1) + "px");
      el.style.setProperty("--s", s.toFixed(1) + "px");
    });
  })(performance.now());

  // золотые кнопки тянутся к курсору
  if (fine) document.querySelectorAll(".magnet").forEach(function (b) {
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });

  // работы: стрелки и перетаскивание мышью
  var track = document.getElementById("track");
  document.querySelectorAll(".arrow").forEach(function (a) {
    a.addEventListener("click", function () {
      var card = track.querySelector(".work");
      track.scrollBy({ left: (card.offsetWidth + 28) * +a.dataset.dir, behavior: "smooth" });
    });
  });
  var down = false, sx = 0, sl = 0, moved = false;
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
  });
  window.addEventListener("pointermove", function (e) {
    if (!down) return;
    var dx = e.clientX - sx;
    if (Math.abs(dx) > 5) { moved = true; track.classList.add("drag"); }
    track.scrollLeft = sl - dx;
  });
  window.addEventListener("pointerup", function () { down = false; track.classList.remove("drag"); });
  track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
})();
