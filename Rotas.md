# Rotas da API — whatsapp-googleads-api

**Base URL produção:** `https://python-auto-whatsapp-googleads-api.SEU_DOMINIO.easypanel.host`
**Base URL local:** `http://localhost:8000`

---

## Público (sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Health check básico (usado pelo EasyPanel) |
| GET | `/health` | Status detalhado da API e configurações |
| POST | `/api/track` | Registra lead vindo do site (snippet JS) |
| POST | `/webhooks/evolution/{slug}` | Recebe eventos do WhatsApp via Evolution API |

### POST `/api/track`
```json
{
  "phone": "5511999999999",
  "tenant_id": "uuid-do-tenant",
  "gclid": "Cj0KCQ...",
  "page_url": "https://seusite.com/pagina",
  "referrer": "https://google.com"
}
```

---

## Protegido (Bearer token Supabase no header `Authorization`)

### Leads

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/leads?tenant_id={uuid}` | Lista leads do tenant |
| GET | `/api/leads/{lead_id}` | Detalhes de um lead |
| PATCH | `/api/leads/{lead_id}` | Atualiza dados do lead |
| POST | `/api/leads/{lead_id}/move` | Move lead de estágio (1→2→3) |

### Tenants

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/tenants` | Lista tenants (admin: todos; user: só o seu) |
| GET | `/api/tenants/{tenant_id}` | Detalhes do tenant |
| POST | `/api/tenants` | Cria tenant **(admin only)** |
| PATCH | `/api/tenants/{tenant_id}` | Atualiza tenant |

### WhatsApp

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/tenants/{tenant_id}/whatsapp/qr` | QR code para conectar WhatsApp |
| GET | `/api/tenants/{tenant_id}/whatsapp/status` | Status da conexão WhatsApp |

---

## Debug (admin only)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/debug/conversion` | Testa envio de conversão ao Google Ads |
| POST | `/debug/sentry-test` | Dispara evento de teste no Sentry |
| GET | `/sentry-debug` | Gera erro 500 intencional (só fora de production) |

---

## Documentação interativa

| URL | Descrição |
|-----|-----------|
| `/docs` | Swagger UI — testa rotas no browser |
| `/redoc` | ReDoc — documentação legível |
| `/openapi.json` | Schema OpenAPI raw |
