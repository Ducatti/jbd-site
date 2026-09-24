# jbd-site
Site estático de apresentação da JBD Desenvolvimento de Softwares

## Estrutura

```
index.html            página única (hero, serviços, sobre, processo, contato)
assets/css/styles.css estilos (paleta derivada do logotipo)
assets/js/main.js     menu mobile, animações e formulário (abre o e-mail via mailto)
assets/img/           logo recortado, favicon e banner otimizados
```

## Rodar localmente

```bash
python3 -m http.server 5173
```

Abra http://localhost:5173. Por ser 100% estático, pode ser publicado direto no
GitHub Pages, Netlify, Vercel ou qualquer hospedagem.
