/* Marvin Averill — portfolio v2 interactions */
(function () {
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Split headline into words (masked slide-up) ---------- */
  doc.querySelectorAll("[data-split]").forEach(function (el) {
    var delay = parseInt(el.dataset.splitDelay || "0", 10);
    var lines = el.innerHTML.split(/<br\s*\/?>/i);
    var i = 0;
    el.innerHTML = lines
      .map(function (line) {
        var tmp = doc.createElement("div");
        tmp.innerHTML = line.trim();
        var out = "";
        tmp.childNodes.forEach(function (node) {
          if (node.nodeType === 1 && node.tagName !== "EM") {
            out += '<span class="split-word" style="--d:' + (delay + i++ * 70) + 'ms">' + node.outerHTML + "</span>";
            return;
          }
          var isEm = node.nodeType === 1 && node.tagName === "EM";
          var text = node.textContent;
          text.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { out += " "; return; }
            var word = '<span class="split-word" style="--d:' + (delay + i++ * 70) + 'ms">' + w + "</span>";
            out += isEm ? "<em>" + word + "</em>" : word;
          });
        });
        return '<span class="split-line">' + out + "</span>";
      })
      .join("");
  });

  /* ---------- Page enter / leave ---------- */
  function ready() { doc.body.classList.add("is-ready"); }
  if (doc.readyState === "complete" || doc.readyState === "interactive") requestAnimationFrame(ready);
  else doc.addEventListener("DOMContentLoaded", ready);
  window.addEventListener("pageshow", function (e) {
    doc.body.classList.remove("is-leaving");
    if (e.persisted) ready();
  });
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a || reduce) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download")) return;
    if (/^(mailto:|tel:|https?:|javascript:)/i.test(href)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    doc.body.classList.add("is-leaving");
    setTimeout(function () { window.location.href = a.href; }, 220);
  });

  /* ---------- Theme ---------- */
  doc.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var current = root.dataset.theme ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (err) {}
    });
  });

  /* ---------- Full-screen menu (phones) ---------- */
  var menuBtn = doc.querySelector(".menu-btn");
  if (menuBtn) {
    var setMenu = function (open) {
      root.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.firstChild.textContent = open ? "Close" : "Menu";
    };
    menuBtn.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) setMenu(false); });
  }

  /* ---------- Nav border on scroll ---------- */
  var nav = doc.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Reveal on scroll (with stagger groups) ---------- */
  doc.querySelectorAll("[data-stagger]").forEach(function (group) {
    var step = parseInt(group.dataset.stagger || "70", 10);
    Array.prototype.forEach.call(group.querySelectorAll(":scope > [data-reveal]"), function (el, i) {
      el.style.setProperty("--d", i * step + "ms");
    });
  });
  doc.querySelectorAll("[data-reveal][data-reveal-delay]").forEach(function (el) {
    el.style.setProperty("--d", el.dataset.revealDelay + "ms");
  });
  var reveals = doc.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || reduce) {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Live local clock (Medan, GMT+7) ---------- */
  var clocks = doc.querySelectorAll("[data-clock]");
  if (clocks.length) {
    var tick = function () {
      var t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
      clocks.forEach(function (c) { c.textContent = t; });
    };
    tick();
    setInterval(tick, 15000);
  }
  doc.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Share (copy link) ---------- */
  var toast = doc.getElementById("toast");
  doc.querySelectorAll("[data-share]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.dataset.share === "home" ? new URL("../", window.location.href).href : window.location.href;
      var done = function () {
        if (!toast) return;
        toast.classList.add("show");
        setTimeout(function () { toast.classList.remove("show"); }, 2600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
      else done();
    });
  });

  if (!finePointer || reduce) return;

  /* ---------- Floating preview over project rows ---------- */
  var list = doc.querySelector("[data-preview-list]");
  if (list) {
    var pv = doc.createElement("div");
    pv.className = "hover-preview";
    doc.body.appendChild(pv);
    var imgs = {};
    var px = 0, py = 0, tx = 0, ty = 0, raf = null;
    var loop = function () {
      px += (tx - px) * 0.14;
      py += (ty - py) * 0.14;
      pv.style.left = px + "px";
      pv.style.top = py + "px";
      raf = Math.abs(tx - px) + Math.abs(ty - py) > 0.3 ? requestAnimationFrame(loop) : null;
    };
    list.querySelectorAll("[data-preview]").forEach(function (row) {
      var src = row.dataset.preview;
      row.addEventListener("mouseenter", function (e) {
        if (!imgs[src]) {
          var im = doc.createElement("img");
          im.src = src;
          im.alt = "";
          pv.appendChild(im);
          imgs[src] = im;
        }
        Object.keys(imgs).forEach(function (k) { imgs[k].style.opacity = k === src ? "1" : "0"; });
        if (!pv.classList.contains("show")) { px = tx = e.clientX + 180; py = ty = e.clientY; }
        pv.classList.add("show");
      });
      row.addEventListener("mouseleave", function () { pv.classList.remove("show"); });
    });
    list.addEventListener("mousemove", function (e) {
      tx = e.clientX + 180;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    });
  }

  /* ---------- Cursor label on media ---------- */
  var labelTargets = doc.querySelectorAll("[data-cursor]");
  if (labelTargets.length) {
    var cl = doc.createElement("div");
    cl.className = "cursor-label";
    doc.body.appendChild(cl);
    var cx = 0, cy = 0, lx = 0, ly = 0, craf = null;
    var cloop = function () {
      lx += (cx - lx) * 0.22;
      ly += (cy - ly) * 0.22;
      cl.style.left = lx + "px";
      cl.style.top = ly + "px";
      craf = Math.abs(cx - lx) + Math.abs(cy - ly) > 0.3 ? requestAnimationFrame(cloop) : null;
    };
    labelTargets.forEach(function (t) {
      t.addEventListener("mouseenter", function (e) {
        cl.textContent = t.dataset.cursor;
        lx = cx = e.clientX;
        ly = cy = e.clientY;
        cl.classList.add("show");
      });
      t.addEventListener("mouseleave", function () { cl.classList.remove("show"); });
      t.addEventListener("mousemove", function (e) {
        cx = e.clientX;
        cy = e.clientY;
        if (!craf) craf = requestAnimationFrame(cloop);
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  doc.querySelectorAll("[data-magnetic]").forEach(function (el) {
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) * 0.22;
      var y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.transform = "translate(" + x + "px," + y + "px)";
    });
    el.addEventListener("mouseleave", function () { el.style.transform = ""; });
  });

  /* ---------- Gentle tilt ---------- */
  doc.querySelectorAll("[data-tilt]").forEach(function (wrap) {
    var target = wrap.querySelector("[data-tilt-target]") || wrap;
    wrap.addEventListener("mousemove", function (e) {
      var r = wrap.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      target.style.transform = "perspective(900px) rotateY(" + x * 8 + "deg) rotateX(" + -y * 8 + "deg) translateZ(0)";
    });
    wrap.addEventListener("mouseleave", function () { target.style.transform = ""; });
  });
})();

/* Reading progress line (case studies) */
(function () {
  var bar = document.querySelector(".progress");
  if (!bar) return;
  var ticking = false;
  function update() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();
