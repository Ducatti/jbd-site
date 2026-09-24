(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  // Ano no rodapé
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Borda da navegação ao rolar
  var nav = document.querySelector(".nav");
  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menu mobile
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("menu");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    menu.classList.toggle("is-open", open);
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  // Animação de entrada
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Brilho que segue o cursor nos cards
  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  // Formulário de contato: site estático, então monta um e-mail com os dados
  var form = document.getElementById("contact-form");
  var note = document.getElementById("form-note");
  var EMAIL = "joel.ducatti@gmail.com";

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var valid = true;
    ["nome", "mensagem"].forEach(function (name) {
      var field = form.elements[name];
      var ok = field.value.trim() !== "";
      field.closest(".field").classList.toggle("has-error", !ok);
      if (!ok) valid = false;
    });

    if (!valid) {
      note.textContent = "Preencha seu nome e a mensagem para continuar.";
      note.classList.add("is-error");
      return;
    }

    var nome = form.elements.nome.value.trim();
    var empresa = form.elements.empresa.value.trim();
    var servico = form.elements.servico.value;
    var mensagem = form.elements.mensagem.value.trim();

    var subject = "Contato pelo site — " + servico;
    var body =
      "Nome: " + nome + "\n" +
      (empresa ? "Empresa: " + empresa + "\n" : "") +
      "Serviço: " + servico + "\n\n" +
      mensagem;

    window.location.href =
      "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    note.classList.remove("is-error");
    note.textContent = "Abrindo seu aplicativo de e-mail…";
  });
})();
