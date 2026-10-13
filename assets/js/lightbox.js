/* Lightbox for any element with data-gallery="a.jpg,b.jpg" (or data-zoom on an <img>) */
(function () {
  var lb = document.getElementById("lightbox");
  if (!lb) return;
  var img = document.getElementById("lbImg");
  var count = document.getElementById("lbCount");
  var list = [];
  var idx = 0;
  var lastFocus = null;

  function show(i) {
    idx = (i + list.length) % list.length;
    img.classList.remove("loaded");
    var next = new Image();
    next.onload = function () {
      img.src = list[idx];
      requestAnimationFrame(function () { img.classList.add("loaded"); });
    };
    next.src = list[idx];
    count.textContent = String(idx + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
  }
  function open(srcs, i, from) {
    list = srcs;
    lastFocus = from || null;
    lb.classList.toggle("single", list.length < 2);
    lb.classList.add("open");
    document.documentElement.style.overflow = "hidden";
    show(i || 0);
    lb.querySelector(".lb-close").focus({ preventScroll: true });
  }
  function close() {
    lb.classList.remove("open");
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  document.querySelectorAll("[data-gallery]").forEach(function (el) {
    el.addEventListener("click", function () { open(el.dataset.gallery.split(","), 0, el); });
  });
  var zooms = Array.prototype.slice.call(document.querySelectorAll("[data-zoom]"));
  zooms.forEach(function (el, i) {
    el.addEventListener("click", function () {
      open(zooms.map(function (z) { return z.currentSrc || z.src; }), i, el);
    });
  });

  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight" && list.length > 1) show(idx + 1);
    if (e.key === "ArrowLeft" && list.length > 1) show(idx - 1);
  });
  var sx = 0;
  lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50 && list.length > 1) show(idx + (dx < 0 ? 1 : -1));
  });
})();
