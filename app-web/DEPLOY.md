# Deploy — Família Finanças Web

Site estático (Expo Web export) servido por **nginx**, atrás do **Traefik** com HTTPS.
Domínio: **https://webfinancas.locapocos.com.br**

O fluxo tem dois lados: você builda e sobe o código **na máquina de dev**, e depois
puxa e sobe o container **no servidor**.

---

## 1. No dev (aqui) — buildar e subir o código

> PowerShell, na pasta `app-web`.

Se você mexeu no código-fonte (`src/`, `App.js`, etc.), primeiro **regere o build**
estático — é o `dist/` que vai pra dentro da imagem Docker:

```powershell
npx expo export --platform web
```

Depois commita tudo (incluindo o `dist/` atualizado) e sobe pro Git:

```powershell
git add .
git commit -m "fix: doc de deploy e ist novo"
git push
```

> ⚠️ O `dist/` **é versionado** de propósito: o servidor não roda `expo export`,
> ele só usa o `dist/` que veio no `git pull`. Se esquecer de rebuildar, o site
> no ar continua com a versão antiga mesmo depois do deploy.

---

## 2. No servidor — puxar e subir o container

> Via SSH, na pasta do projeto.

```bash
cd /opt/AppFinancas/AppFinancas-web
git pull
cd app-web                      # o docker-compose.yml fica AQUI, não na raiz do repo
docker compose up -d --build
```

> ⚠️ **Atenção ao diretório:** o `git pull` roda na raiz do repositório
> (`AppFinancas-web`), mas o `docker-compose.yml` / `Dockerfile` / `nginx.conf`
> ficam dentro de **`app-web/`**. Se você rodar `docker compose up` na raiz, ele
> não acha o compose ("no configuration file provided"), nenhum container sobe, e
> o Traefik passa a responder **404** no domínio. Sempre entre em `app-web/` antes.

O `--build` reconstrói a imagem nginx copiando o `dist/` novo. O Traefik detecta o
container pelos labels do `docker-compose.yml` e roteia o domínio com HTTPS
automático (certresolver `mytlschallenge`).

---

## Verificação

- **Health check:** `curl -I https://webfinancas.locapocos.com.br/health` → deve responder `200 ok`.
- **No navegador:** abrir https://webfinancas.locapocos.com.br e conferir se carrega
  (login, ícones/setas renderizando, etc.).
- **Logs do container** (se algo falhar):
  ```bash
  docker compose logs -f appfinancas-web
  ```

---

## Notas

- **Só o `app-web`** é servido aqui. O backend (API) e o app mobile são projetos separados.
- O front consome a API em `https://apifinancas.locapocos.com.br/api` (definido em
  `src/services/api.js` e já embutido no bundle).
- Se o navegador mostrar versão antiga após o deploy, force um *hard refresh*
  (Ctrl+Shift+R) — o `index.html` é servido com `no-store`, mas o cache do browser
  para JS/CSS pode segurar. Cada build gera um nome de arquivo JS novo (hash), então
  normalmente o refresh resolve.
