/* Yummi – interactions & motion */
(() => {
  "use strict";

  /* ------- settings: fill in the real details ------- */
  const CONTACT_EMAIL = "hello@yummi.co.il";   // where the form sends to (mailto fallback)
  const FORM_ENDPOINT = "";                     // optional: Formspree / Make / Zapier webhook URL

  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isDesktop = () => innerWidth >= 1024;

  root.classList.add("js");

  /* ------- real viewport width (excludes scrollbar) ------- */
  const setVW = () => root.style.setProperty("--vw", root.clientWidth + "px");
  setVW();
  addEventListener("resize", () => { setVW(); requestAnimationFrame(layoutScripts); }, { passive: true });

  /* ------- script titles: Allison word + hand-drawn flourish ------- */
  const NS = "http://www.w3.org/2000/svg";
  const scripts = $$("[data-script]");
  scripts.forEach(el => {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    const l = document.createElementNS(NS, "path");
    const r = document.createElementNS(NS, "path");
    const t = document.createElementNS(NS, "text");
    l.setAttribute("class", "script__flourish script__flourish--l");
    r.setAttribute("class", "script__flourish script__flourish--r");
    t.setAttribute("class", "script__text");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("direction", "ltr");
    t.textContent = el.dataset.script;
    svg.append(l, t, r);
    el.append(svg);
  });

  function layoutScripts() {
    scripts.forEach(el => {
      const svg = $("svg", el), t = $("text", el), l = $(".script__flourish--l", el), r = $(".script__flourish--r", el);
      const H = 60, W = Math.max(120, Math.round((el.clientWidth / Math.max(1, el.clientHeight)) * H));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      t.setAttribute("x", W / 2);
      t.setAttribute("y", 44);
      t.setAttribute("font-size", el.dataset.fs || 60);
      let bb;
      try { bb = t.getBBox(); } catch (e) { return; }
      if (!bb.width) return;
      const x1 = bb.x + 4, x2 = bb.x + bb.width - 3, yb = 46;
      // left stroke: comes in from the edge with a soft wave and lifts into the first letter
      l.setAttribute("d", `M2 ${yb - 6} C ${x1 * .28} ${yb - 16}, ${x1 * .55} ${yb + 2}, ${x1 * .78} ${yb - 4} S ${x1 - 2} ${yb - 20}, ${x1 + 2} ${yb - 22}`);
      // right stroke: leaves the last letter, runs out and curls up at the end
      const span = W - x2;
      r.setAttribute("d", `M${x2} ${yb - 3} C ${x2 + span * .3} ${yb + 3}, ${x2 + span * .55} ${yb - 14}, ${x2 + span * .8} ${yb - 13} S ${W - 3} ${yb - 4}, ${W - 2} ${yb - 9}`);
      [l, r].forEach(p => { const len = Math.ceil(p.getTotalLength()) + 2; p.style.setProperty("--len", len); });
    });
  }

  /* ------- project names: biggest size that fits the column (like the mockup) ------- */
  function fitNames() {
    $$(".project__name").forEach(h => {
      h.style.removeProperty("--fit");
      if (!isDesktop()) return;
      const col = h.parentElement.clientWidth;
      const w = h.scrollWidth;
      if (w > col) h.style.setProperty("--fit", (parseFloat(getComputedStyle(h).fontSize) * col / w * .99).toFixed(2) + "px");
    });
  }
  addEventListener("resize", () => requestAnimationFrame(fitNames), { passive: true });

  /* ------- intro / loader ------- */
  const heroImg = $(".hero__art img");
  const imgReady = new Promise(res => (heroImg && !heroImg.complete) ? (heroImg.onload = heroImg.onerror = res) : res());
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const minTime = new Promise(res => setTimeout(res, reduce ? 0 : 1100));
  const failSafe = new Promise(res => setTimeout(res, 4000));

  Promise.race([Promise.all([imgReady, fontsReady, minTime]), failSafe]).then(() => {
    layoutScripts();
    fitNames();
    body.classList.remove("is-loading");
    $$(".hero__title .w").forEach((w, i) => (w.style.transitionDelay = `${.45 + i * .09}s`));
    setTimeout(() => {
      body.classList.add("is-ready");
      setTimeout(() => $(".hero__script")?.classList.add("is-in"), 350);
    }, reduce ? 0 : 250);
  });

  /* ------- smooth scrolling (Lenis, with native fallback) ------- */
  let lenis = null;
  const startLenis = () => {
    if (reduce || !window.Lenis) return;
    lenis = new window.Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: .95 });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    lenis.on("scroll", onScroll);
  };
  if (document.readyState === "complete") startLenis(); else addEventListener("load", startLenis);

  const scrollToEl = (el) => {
    const off = isDesktop() ? 0 : -64;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(id === "#top" ? body : target);
    if (a.hasAttribute("data-focus-form")) setTimeout(() => $("#contact-form input")?.focus({ preventScroll: true }), 1300);
    history.replaceState(null, "", id === "#top" ? location.pathname : id);
  }));

  /* ------- mobile menu ------- */
  const burger = $(".nav__burger"), mmenu = $("#mmenu");
  function closeMenu() {
    if (!body.classList.contains("menu-open")) return;
    body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    mmenu.setAttribute("aria-hidden", "true");
    lenis?.start();
  }
  burger.addEventListener("click", () => {
    const open = !body.classList.contains("menu-open");
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mmenu.setAttribute("aria-hidden", String(!open));
    open ? lenis?.stop() : lenis?.start();
  });
  addEventListener("keydown", e => e.key === "Escape" && closeMenu());

  /* ------- reveal on scroll ------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: .08 });
  $$("[data-reveal], .script:not(.hero__script), .u").forEach(el => io.observe(el));
  // small stagger inside a section
  $$("section").forEach(sec => $$(":scope [data-reveal]", sec).forEach((el, i) => {
    if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", `${Math.min(i, 6) * .08}s`);
  }));

  /* ------- nav: scrolled state, hide on scroll down, active link squiggle ------- */
  const nav = $("#nav");
  const links = $$(".nav__links a");
  const squiggle = $(".nav__squiggle");
  const sections = links.map(a => $(a.getAttribute("href")));
  let lastY = 0, hoverLink = null, activeLink = null;

  function placeSquiggle(a) {
    if (!a) { squiggle.style.setProperty("--so", 0); return; }
    const wrap = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    squiggle.style.width = r.width * 1.06 + "px";
    squiggle.style.setProperty("--sx", (r.left - wrap.left - r.width * .03) + "px");
    squiggle.style.setProperty("--sy", (r.bottom - wrap.top - 2) + "px");
    squiggle.style.setProperty("--so", 1);
  }
  links.forEach(a => {
    a.addEventListener("mouseenter", () => { hoverLink = a; placeSquiggle(a); });
    a.addEventListener("mouseleave", () => { hoverLink = null; placeSquiggle(activeLink); });
  });

  /* ------- waves in "work" draw with scroll ------- */
  const waves = $$(".wave");
  waves.forEach(p => { const len = Math.ceil(p.getTotalLength()); p.style.setProperty("--len", len); p.dataset.len = len; });
  const work = $("#work");

  const progress = $(".progress i");

  function onScroll() {
    const y = lenis ? lenis.scroll : scrollY;
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);

    nav.classList.toggle("is-scrolled", y > 40);
    if (!body.classList.contains("menu-open")) {
      nav.classList.toggle("is-hidden", y > vh * .9 && y > lastY + 2);
      if (y < lastY - 2) nav.classList.remove("is-hidden");
    }
    lastY = y;

    // active section
    let current = null;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .45) current = links[i]; });
    if (y < vh * .4) current = null;
    if (current !== activeLink) { activeLink = current; if (!hoverLink) placeSquiggle(activeLink); links.forEach(l => l.classList.toggle("is-active", l === current)); }

    // waves
    if (work) {
      const r = work.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height * .9)));
      waves.forEach(p => p.style.strokeDashoffset = (p.dataset.len * (1 - t)).toFixed(1));
    }

    // hero art drifts on scroll
    if (y < vh * 1.2) { root.style.setProperty("--hs", (y * .18).toFixed(1) + "px"); root.style.setProperty("--hz", (y / vh * .05).toFixed(4)); }
  }
  addEventListener("scroll", () => { if (!lenis) onScroll(); }, { passive: true });
  onScroll();

  /* ------- pointer effects (desktop only) ------- */
  if (finePointer && !reduce) {
    const glow = $(".cursor-glow");
    const art = $(".hero__art");
    let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function tick() {
      gx += (mx - gx) * .12; gy += (my - gy) * .12;
      glow.style.setProperty("--mx", gx + "px");
      glow.style.setProperty("--my", gy + "px");
      if (art && scrollY < innerHeight) {
        const dx = (mx / innerWidth - .5), dy = (my / innerHeight - .5);
        art.style.setProperty("--px", (dx * -8).toFixed(2) + "px");
        art.style.setProperty("--py", (dy * -6).toFixed(2) + "px");
      }
      requestAnimationFrame(tick);
    })();

    // magnetic buttons
    $$(".magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .18, y = (e.clientY - r.top - r.height / 2) * .28;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });

    // 3D tilt on the browser frames
    $$(".browser").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        b.style.setProperty("--ry", (px * 9).toFixed(2) + "deg");
        b.style.setProperty("--rx", (py * -7).toFixed(2) + "deg");
      });
      b.addEventListener("pointerleave", () => { b.style.setProperty("--ry", "0deg"); b.style.setProperty("--rx", "0deg"); });
    });
  }

  /* ------- contact form ------- */
  const form = $("#contact-form");
  const msg = $(".form__msg", form);
  const say = (text, err) => { msg.textContent = text; msg.classList.toggle("is-err", !!err); msg.classList.add("is-on"); };
  $$("input, textarea", form).forEach(f => f.addEventListener("input", () => f.closest(".field").classList.remove("is-error")));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let ok = true;
    const bad = el => { el.closest(".field").classList.add("is-error"); ok = false; };
    if (!data.name.trim()) bad(form.name);
    if (!/^[0-9+\-\s()]{9,}$/.test(data.phone.trim())) bad(form.phone);
    if (data.email.trim() && !/^\S+@\S+\.\S+$/.test(data.email.trim())) bad(form.email);
    if (!ok) { say("רק עוד רגע… חסר שם או טלפון תקין.", true); return; }

    const btn = $("button", form);
    btn.disabled = true;
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
      } else {
        const bodyTxt = `שם: ${data.name}\nטלפון: ${data.phone}\nמייל: ${data.email}\n\n${data.message}`;
        location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("פנייה חדשה מהאתר – " + data.name)}&body=${encodeURIComponent(bodyTxt)}`;
      }
      form.classList.add("is-sent");
      say(`תודה ${data.name.split(" ")[0]}! קיבלתי, ואחזור אליכם ממש בקרוב.`);
      form.reset();
    } catch (err) {
      say("אופס, משהו השתבש. נסו שוב או כתבו לי בוואטסאפ.", true);
    } finally {
      btn.disabled = false;
      setTimeout(() => form.classList.remove("is-sent"), 1200);
    }
  });
})();
