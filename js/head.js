// decide o portal 18+ antes do primeiro paint
document.documentElement.classList.add("js");
try { if (localStorage.getItem("c57-18") === "1") document.documentElement.classList.add("adult"); } catch (e) {}
