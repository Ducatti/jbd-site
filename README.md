# jbd-site
Site estático de apresentação da JBD Desenvolvimento de Softwares

## Estrutura

```
index.html            página única (hero, serviços, sobre, processo, contato)
obrigado.html         página exibida após envio do formulário sem JavaScript
404.html              página de erro do Netlify
netlify.toml          configuração de publicação e cabeçalhos de segurança
assets/css/styles.css estilos (paleta derivada do logotipo)
assets/js/main.js     menu mobile, animações e envio do formulário (Netlify Forms)
assets/img/           logo recortado, favicon e banner otimizados
```

## Rodar localmente

```bash
python3 -m http.server 5173
```

Abra http://localhost:5173. O envio do formulário só funciona publicado no
Netlify (localmente, a mensagem de erro é esperada).

## Publicação (Netlify)

1. No Netlify: *Add new project → Import an existing project* e escolha este repositório.
   Não há comando de build; o `netlify.toml` já publica a raiz.
2. Em *Project configuration → Forms*, ative a detecção de formulários e faça um novo deploy.
3. Em *Forms → Form notifications*, adicione uma notificação por e-mail para o formulário `contato`.
