// decide o portal 18+ antes do primeiro paint e pré-carrega só o logo que vai aparecer
(() => {
  const d = document, h = d.documentElement;
  h.classList.add("js");
  let adult = false;
  try { adult = localStorage.getItem("c57-18") === "1"; } catch (e) {}
  if (adult) h.classList.add("adult");
  (adult ? ["img/logo-rgb.jpg", "img/logo-a.jpg"] : ["img/logo-mark.png"]).forEach((href) => {
    const l = d.createElement("link");
    l.rel = "preload"; l.as = "image"; l.href = href; l.fetchPriority = "high";
    d.head.append(l);
  });
})();
