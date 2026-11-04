(() => {
  const WA = "5511953803882";
  const EVENT_START = Date.parse("2026-11-06T21:00:00-03:00");
  const EVENT_END = Date.parse("2026-11-07T03:00:00-03:00");
  // [abre, fecha] em minutos desde 0h; fecha > 1440 atravessa a madrugada
  const HOURS = { 0: null, 1: [720, 1380], 2: [720, 1620], 3: [720, 1620], 4: [720, 1620], 5: [720, 1620], 6: [720, 1560] };
  const DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = () => innerWidth <= 760;

  document.addEventListener("DOMContentLoaded", () => {
    let hasGsap = false;
    // ambientes: no celular o texto fica acima da galeria; acompanha giro de tela e resize
    const ambMq = matchMedia("(max-width: 760px)"), ambIntro = $(".amb__intro");
    const placeIntro = () => (ambMq.matches ? $(".amb__pin") : $("#gallery")).prepend(ambIntro);
    placeIntro();
    ambMq.addEventListener("change", () => { placeIntro(); if (hasGsap) ScrollTrigger.refresh(); });

    // rolagem suave
    let lenis = null;
    const smooth = () => {
      if (reduce || lenis || typeof Lenis === "undefined" || location.search.includes("nosmooth")) return;
      lenis = new Lenis({ lerp: 0.09 });
      if (hasGsap) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    };
    const goTo = (el) => (lenis ? lenis.scrollTo(el, { offset: -10, duration: 1.4 }) : el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }));
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = a.getAttribute("href").length > 1 && $(a.getAttribute("href"));
      if (!t) return;
      e.preventDefault();
      // o menu aberto para o Lenis; ele precisa voltar antes de rolar
      if (links.classList.contains("is-open")) setMenu(false);
      goTo(t);
    }));

    // gate 18+: o conteúdo fica no HTML (o Google lê), só a tela fica coberta
    const gate = $("#gate");
    let ok = false;
    try { ok = localStorage.getItem("c57-18") === "1"; } catch (e) {}
    // logo do hero (máscara SVG) só baixa quando o portal sai da frente
    const showLogo = () => $$(".hero__logo image").forEach((i) => i.setAttribute("href", i.dataset.href));
    const unlock = () => {
      document.documentElement.classList.add("adult");
      showLogo();
      document.body.classList.remove("is-locked");
      smooth();
      const later = window.requestIdleCallback || ((f) => setTimeout(f, 300));
      later(() => sparks());
      let seen = false;
      try { seen = sessionStorage.getItem("c57-intro") === "1"; sessionStorage.setItem("c57-intro", "1"); } catch (e) {}
      const intro = $("#intro");
      if (!seen && !reduce) {
        intro.hidden = false;
        setTimeout(() => intro.classList.add("is-out"), 2500);
        setTimeout(() => (intro.hidden = true), 3500);
      }
    };
    if (ok) { gate.hidden = true; showLogo(); }
    else {
      document.body.classList.add("is-locked");
      $("#gate-yes").focus();
    }
    $("#gate-yes").addEventListener("click", () => {
      try { localStorage.setItem("c57-18", "1"); } catch (e) {}
      gate.hidden = true;
      unlock();
    });

    // nav
    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("is-solid", scrollY > 40);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const burger = $("#burger"), links = $("#nav-links");
    const setMenu = (open) => {
      burger.setAttribute("aria-expanded", open);
      burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      links.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && links.classList.contains("is-open")) { setMenu(false); burger.focus(); } });

    // hero: fotos entram depois do primeiro paint
    const slides = $$(".hero__slide");
    const loadSlide = (el) => { if (!el.dataset.on) { el.style.backgroundImage = `url(${el.dataset.src})`; el.dataset.on = 1; } };
    loadSlide(slides[0]);
    addEventListener("load", () => slides.forEach(loadSlide));
    let cur = 0, heroOn = true;
    const hero = $(".hero");
    // fora da tela o hero para: sem troca de foto e sem animação CSS rodando à toa
    new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; hero.classList.toggle("is-off", !heroOn); }).observe(hero);
    if (!reduce) {
      setInterval(() => {
        if (!heroOn || document.hidden) return;
        slides[cur].classList.remove("is-on");
        cur = (cur + 1) % slides.length;
        slides[cur].classList.add("is-on");
      }, 7000);
    }
    // brilho e inclinação seguem o mouse, no máximo uma vez por quadro
    let px = 0, py = 0, pend = false;
    const heroMove = [];
    hero.addEventListener("pointermove", (e) => {
      px = e.clientX; py = e.clientY;
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--gx", `${((px - r.left) / r.width) * 100}%`);
        hero.style.setProperty("--gy", `${((py - r.top) / r.height) * 100}%`);
        heroMove.forEach((f) => f(px, py));
      });
    }, { passive: true });

    // foto do portal fica fora do carregamento inicial; entra junto com as animações
    const portalPhoto = () => $(".portal").classList.add("is-near");

    // faíscas douradas subindo no hero (sprite pré-desenhado, 30 fps, só com o hero na tela)
    const sparks = () => {
      const cv = $("#sparks");
      if (!cv || reduce) return;
      const ctx = cv.getContext("2d");
      const dot = document.createElement("canvas");
      dot.width = dot.height = 24;
      const dc = dot.getContext("2d"), g = dc.createRadialGradient(12, 12, 0, 12, 12, 12);
      g.addColorStop(0, "rgba(255,244,214,1)");
      g.addColorStop(0.25, "rgba(246,223,164,.8)");
      g.addColorStop(1, "rgba(226,190,120,0)");
      dc.fillStyle = g;
      dc.fillRect(0, 0, 24, 24);
      let w, h, parts, visible = true, last = 0;
      const size = () => {
        const dpr = Math.min(devicePixelRatio || 1, 1.5);
        w = cv.clientWidth; h = cv.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      const spawn = (y) => ({ x: Math.random() * w, y: y ?? h + 10, r: Math.random() * 7 + 3, v: Math.random() * 0.9 + 0.3, s: Math.random() * 6.28, a: Math.random() * 0.6 + 0.3 });
      size();
      parts = Array.from({ length: mobile() ? 26 : 50 }, () => spawn(Math.random() * h));
      addEventListener("resize", size);
      const tick = (t) => {
        if (!visible) return;
        requestAnimationFrame(tick);
        if (t - last < 33) return;
        last = t;
        ctx.clearRect(0, 0, w, h);
        for (const p of parts) {
          p.y -= p.v; p.s += 0.04; p.x += Math.sin(p.s) * 0.5;
          if (p.y < -10) Object.assign(p, spawn());
          ctx.globalAlpha = p.a * Math.min(1, p.y / (h * 0.35));
          ctx.drawImage(dot, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(hero);
    };

    // aberto agora (horário de São Paulo)
    const spNow = () => {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      return { d: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), m: +p.hour * 60 + +p.minute };
    };
    const fmt = (min) => `${Math.floor((min % 1440) / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
    const status = () => {
      const { d, m } = spNow();
      const today = HOURS[d], prev = HOURS[(d + 6) % 7];
      let closesAt = null;
      if (prev && prev[1] > 1440 && m < prev[1] - 1440) closesAt = prev[1];
      else if (today && m >= today[0] && m < today[1]) closesAt = today[1];
      const el = $("#status"), txt = $("#status-text");
      if (closesAt) {
        el.className = "status is-open";
        txt.textContent = `Aberto agora · até ${fmt(closesAt)}`;
      } else {
        let nd = d, label = "hoje";
        if (!today || m >= today[0]) {
          for (let i = 1; i <= 7; i++) { nd = (d + i) % 7; if (HOURS[nd]) break; }
          label = nd === (d + 1) % 7 ? "amanhã" : DAYS[nd];
        }
        el.className = "status is-closed";
        txt.textContent = `Fechado · abre ${label} às ${fmt(HOURS[nd][0])}`;
      }
      $$("#hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.d === d));
    };
    status();
    setInterval(status, 60000);

    // reinauguração: some sozinha depois da festa
    const eventSec = $("#reinauguracao"), heroEvent = $("#hero-event");
    const count = () => {
      const now = Date.now();
      if (now > EVENT_END) { eventSec.hidden = true; heroEvent.hidden = true; return false; }
      const diff = Math.max(0, EVENT_START - now);
      const u = { d: Math.floor(diff / 864e5), h: Math.floor(diff / 36e5) % 24, m: Math.floor(diff / 6e4) % 60, s: Math.floor(diff / 1e3) % 60 };
      $$("#count b").forEach((b) => (b.textContent = String(u[b.dataset.u]).padStart(2, "0")));
      $("#mini-count").textContent = diff ? (u.d ? `faltam ${u.d}d ${u.h}h` : `faltam ${u.h}h ${u.m}min`) : "é hoje!";
      return true;
    };
    if (count()) setInterval(count, 1000);

    // manifesto palavra por palavra
    const words = $("#words");
    const wrap = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w.trim()) return frag.append(w);
          const s = document.createElement("span"); s.className = "w"; s.textContent = w; frag.append(s);
        });
        n.replaceWith(frag);
      } else wrap(n);
    });
    wrap(words);
    const ws = $$(".w", words);

    // reserva
    const form = $("#rform"), dayBox = $("#chips-d");
    const { d: today } = spNow();
    const opts = [];
    const { m: nowM } = spNow();
    for (let i = 0; opts.length < 5 && i < 8; i++) {
      const d = (today + i) % 7;
      if (!HOURS[d]) continue;
      if (i === 0 && nowM >= HOURS[d][1]) continue; // hoje já fechou (segunda depois das 23h)
      opts.push(i === 0 ? "hoje" : i === 1 ? "amanhã" : DAYS[d]);
    }
    dayBox.innerHTML = opts.map((o, i) => `<label><input type="radio" name="d" value="${o}"${i ? "" : " checked"}><span>${o[0].toUpperCase() + o.slice(1)}</span></label>`).join("");
    const msg = () => {
      const f = new FormData(form);
      const m = f.get("m"), d = f.get("d"), p = f.get("p");
      const quero = m === "Só o bar" ? "colocar meu nome pra curtir o bar" : `reservar uma ${m.toLowerCase()}`;
      return `Olá! Quero ${quero} ${d === "hoje" || d === "amanhã" ? d : "na " + d}, ${p}. Vim pelo site.`;
    };
    const preview = () => ($("#preview").textContent = `“${msg()}”`);
    form.addEventListener("change", preview);
    preview();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      open(`https://wa.me/${WA}?text=${encodeURIComponent(msg())}`, "_blank", "noopener");
    });
    $$(".ritual").forEach((c) => $(".ritual__cta", c).addEventListener("click", () => {
      const r = $(`input[name="m"][value="${c.dataset.massagem}"]`, form);
      if (r) { r.checked = true; preview(); }
      goTo($("#reserva"));
    }));

    // mapa só carrega quando pedem
    $("#map-load").addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = "https://www.google.com/maps?q=Alameda+dos+Aic%C3%A1s,+1293+-+Moema,+S%C3%A3o+Paulo+-+SP,+04086-003&output=embed";
      f.title = "Mapa: Club 57 by Vani, Alameda dos Aicás, 1293, Moema";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      $("#map").replaceChildren(f);
    });

    // lightbox
    const lb = $("#lightbox"), lbImg = $("#lb-img");
    let lastFocus = null;
    const closeLb = () => { lb.hidden = true; document.body.classList.remove("is-locked"); lenis && lenis.start(); lastFocus && lastFocus.focus(); };
    $$("#gallery button").forEach((b) => b.addEventListener("click", () => {
      const img = $("img", b);
      lastFocus = b;
      lbImg.src = img.src; lbImg.alt = img.alt;
      lb.hidden = false;
      document.body.classList.add("is-locked");
      lenis && lenis.stop();
      $("#lb-close").focus();
    }));
    $("#lb-close").addEventListener("click", closeLb);
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLb(); });

    $("#year").textContent = new Date().getFullYear();
    if (ok) unlock();

    // cursor dourado, botões magnéticos e inclinações (só mouse)
    if (matchMedia("(pointer: fine)").matches && !reduce) {
      document.documentElement.classList.add("has-cursor");
      const cur = $("#cursor"), dot = $("i", cur), ring = $("span", cur);
      let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, running = false;
      // o anel só anima enquanto ainda está alcançando o ponteiro
      const loop = () => {
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        ring.style.transform = `translate(${rx}px,${ry}px)`;
        if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(loop);
        else running = false;
      };
      addEventListener("pointermove", (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate(${mx}px,${my}px)`;
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      document.addEventListener("pointerover", (e) => cur.classList.toggle("is-hover", !!e.target.closest("a,button,label,summary")));
      $$("[data-magnet]").forEach((b) => {
        b.addEventListener("pointermove", (e) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
        });
        b.addEventListener("pointerleave", () => (b.style.transform = ""));
      });
      const logo = $(".hero__logo");
      heroMove.push((x, y) => {
        logo.style.setProperty("--ry", `${(x / innerWidth - 0.5) * 18}deg`);
        logo.style.setProperty("--rx", `${(0.5 - y / innerHeight) * 14}deg`);
      });
      const poster = $(".event__poster");
      poster.addEventListener("pointermove", (e) => {
        const r = poster.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        poster.style.setProperty("--py", `${(x - 0.5) * 14}deg`);
        poster.style.setProperty("--px", `${(0.5 - y) * 10}deg`);
        poster.style.setProperty("--gx2", `${x * 100}%`);
        poster.style.setProperty("--gy2", `${y * 100}%`);
      });
      poster.addEventListener("pointerleave", () => ["--px", "--py"].forEach((p) => poster.style.setProperty(p, "0deg")));
    }

    // sem GSAP ou com movimento reduzido: tudo aparece de uma vez
    const still = () => {
      portalPhoto();
      ws.forEach((w) => w.classList.add("on"));
      $$(".reveal").forEach((el) => el.classList.add("is-in"));
      $(".portal__photo").style.opacity = 1;
      $(".portal__cap").style.opacity = 1;
      $("#rituals").classList.add("no-pin");
    };

    const motion = () => {
      hasGsap = true;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      if (!document.body.classList.contains("is-locked")) smooth();

      // reveal simples
      $$(".reveal").forEach((el) => ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => el.classList.add("is-in") }));

      // hero afunda na rolagem
      gsap.to(".hero__bg", { yPercent: 18, scale: 1.08, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to("#hero-inner", { yPercent: -25, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

      // portal: entra pelo 57 até o salão
      const pt = gsap.timeline({ scrollTrigger: { trigger: ".portal", start: "top top", end: "bottom bottom", scrub: 0.6 } });
      pt.fromTo(".portal__num", { scale: 0.7 }, { scale: 1, duration: 0.25, ease: "none" })
        .to(".portal__num", { scale: 22, duration: 0.55, ease: "power2.in" })
        .to(".portal__photo", { opacity: 1, duration: 0.25, ease: "none" }, "-=0.3")
        .to(".portal__num", { opacity: 0, duration: 0.1 }, "-=0.12")
        .to(".portal__cap", { opacity: 1, y: -10, duration: 0.2 });

      // manifesto acende palavra por palavra
      ScrollTrigger.create({
        trigger: words, start: "top 80%", end: "bottom 45%", scrub: true,
        onUpdate: (st) => { const n = Math.round(st.progress * ws.length); ws.forEach((w, i) => w.classList.toggle("on", i < n)); },
      });
      gsap.from(".manifesto__stats li", { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".manifesto__stats", start: "top 88%" } });

      // cartaz e cards
      gsap.from(".event__poster img", { y: 90, rotate: -8, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".event", start: "top 75%" } });
      gsap.from(".bar__a", { clipPath: "inset(100% 0 0 0)", duration: 1.5, ease: "expo.inOut", scrollTrigger: { trigger: ".bar", start: "top 75%" } });
      gsap.from(".bar__b", { clipPath: "inset(0 0 0 100%)", duration: 1.5, delay: 0.2, ease: "expo.inOut", scrollTrigger: { trigger: ".bar", start: "top 75%" } });
      gsap.to(".final__media", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".final", scrub: true } });
      gsap.from(".final__big", { scale: 0.85, opacity: 0, ease: "none", scrollTrigger: { trigger: ".final", start: "top 80%", end: "center center", scrub: true } });

      // ambientes: rolagem horizontal presa na tela (desktop)
      gsap.matchMedia().add("(min-width: 761px)", () => {
        const track = $("#gallery");
        const dist = () => track.scrollWidth - (innerWidth - track.getBoundingClientRect().left) + 40;
        const tween = gsap.to(track, {
          x: () => -dist(), ease: "none",
          scrollTrigger: { trigger: ".amb", pin: ".amb__pin", start: "top top", end: () => "+=" + dist(), scrub: 0.8, invalidateOnRefresh: true },
        });
        $$(".amb__card img").forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: img.parentNode, containerAnimation: tween, start: "left right", end: "right left", scrub: true } }));
      });

      // rituais: um por vez, com a luz mudando de cor
      const rits = $$(".ritual"), navLi = $$(".rituals__nav li");
      const glows = ["rgba(226,170,90,.38)", "rgba(205,120,50,.38)", "rgba(160,40,70,.42)", "rgba(190,30,45,.45)", "rgba(240,205,130,.34)"];
      const pinEl = $(".rituals__pin");
      let ri = 0;
      const show = (n) => {
        if (n === ri) return;
        const dir = n > ri ? 1 : -1, next = rits[n];
        rits.forEach((r, i) => {
          gsap.killTweensOf([r, $(".ritual__name", r)]);
          if (i !== n) gsap.to(r, { autoAlpha: 0, y: i === ri ? -70 * dir : 0, duration: i === ri ? 0.5 : 0.2, ease: "power3.in", onComplete: () => r.classList.remove("is-on") });
        });
        next.classList.add("is-on");
        gsap.fromTo(next, { autoAlpha: 0, y: 70 * dir }, { autoAlpha: 1, y: 0, duration: 0.9, delay: 0.2, ease: "expo.out" });
        gsap.fromTo($(".ritual__name", next), { letterSpacing: "0.08em", filter: "blur(10px)" }, { letterSpacing: "-0.03em", filter: "blur(0px)", duration: 1.2, delay: 0.25, ease: "expo.out" });
        navLi.forEach((l, i) => l.classList.toggle("is-on", i === n));
        $("#rit-n").textContent = String(n + 1).padStart(2, "0");
        pinEl.style.setProperty("--rg", glows[n]);
        ri = n;
      };
      gsap.set(rits.slice(1), { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: "#rituals", pin: ".rituals__pin", refreshPriority: 1, start: "top top", end: () => "+=" + innerHeight * 3.2, scrub: true,
        onUpdate: (st) => {
          $("#rit-bar").style.transform = `scaleX(${0.2 + st.progress * 0.8})`;
          show(Math.min(rits.length - 1, Math.floor(st.progress * rits.length)));
        },
      });

      // faixa gigante: corre sozinha e acelera com a rolagem
      const big = gsap.to("#big-track", { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
      ScrollTrigger.create({
        trigger: ".big", start: "top bottom", end: "bottom top",
        onUpdate: (st) => {
          const v = st.getVelocity() / 300;
          gsap.to(big, { timeScale: (st.direction || 1) * Math.max(1, Math.min(6, Math.abs(v))), duration: 0.3, overwrite: true });
          gsap.to(big, { timeScale: st.direction || 1, duration: 1.2, delay: 0.3 });
        },
      });

      ScrollTrigger.refresh();
    };

    // GSAP, ScrollTrigger e Lenis só chegam depois do primeiro paint
    if (reduce) return still();
    const load = (src) => new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.append(s);
    });
    let booted = false;
    const boot = () => {
      if (booted) return;
      booted = true;
      portalPhoto();
      load("js/gsap.min.js")
        .then(() => Promise.all([load("js/ScrollTrigger.min.js"), load("js/lenis.min.js")]))
        .then(motion)
        .catch(still);
    };
    ["scroll", "pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, boot, { once: true, passive: true }));
    const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 2500 }) : (f) => setTimeout(f, 1200);
    if (document.readyState === "complete") idle(boot);
    else addEventListener("load", () => idle(boot));
  });
})();