# Configuração Sentry — whatsapp-googleads-api

Organização detectada no token MCP: **p12digital** (região US).

## 1. Conectar o MCP no Cursor

O arquivo `.cursor/mcp.json` já aponta para:

```
https://mcp.sentry.dev/mcp/p12digital
```

1. Abra **Cursor Settings → MCP** (ou `/mcp`).
2. Ative o servidor **sentry** e conclua o login OAuth com a conta da org `p12digital`.
3. Após conectar, peça ao agente: *"Liste os projetos da org p12digital"* ou *"Crie o projeto whatsapp-googleads-api com platform python-fastapi"*.

> O valor `SENTRY_AUTH_TOKEN` no `.env` é um token de escopo `org:ci` (MCP/CI). Ele **não** cria projetos via API REST e **não** é o DSN.

## 2. Criar o projeto no Sentry (UI)

Se preferir pela interface:

1. Acesse [https://p12digital.sentry.io](https://p12digital.sentry.io) (ou [sentry.io](https://sentry.io) → org **p12digital**).
2. **Create Project** → plataforma **FastAPI** (ou Python).
3. Nome sugerido: `whatsapp-googleads-api` (backend) e depois `whatsapp-googleads-web` (frontend Next.js, quando existir).

## 3. Copiar o Client Key (DSN)

No projeto criado:

**Settings → Client Keys (DSN)** → copie o DSN público, por exemplo:

```
https://xxxxxxxx@o000000.ingest.us.sentry.io/000000
```

Cole no `.env` na raiz:

```env
SENTRY_DSN=https://...
```

## 4. Validar no backend

```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

- `GET http://localhost:8000/health` → `"sentry": true` em `configured`
- `POST http://localhost:8000/debug/sentry-test` (com JWT admin) → envia evento de teste

No painel Sentry: **Issues** deve aparecer *"Sentry test event — whatsapp-googleads-api backend"*.

## 5. Deploy (Easypanel)

Defina as mesmas variáveis no painel do serviço:

| Variável | Obrigatório |
|----------|-------------|
| `SENTRY_DSN` | Sim |
| `ENVIRONMENT` | Sim (`production`) |
| `SENTRY_RELEASE` | Opcional (versão do deploy) |

## Referência PRD

Monitoramento §9: erros de webhook Evolution, Google Ads `REJECTED`, desconexão WhatsApp — já usam `sentry_sdk` nos serviços quando o DSN está configurado.
