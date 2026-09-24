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

  // Formulário de contato: enviado ao Netlify Forms via AJAX.
  // Sem JavaScript, o envio nativo (POST) leva para /obrigado.html.
  var form = document.getElementById("contact-form");
  var note = document.getElementById("form-note");
  var submitBtn = form.querySelector('button[type="submit"]');
  var submitLabel = submitBtn.innerHTML;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setNote(text, state) {
    note.textContent = text;
    note.classList.toggle("is-error", state === "error");
    note.classList.toggle("is-success", state === "success");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var checks = {
      nome: function (v) { return v !== ""; },
      email: function (v) { return EMAIL_RE.test(v); },
      mensagem: function (v) { return v !== ""; }
    };
    var firstInvalid = null;
    Object.keys(checks).forEach(function (name) {
      var field = form.elements[name];
      var ok = checks[name](field.value.trim());
      field.closest(".field").classList.toggle("has-error", !ok);
      field.setAttribute("aria-invalid", String(!ok));
      if (!ok && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setNote("Preencha nome, um e-mail válido e a mensagem para continuar.", "error");
      firstInvalid.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    setNote("");

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        setNote("Mensagem enviada! Obrigado pelo contato — retorno em breve.", "success");
      })
      .catch(function () {
        setNote("Não foi possível enviar agora. Tente novamente ou escreva para joel.ducatti@gmail.com.", "error");
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitLabel;
      });
  });
})();
