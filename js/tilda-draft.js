/* 05.11: переключение снимков в карточках «Работы на Тильде» */
(function () {
  document.querySelectorAll(".tcase[data-frames]").forEach(function (card) {
    var imgs = card.querySelectorAll(".tcase-pic img"), btns = card.querySelectorAll(".tcase-frames button");
    btns.forEach(function (b, i) {
      b.addEventListener("click", function () {
        imgs.forEach(function (im, k) { im.classList.toggle("on", k === i); });
        btns.forEach(function (x, k) { x.setAttribute("aria-pressed", k === i ? "true" : "false"); });
      });
    });
  });
})();

/* 05.11: нажатие на логотип в шапке — мгновенно в самое начало страницы (ссылка #top вела на липкую шапку и не прокручивала) */
(function () {
  var brand = document.querySelector(".nav .brand");
  if (!brand) return;
  brand.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });
})();
