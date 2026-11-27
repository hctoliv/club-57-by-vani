// decide o portal 18+ antes do primeiro paint
(() => {
  const h = document.documentElement;
  h.classList.add("js");
  try { if (localStorage.getItem("c57-18") === "1") h.classList.add("adult"); } catch (e) {}
})();
