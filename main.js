(() => {
  const WA = "5511953803882";
  // [abre, fecha] em minutos desde 0h; fecha > 1440 atravessa a madrugada
  const HOURS = { 0: null, 1: [720, 1740], 2: [720, 1740], 3: [720, 1740], 4: [720, 1740], 5: [720, 1740], 6: [720, 1740] };
  const DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const WORDS = ["CLUB 57", "RELAXE", "BRINDE", "DESLIGUE", "VIVA O 57"];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  document.addEventListener("DOMContentLoaded", () => {
    const lock = (on) => document.body.classList.toggle("is-locked", on);

    // ---------- gate 18+ (o conteúdo fica no HTML pro Google, só a tela fica coberta) ----------
    const gate = $("#gate");
    let ok = false;
    try { ok = localStorage.getItem("c57-18") === "1"; } catch (e) {}
    if (!ok) { lock(true); $("#gate-yes").focus(); }
    $("#gate-yes").addEventListener("click", () => {
      try { localStorage.setItem("c57-18", "1"); } catch (e) {}
      document.documentElement.classList.add("adult");
      lock(false);
      typer.start();
    });

    // ---------- menu ----------
    const nav = $("#nav"), menu = $("#menu"), menuBtn = $("#menu-btn");
    const setMenu = (open) => {
      nav.classList.toggle("is-open", open);
      menu.inert = !open;
      menuBtn.setAttribute("aria-expanded", open);
      menuBtn.textContent = open ? "Fechar" : "Menu";
    };
    menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener("click", (e) => { if (nav.classList.contains("is-open") && !nav.contains(e.target)) setMenu(false); });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

    // ---------- título digitado, palavra por palavra ----------
    const typeEl = $("#type");
    const typer = (() => {
      let w = 0, i = WORDS[0].length, del = true, timer = 0, running = false, visible = true;
      const step = () => {
        if (!visible || document.hidden) { running = false; return; }
        const word = WORDS[w];
        let wait;
        if (del) {
          i--;
          wait = 45;
          if (i <= 0) { del = false; w = (w + 1) % WORDS.length; wait = 280; }
        } else {
          i++;
          wait = 95;
          if (i >= WORDS[w].length) { del = true; wait = w === 0 ? 2600 : 1500; }
        }
        typeEl.textContent = WORDS[w].slice(0, Math.max(0, i)) || " ";
        timer = setTimeout(step, wait);
      };
      const go = () => { if (running || reduce) return; running = true; timer = setTimeout(step, 2200); };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && document.documentElement.classList.contains("adult")) go(); }).observe($(".hero"));
      document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && document.documentElement.classList.contains("adult")) go(); });
      return { start: go };
    })();
    if (ok) typer.start();

    // ---------- pilha de destaques ----------
    const stack = $("#stack"), scards = $$(".scard", stack), sdots = $$("#stack-dots button");
    let front = 0, stackOn = false, stackTimer = 0;
    const paint = () => {
      scards.forEach((c, k) => {
        const pos = (k - front + scards.length) % scards.length;
        c.className = `scard is-${pos}`;
        c.inert = pos !== 0;
      });
      sdots.forEach((d, k) => d.setAttribute("aria-selected", k === front));
    };
    const go = (n) => { front = (n + scards.length) % scards.length; paint(); restart(); };
    const restart = () => { clearInterval(stackTimer); if (stackOn && !reduce) stackTimer = setInterval(() => go(front + 1), 5200); };
    sdots.forEach((d, k) => d.addEventListener("click", () => go(k)));
    scards.forEach((c, k) => c.addEventListener("click", (e) => { if (!c.classList.contains("is-0")) { e.preventDefault(); go(k); } }));
    let sx = null;
    stack.addEventListener("pointerdown", (e) => (sx = e.clientX), { passive: true });
    stack.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(front + (e.clientX < sx ? 1 : -1)); sx = null; }, { passive: true });
    new IntersectionObserver(([e]) => { stackOn = e.isIntersecting; restart(); }, { threshold: 0.3 }).observe(stack);
    paint();

    // ---------- efeitos ligados à rolagem (função da posição, nunca tween disparado) ----------
    const fills = $$(".mega.fill");
    let ticking = false;
    const onScroll = () => {
      ticking = false;
      nav.classList.toggle("is-solid", scrollY > 60);
      if (reduce) return;
      const vh = innerHeight;
      const r = stack.getBoundingClientRect();
      stack.style.setProperty("--s", (0.86 + 0.14 * clamp((vh - r.top) / (vh * 0.7))).toFixed(4));
      fills.forEach((h) => {
        const t = h.getBoundingClientRect().top;
        h.style.setProperty("--p", clamp((vh * 0.92 - t) / (vh * 0.45)).toFixed(3));
      });
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();

    // ---------- entrada suave ----------
    const rvs = $$(".sec__lead, .rail, .perks, .about__txt, .panel, .duo, .faq, .foot__panel");
    rvs.forEach((el) => el.classList.add("rv"));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    rvs.forEach((el) => io.observe(el));

    // ---------- carrosséis ----------
    $$("[data-rail]").forEach((rail) => {
      const track = $(".rail__track", rail), items = [...track.children], dots = $(".dots", rail);
      const [prev, next] = $$(".arrow", rail);
      dots.innerHTML = items.map(() => "<i></i>").join("");
      const dl = [...dots.children];
      const stepW = () => items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 14);
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        const n = Math.round(track.scrollLeft / stepW());
        const cur = track.scrollLeft >= max - 4 ? items.length - 1 : n;
        dl.forEach((d, k) => d.classList.toggle("on", k === cur));
        prev.disabled = track.scrollLeft <= 4;
        next.disabled = track.scrollLeft >= max - 4;
        rail.querySelector(".rail__ctrl").hidden = max <= 4;
      };
      prev.addEventListener("click", () => track.scrollBy({ left: -stepW(), behavior: reduce ? "auto" : "smooth" }));
      next.addEventListener("click", () => track.scrollBy({ left: stepW(), behavior: reduce ? "auto" : "smooth" }));
      track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
      addEventListener("resize", update);
      update();
      // arrastar com o mouse no desktop
      let down = false, x0 = 0, s0 = 0, moved = false;
      track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft; track.style.scrollSnapType = "none"; });
      addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 5) moved = true; track.scrollLeft = s0 - dx; });
      addEventListener("pointerup", () => {
        if (!down) return;
        down = false;
        const n = Math.round(track.scrollLeft / stepW());
        track.style.scrollSnapType = "";
        track.scrollTo({ left: n * stepW(), behavior: "smooth" });
      });
      track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    });

    // ---------- status aberto/fechado no fuso de SP ----------
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

    // ---------- reserva montada → WhatsApp ----------
    const form = $("#rform"), dayBox = $("#chips-d");
    const { d: today, m: nowM } = spNow();
    const opts = [];
    for (let i = 0; opts.length < 5 && i < 8; i++) {
      const d = (today + i) % 7;
      if (!HOURS[d]) continue;
      if (i === 0 && nowM >= 1259) continue; // reservas só até 20h59
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
    $$("#massagens .card").forEach((c) => $(".pill", c).addEventListener("click", () => {
      const r = $(`input[name="m"][value="${c.dataset.massagem}"]`, form);
      if (r) { r.checked = true; preview(); }
      $("#reserva").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }));

    // ---------- trabalhe conosco → WhatsApp ----------
    const tform = $("#tform"), terr = $("#terr");
    const idade = (iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      const n = new Date(), a = n.getFullYear() - y;
      return n.getMonth() + 1 > m || (n.getMonth() + 1 === m && n.getDate() >= d) ? a : a - 1;
    };
    const erro = (txt, campo) => {
      terr.textContent = txt; terr.hidden = false;
      if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
    };
    tform.addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); terr.hidden = true; });
    tform.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(tform), el = (n) => tform.elements[n];
      const nome = (f.get("nome") || "").trim().replace(/\s+/g, " ");
      const tel = (f.get("tel") || "").replace(/\D/g, "");
      const cidade = (f.get("cidade") || "").trim();
      const nasc = f.get("nasc") || "";
      if (nome.split(" ").length < 2) return erro("Escreva seu nome completo, com sobrenome.", el("nome"));
      if (!nasc) return erro("Informe sua data de nascimento.", el("nasc"));
      const anos = idade(nasc);
      if (!(anos >= 18 && anos < 100)) return erro("A vaga é só para maiores de 18 anos.", el("nasc"));
      if (tel.length < 10 || tel.length > 13) return erro("Confira o número do WhatsApp, com DDD.", el("tel"));
      if (!cidade) return erro("Informe sua cidade ou bairro.", el("cidade"));
      const foto = el("foto").files[0];
      if (!foto) return erro("Escolha uma foto de corpo inteiro para enviar.", el("foto"));
      if (!foto.type.startsWith("image/")) return erro("A foto precisa ser uma imagem (JPG ou PNG).", el("foto"));
      if (!f.get("ok")) return erro("Confirme que tem 18 anos ou mais para enviar.", el("ok"));
      const disp = f.getAll("disp"), insta = (f.get("insta") || "").trim(), sobre = (f.get("sobre") || "").trim();
      const linhas = [
        "Olá! Quero trabalhar no Club 57 como modelo.", "",
        `Nome completo: ${nome}`, `Idade: ${anos} anos`, `WhatsApp: ${f.get("tel").trim()}`, `Cidade/bairro: ${cidade}`,
        `Experiência: ${f.get("exp")}`, `Disponibilidade: ${disp.length ? disp.join(", ") : "a combinar"}`,
      ];
      if (insta) linhas.push(`Instagram: ${insta}`);
      if (sobre) linhas.push(`Sobre mim: ${sobre}`);
      linhas.push("", "Vim pela página Trabalhe conosco · Modelos do site.");
      const texto = linhas.join("\n");
      const abrirWhats = (extra) => open(`https://wa.me/${WA}?text=${encodeURIComponent(texto + (extra || ""))}`, "_blank", "noopener");
      const nota = $("#tnote");
      // no celular a foto vai junto pelo compartilhamento; sem isso, abre o WhatsApp e pede pra anexar
      if (navigator.canShare && navigator.canShare({ files: [foto] })) {
        navigator.share({ files: [foto], text: texto }).catch(() => abrirWhats("\n\nVou enviar minha foto de corpo inteiro aqui na conversa."));
        if (nota) nota.textContent = "Escolha o WhatsApp do Club 57 na lista para enviar a ficha com a foto.";
      } else {
        abrirWhats("\n\nVou enviar minha foto de corpo inteiro aqui na conversa.");
        if (nota) nota.textContent = "Abrimos o WhatsApp com a sua ficha. Anexe a foto de corpo inteiro na conversa antes de enviar.";
      }
    });

    // ---------- mapa só sob demanda ----------
    $("#map-load").addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = "https://www.google.com/maps?q=Alameda+dos+Aic%C3%A1s,+1293+-+Moema,+S%C3%A3o+Paulo+-+SP,+04086-003&output=embed";
      f.title = "Mapa: Club 57, Alameda dos Aicás, 1293, Moema";
      f.loading = "lazy";
      f.referrerPolicy = "no-referrer-when-downgrade";
      $("#map").replaceChildren(f);
    });

    // ---------- lightbox ----------
    const lb = $("#lightbox"), lbImg = $("#lb-img");
    let lastFocus = null;
    const closeLb = () => { lb.hidden = true; lock(false); lastFocus && lastFocus.focus(); };
    $$("#gallery button").forEach((b) => b.addEventListener("click", () => {
      const img = $("img", b);
      lastFocus = b;
      lbImg.src = img.src; lbImg.alt = img.alt;
      lb.hidden = false;
      lock(true);
      $("#lb-close").focus();
    }));
    $("#lb-close").addEventListener("click", closeLb);
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLb(); });

    $("#year").textContent = new Date().getFullYear();
  });
})();
