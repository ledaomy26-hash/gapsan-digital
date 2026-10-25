(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var $ = function (s) { return document.querySelector(s); };

  var start = function () { root.classList.add("loaded"); };
  if (document.readyState === "complete") requestAnimationFrame(start);
  else window.addEventListener("load", function () { requestAnimationFrame(start); });
  setTimeout(start, 2500); // если какая-то картинка грузится долго

  // ===== Сначала то, что должно работать всегда — и при «уменьшить движение» =====

  // появление блоков при прокрутке (при «уменьшить движение» CSS показывает их сразу)
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal, .steps li, .case-step").forEach(function (el) {
    if (!el.closest(".hero")) io.observe(el);
  });

  // шапка темнеет после первого экрана
  var nav = $(".nav");
  var hero = $(".hero");
  if (nav && hero) new IntersectionObserver(function (es) {
    nav.classList.toggle("scrolled", !es[0].isIntersecting);
  }, { rootMargin: "-80px 0px 0px 0px" }).observe($(".hero-title") || hero);
  if (nav && !hero) nav.classList.add("scrolled");

  // тонкая золотая линия: сколько страницы пройдено
  var bar = $(".progress i");
  if (bar) {
    var queued = false;
    var paint = function () {
      queued = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ")";
    };
    var ask = function () { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    paint();
  }

  // меню на телефоне: открыть, закрыть по пункту и по Escape
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    var setMenu = function (open) {
      burger.setAttribute("aria-expanded", open);
      menu.classList.toggle("open", open);
    };
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.tagName === "A") setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { setMenu(false); burger.focus(); }
    });
  }

  // работы: стрелки и перетаскивание мышью
  var track = document.getElementById("track");
  if (track) {
    document.querySelectorAll(".arrow").forEach(function (a) {
      a.addEventListener("click", function () {
        var card = track.querySelector(".work");
        if (card) track.scrollBy({ left: (card.offsetWidth + 28) * +a.dataset.dir, behavior: reduce ? "auto" : "smooth" });
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
  }

  // «Что вам нужно?»: три вкладки — своё предложение и готовый текст заявки для Telegram
  var pick = $(".pick");
  if (pick) {
    var tabs = pick.querySelectorAll("[role=tab]");
    var show = function (tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      pick.dataset.on = tab.dataset.key;
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(t); });
      t.addEventListener("keydown", function (e) {
        var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        var n = tabs[(i + k + tabs.length) % tabs.length];
        n.focus(); show(n);
      });
    });
    // кнопка копирует текст заявки и открывает Telegram (вставить и отправить)
    pick.querySelectorAll("[data-brief]").forEach(function (a) {
      a.addEventListener("click", function () {
        var note = a.parentNode.querySelector(".pick-note");
        var done = function () { if (note) note.textContent = "Текст заявки скопирован — вставьте его в чат."; };
        if (navigator.clipboard) navigator.clipboard.writeText(a.dataset.brief).then(done, function () {});
      });
    });
  }

  if (reduce) return;

  // ===== Дальше только движение: при «уменьшить движение» не запускается =====

  // лев слегка следует за мышью: глубина
  var lion = document.getElementById("lion");
  if (lion && hero && fine) {
    var still = function () { lion.style.setProperty("--mx", "0px"); lion.style.setProperty("--my", "0px"); };
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      lion.style.setProperty("--mx", (x * -22).toFixed(1) + "px");
      lion.style.setProperty("--my", (y * -16).toFixed(1) + "px");
    });
    hero.addEventListener("pointerleave", still);
    window.addEventListener("resize", still);
  }

  // общий золотой блик: логотип → надпись → лев, обратно, пауза 2 с.
  // Полоса идёт по экрану под углом 120°, её место — проекция точки x·0,866 + y·0,5.
  // Кадры запрашиваются, только пока первый экран виден и вкладка открыта.
  var shines = Array.prototype.slice.call(document.querySelectorAll(".shine-el"));
  var brandEl = $(".brand"), lionEl = $(".lion-shine");
  if (hero && brandEl && lionEl && shines.length) {
    var proj = function (x, y) { return x * 0.866 + y * 0.5; };
    var GO = 2600, PAUSE = 2000, BAND = 120, t0 = performance.now() + 3200;
    var ease = function (k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
    var heroOn = true, rafId = 0;
    var hide = function () { shines.forEach(function (el) { el.style.setProperty("--s", "-9999px"); }); };
    var frame = function (now) {
      rafId = requestAnimationFrame(frame);
      var t = (now - t0) % (2 * GO + PAUSE);
      if (now < t0 || t >= 2 * GO) { hide(); return; }
      var b = brandEl.getBoundingClientRect(), l = lionEl.getBoundingClientRect();
      var from = proj(b.left, b.top) - BAND, to = proj(l.right, l.bottom) + BAND;
      var k = t < GO ? ease(t / GO) : 1 - ease((t - GO) / GO);
      var s = from + (to - from) * k;
      shines.forEach(function (el) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--bx", (-r.left).toFixed(1) + "px");
        el.style.setProperty("--by", (-r.top).toFixed(1) + "px");
        el.style.setProperty("--s", s.toFixed(1) + "px");
      });
    };
    var sync = function () {
      var want = heroOn && !document.hidden;
      if (want && !rafId) rafId = requestAnimationFrame(frame);
      if (!want && rafId) { cancelAnimationFrame(rafId); rafId = 0; hide(); }
    };
    new IntersectionObserver(function (es) { heroOn = es[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener("visibilitychange", sync);
    sync();
  }

  // золотые кнопки тянутся к курсору
  if (fine) document.querySelectorAll(".magnet").forEach(function (b) {
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });
})();
