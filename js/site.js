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
  var pending = [];
  document.querySelectorAll(".reveal, .steps li").forEach(function (el) {
    if (!el.closest(".hero")) { io.observe(el); pending.push(el); }
  });
  // подстраховка: если блок проскочили рывком (якорь, быстрая прокрутка) и он уже выше экрана — показать сразу
  var passQ = false;
  window.addEventListener("scroll", function () {
    if (passQ || !pending.length) return;
    passQ = true;
    requestAnimationFrame(function () {
      passQ = false;
      pending = pending.filter(function (el) {
        if (el.classList.contains("in")) return false;
        if (el.getBoundingClientRect().bottom < 0) { el.classList.add("in"); io.unobserve(el); return false; }
        return true;
      });
    });
  }, { passive: true });

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

  // видео урока: на компьютере играет само, пока видно; на телефоне и при «экономии трафика» — по нажатию
  var saveData = navigator.connection && navigator.connection.saveData;
  var small = window.matchMedia("(max-width: 900px)").matches;
  document.querySelectorAll("video[data-auto]").forEach(function (v) {
    if (reduce || small || saveData) {
      var b = document.createElement("button");
      b.className = "play"; b.type = "button"; b.setAttribute("aria-label", "Смотреть фрагмент урока");
      b.addEventListener("click", function () { b.remove(); v.controls = true; v.play(); });
      v.parentNode.appendChild(b);
      return;
    }
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) v.play().catch(function () {}); else v.pause();
    }, { threshold: 0.4 }).observe(v);
  });

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
    var GO = 2600, PAUSE = 2000, BAND = 120, t0 = performance.now() + 4300; // после «пробуждения» льва (CSS .lion-wake, до ≈4 с)
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

  // портфолио: карточка слегка наклоняется вслед за курсором — глубина
  if (fine) document.querySelectorAll(".work").forEach(function (w) {
    var pic = w.querySelector(".work-pic");
    w.addEventListener("pointermove", function (e) {
      var r = pic.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      w.classList.add("tilt");
      pic.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
      pic.style.setProperty("--rx", (y * -5).toFixed(2) + "deg");
    });
    w.addEventListener("pointerleave", function () {
      w.classList.remove("tilt");
      pic.style.setProperty("--ry", "0deg"); pic.style.setProperty("--rx", "0deg");
    });
  });

  // телефон (нет наведения): превью сайта само листается, экран игры сам сменяется, когда карточка на экране
  if (!window.matchMedia("(hover: hover)").matches) {
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var el = e.target;
        if (el.classList.contains("game")) {
          if (e.intersectionRatio >= 0.6 && !el._t && el.querySelector(".alt")) {
            el._t = setInterval(function () { el.classList.toggle("auto"); }, 2800);
          } else if (e.intersectionRatio < 0.2 && el._t) { clearInterval(el._t); el._t = 0; el.classList.remove("auto"); }
        } else {
          if (e.intersectionRatio >= 0.6) el.classList.add("auto");
          else if (e.intersectionRatio < 0.1) el.classList.remove("auto");
        }
      });
    }, { threshold: [0, 0.1, 0.2, 0.6] });
    document.querySelectorAll(".work, .game").forEach(function (el) { seen.observe(el); });
  }

  // золото по прокрутке: «Обсудим» в финале наливается, нить в «Как работаем» прорисовывается (--p от 0 до 1)
  var fills = [];
  var finalH = document.querySelector(".final h2"), steps = document.querySelector(".steps");
  if (finalH) fills.push({ el: finalH, p: function (r) { return (innerHeight * 0.85 - r.top) / (innerHeight * 0.45); } });
  if (steps) fills.push({ el: steps, lis: steps.querySelectorAll("li"), p: function (r) {
    return innerWidth > 900 ? (innerHeight * 0.9 - r.top) / (innerHeight * 0.55) : (innerHeight * 0.75 - r.top) / r.height;
  } });
  if (fills.length) {
    var onScreen = new Set(), fq = false;
    var fillPaint = function () {
      fq = false;
      onScreen.forEach(function (f) {
        var k = Math.max(0, Math.min(1, f.p(f.el.getBoundingClientRect())));
        f.el.style.setProperty("--p", k.toFixed(3));
        if (f.lis) Array.prototype.forEach.call(f.lis, function (li, i) { li.classList.toggle("lit", k >= i / f.lis.length + 0.02); });
      });
    };
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var f = fills.filter(function (x) { return x.el === e.target; })[0];
        if (e.isIntersecting) onScreen.add(f); else onScreen.delete(f);
      });
      fillPaint();
    });
    fills.forEach(function (f) { fio.observe(f.el); });
    window.addEventListener("scroll", function () { if (onScreen.size && !fq) { fq = true; requestAnimationFrame(fillPaint); } }, { passive: true });
  }

  // бегущая строка: быстрее при быстрой прокрутке, при прокрутке вверх — в обратную сторону; кадры — только пока видна
  var tickTrack = document.querySelector(".ticker-track");
  var tickAnim = tickTrack && tickTrack.getAnimations ? tickTrack.getAnimations()[0] : null;
  if (tickAnim) {
    var rate = 1, target = 1, lastY = scrollY, lastT = performance.now(), tickOn = false, tickRaf = 0;
    var tickFrame = function (now) {
      tickRaf = 0;
      var dt = Math.max(16, now - lastT), v = (scrollY - lastY) / dt;
      lastY = scrollY; lastT = now;
      target = Math.max(-4, Math.min(6, 1 + v * 6));
      rate += (target - rate) * 0.12;
      if (Math.abs(rate - 1) < 0.02 && Math.abs(v) < 0.01) rate = 1;
      tickAnim.playbackRate = rate;
      if (tickOn && rate !== 1) tickRaf = requestAnimationFrame(tickFrame);
    };
    var tickKick = function () { if (tickOn && !tickRaf) { lastT = performance.now(); tickRaf = requestAnimationFrame(tickFrame); } };
    new IntersectionObserver(function (es) { tickOn = es[0].isIntersecting; if (!tickOn) { tickAnim.playbackRate = rate = 1; } }).observe(tickTrack);
    window.addEventListener("scroll", tickKick, { passive: true });
  }

  // первый экран: золотой «прожектор» за курсором (только мышь)
  if (hero && fine) {
    var spotQ = false, sx = 0, sy = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(); sx = e.clientX - r.left; sy = e.clientY - r.top;
      hero.classList.add("lit");
      if (!spotQ) { spotQ = true; requestAnimationFrame(function () { spotQ = false; hero.style.setProperty("--sx", sx + "px"); hero.style.setProperty("--sy", sy + "px"); }); }
    });
    hero.addEventListener("pointerleave", function () { hero.classList.remove("lit"); });
  }

  // золотые искры поднимаются от буквы G: компьютер, только пока первый экран на виду и вкладка открыта
  var cvs = document.querySelector(".sparks");
  if (cvs && hero && fine && innerWidth > 900) {
    var cx = cvs.getContext("2d"), dots = [], spRaf = 0, spOn = false, last = 0, born = performance.now() + 4200;
    var size = function () { var d = Math.min(devicePixelRatio || 1, 2); cvs.width = cvs.clientWidth * d; cvs.height = cvs.clientHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size(); window.addEventListener("resize", size);
    var spark = function () {
      var w = cvs.clientWidth, h = cvs.clientHeight;
      return { x: w * (0.32 + Math.random() * 0.4), y: h * (0.62 + Math.random() * 0.26), vx: (Math.random() - 0.5) * 10,
        vy: -(26 + Math.random() * 42), r: 0.8 + Math.random() * 1.7, life: 0, max: 2.2 + Math.random() * 2.4 };
    };
    var draw = function (now) {
      spRaf = requestAnimationFrame(draw);
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (now < born) return;
      if (dots.length < 26 && Math.random() < 0.25) dots.push(spark());
      cx.clearRect(0, 0, cvs.clientWidth, cvs.clientHeight);
      cx.globalCompositeOperation = "lighter";
      dots = dots.filter(function (d) {
        d.life += dt; d.x += d.vx * dt + Math.sin(d.life * 3 + d.r) * 0.25; d.y += d.vy * dt;
        var k = d.life / d.max; if (k >= 1) return false;
        var a = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8) * 0.85;
        var g = cx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        g.addColorStop(0, "rgba(255,236,180," + a + ")"); g.addColorStop(0.35, "rgba(235,207,140," + a * 0.55 + ")"); g.addColorStop(1, "rgba(201,164,92,0)");
        cx.fillStyle = g; cx.beginPath(); cx.arc(d.x, d.y, d.r * 4, 0, 6.283); cx.fill();
        return true;
      });
    };
    var spSync = function () {
      var want = spOn && !document.hidden;
      if (want && !spRaf) { last = 0; spRaf = requestAnimationFrame(draw); }
      if (!want && spRaf) { cancelAnimationFrame(spRaf); spRaf = 0; }
    };
    new IntersectionObserver(function (es) { spOn = es[0].isIntersecting; spSync(); }).observe(hero);
    document.addEventListener("visibilitychange", spSync);
  }

  // финал: большой лев проступает, когда раздел на экране, и чуть смещается за курсором
  var fin = document.querySelector(".final"), finLion = document.querySelector(".final-lion");
  if (fin && finLion) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) fin.classList.add("on"); }, { threshold: 0.25 }).observe(fin);
    if (fine) {
      fin.addEventListener("pointermove", function (e) {
        var r = fin.getBoundingClientRect();
        finLion.style.setProperty("--fx", (((e.clientX - r.left) / r.width - 0.5) * -28).toFixed(1) + "px");
        finLion.style.setProperty("--fy", (((e.clientY - r.top) / r.height - 0.5) * -18).toFixed(1) + "px");
      });
      fin.addEventListener("pointerleave", function () { finLion.style.setProperty("--fx", "0px"); finLion.style.setProperty("--fy", "0px"); });
    }
  }

  // золотые кнопки тянутся к курсору
  if (fine) document.querySelectorAll(".magnet").forEach(function (b) {
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.08).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.14).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });
})();
