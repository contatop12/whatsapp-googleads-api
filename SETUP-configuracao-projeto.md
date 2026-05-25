# Guia de configuração do projeto

**Sistema de Rastreamento WhatsApp → Google Ads**

---

## 1. Pré-requisitos

Antes de começar, você vai precisar criar contas e coletar credenciais nas seguintes plataformas:

| Plataforma | O que criar | Link |
|---|---|---|
| Supabase | Projeto novo | supabase.com |
| Google Ads | Conta de desenvolvedor + OAuth | developers.google.com/google-ads |
| Evolution API | Instância por cliente | Seu servidor Evolution |
| Sentry | Projeto FastAPI + projeto Next.js | sentry.io |
| Logfire | Projeto | logfire.pydantic.dev |
| Easypanel | 2 apps (backend + frontend) | Seu painel Easypanel |

---

## 2. Variáveis de ambiente

### 2.1 Backend — `backend/.env.example`

```env
# ─── Ambiente ───────────────────────────────────────────────
ENVIRONMENT=development
# Valores aceitos: development | production

# ─── Supabase ───────────────────────────────────────────────
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SERVICE_ROLE_KEY é usado pelo backend para operações administrativas
# Nunca expor no frontend

# ─── Google Ads API ─────────────────────────────────────────
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# O refresh token é gerado uma vez via OAuth flow (ver seção 4)

# ─── Evolution API ──────────────────────────────────────────
EVOLUTION_API_BASE_URL=https://sua-evolution-api.com
EVOLUTION_API_GLOBAL_KEY=sua-chave-global-aqui
# Cada tenant terá sua própria instância criada automaticamente
# O nome da instância será gerado como: tenant_{slug}
# Exemplo: tenant_cliente-abc

# ─── Geolocalização por IP ──────────────────────────────────
IPAPI_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
# Usar ip-api.com (gratuito até 1000 req/mês) ou ipinfo.io

# ─── Sentry ─────────────────────────────────────────────────
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX

# ─── Logfire (Pydantic) ─────────────────────────────────────
LOGFIRE_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx

# ─── Segurança ──────────────────────────────────────────────
SECRET_KEY=gere-uma-chave-aleatoria-de-64-caracteres-aqui
# Gerar com: python -c "import secrets; print(secrets.token_hex(32))"

# ─── CORS ───────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://seu-frontend.com
```

### 2.2 Frontend — `frontend/.env.example`

```env
# ─── Supabase ───────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Apenas a ANON_KEY vai para o frontend — nunca a SERVICE_ROLE_KEY

# ─── Backend ────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://seu-backend.com
# URL pública do seu backend FastAPI no Easypanel

# ─── Sentry ─────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
# DSN do projeto Next.js no Sentry (diferente do projeto FastAPI)
```

---

## 3. Configurando o Supabase

### 3.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Escolha a região mais próxima do Brasil (South America - São Paulo)
3. Anote a senha do banco — você vai precisar dela para conexões diretas

### 3.2 Coletar as credenciais

No painel do Supabase:
- `SUPABASE_URL`: Settings → API → Project URL
- `SUPABASE_ANON_KEY`: Settings → API → Project API keys → anon public
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → Project API keys → service_role (secret)

### 3.3 Rodar as migrations

Execute os arquivos SQL na pasta `supabase/migrations/` em ordem, via Supabase SQL Editor:

```
001_tenants.sql
002_users.sql
003_leads.sql
004_conversions.sql
005_rls_policies.sql
```

### 3.4 Criar o primeiro usuário admin

No Supabase → Authentication → Users → Invite user  
Depois no SQL Editor:

```sql
INSERT INTO users (id, tenant_id, role, name)
VALUES (
  'UUID_DO_USUARIO_CRIADO',
  null,  -- admin não precisa de tenant
  'admin',
  'Seu Nome'
);
```

---

## 4. Configurando o Google Ads API

### 4.1 Criar conta de desenvolvedor

1. Acesse [developers.google.com/google-ads/api/docs/get-started/dev-token](https://developers.google.com/google-ads/api/docs/get-started/dev-token)
2. Solicite um Developer Token (conta MCC necessária)
3. Em ambiente de teste, o token funciona com status "Test Account"

### 4.2 Criar credenciais OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto novo
3. Ative a API: Google Ads API
4. Credenciais → Criar credenciais → ID do cliente OAuth
5. Tipo: Aplicativo da Web
6. Anote `CLIENT_ID` e `CLIENT_SECRET`

### 4.3 Gerar o Refresh Token

Execute o script abaixo uma única vez para obter o `REFRESH_TOKEN`:

```python
# scripts/get_google_ads_token.py
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_ID = "seu-client-id"
CLIENT_SECRET = "seu-client-secret"

flow = InstalledAppFlow.from_client_config(
    {
        "installed": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    },
    scopes=["https://www.googleapis.com/auth/adwords"],
)

credentials = flow.run_local_server(port=8080)
print(f"REFRESH_TOKEN={credentials.refresh_token}")
```

```bash
pip install google-auth-oauthlib
python scripts/get_google_ads_token.py
```

### 4.4 Criar as conversões no Google Ads

Para cada cliente, criar 3 conversões no painel do Google Ads:

1. Google Ads → Ferramentas → Conversões → Nova conversão
2. Tipo: **Importar** → **CRMs, arquivos ou outros feeds de dados** → **Rastreamento de cliques**
3. Criar uma conversão para cada etapa:
   - `whatsapp_novo_lead` — categoria: Lead, valor: sem valor, contagem: Uma
   - `whatsapp_qualificado` — categoria: Lead qualificado, valor: fixo (configurar), contagem: Uma
   - `whatsapp_convertido` — categoria: Compra, valor: variável, contagem: Uma

Anotar o nome exato de cada conversão para cadastrar no dashboard do tenant.

---

## 5. Configurando o Sentry

### 5.1 Criar dois projetos no Sentry

1. Acesse [sentry.io](https://sentry.io) e crie uma organização
2. Criar projeto → Plataforma: **FastAPI** → Nome: `backend-rastreamento`
3. Criar projeto → Plataforma: **Next.js** → Nome: `frontend-rastreamento`
4. Copiar o DSN de cada projeto para as respectivas variáveis de ambiente

### 5.2 Instalar no backend

```bash
pip install sentry-sdk[fastapi]
```

```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.2,       # 20% das requisições rastreadas
    profiles_sample_rate=0.1,
    environment=settings.ENVIRONMENT,
    send_default_pii=False,       # não enviar dados pessoais ao Sentry
)
```

### 5.3 Instalar no frontend

```bash
npx @sentry/wizard@latest -i nextjs
```

O wizard cria automaticamente os arquivos `sentry.client.config.ts` e `sentry.server.config.ts`.

### 5.4 Configurar alertas no Sentry

No painel do Sentry → Alerts → Create Alert Rule:

- **Alerta 1:** qualquer erro novo → notificação imediata por email
- **Alerta 2:** erro no webhook Evolution API → alta prioridade
- **Alerta 3:** erro na Google Ads API → alta prioridade + Slack (opcional)

---

## 6. Configurando o Logfire

### 6.1 Criar projeto

1. Acesse [logfire.pydantic.dev](https://logfire.pydantic.dev)
2. Crie um novo projeto: `rastreamento-backend`
3. Copie o token para `LOGFIRE_TOKEN`

### 6.2 Instalar e configurar

```bash
pip install logfire[fastapi]
```

```python
# backend/app/main.py
import logfire

logfire.configure(
    token=settings.LOGFIRE_TOKEN,
    service_name="rastreamento-backend",
    environment=settings.ENVIRONMENT,
)

logfire.instrument_fastapi(app)
logfire.instrument_httpx()  # rastreia chamadas HTTP externas (Google Ads API)
```

### 6.3 Adicionar logs nos pontos críticos

```python
# Exemplo em services/google_ads.py
import logfire

async def send_conversion(lead, stage, tenant):
    with logfire.span("google_ads.send_conversion", lead_id=str(lead.id), stage=stage):
        try:
            response = await google_ads_client.upload_conversion(...)
            logfire.info("conversion_sent", status=response.status, gclid=lead.gclid)
        except Exception as e:
            logfire.error("conversion_failed", error=str(e), gclid=lead.gclid)
            raise

# Exemplo em routers/webhooks.py
async def handle_evolution_webhook(slug: str, payload: dict):
    with logfire.span("webhook.evolution", tenant_slug=slug):
        logfire.info("webhook_received", event_type=payload.get("event"))
        # ... lógica do webhook
```

---

## 7. Dockerfiles

### 7.1 Backend — `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 7.2 Frontend — `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

Adicionar ao `next.config.js`:
```js
module.exports = {
  output: 'standalone',
}
```

---

## 8. Deploy no Easypanel

### 8.1 Criar os dois apps

1. No Easypanel → New Service → App
2. **App 1:** nome `rastreamento-backend` → Source: GitHub → repo → branch `main`
3. **App 2:** nome `rastreamento-frontend` → Source: GitHub → mesmo repo → branch `main`

### 8.2 Configurar Build Path

- Backend: Build context `/backend`, Dockerfile `backend/Dockerfile`
- Frontend: Build context `/frontend`, Dockerfile `frontend/Dockerfile`

### 8.3 Adicionar variáveis de ambiente

Para cada app no Easypanel → Environment:
- Copiar as variáveis do `.env.example` correspondente
- Preencher com os valores reais coletados nos passos anteriores

### 8.4 Configurar domínios

- Backend: `api.seudominio.com` → porta 8000
- Frontend: `app.seudominio.com` → porta 3000

### 8.5 Deploy automático

No Easypanel → cada app → Webhooks:
- Copiar a URL de webhook
- No GitHub → Settings → Webhooks → adicionar a URL
- Agora cada push na branch `main` dispara o deploy automaticamente

---

## 9. Configuração da Evolution API

### 9.1 Provisionamento automático de instâncias

O sistema cria e configura a instância automaticamente ao cadastrar um tenant. Você não precisa fazer nada manualmente pelo painel da Evolution API — o backend cuida de tudo.

O fluxo ao cadastrar um novo cliente:
1. Backend verifica se já existe uma instância com o nome `tenant_{slug}`
2. Se não existir: cria a instância via API
3. Configura o webhook apontando para o backend
4. Solicita o QR Code
5. Salva o QR (base64) no Supabase
6. Dashboard exibe o QR para o cliente escanear

### 9.2 Variáveis necessárias na Evolution API

No seu servidor Evolution API, verifique se as seguintes configurações estão habilitadas no `env` ou `docker-compose`:

```env
# No servidor da Evolution API
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=sua-chave-global-aqui   # mesma que EVOLUTION_API_GLOBAL_KEY no backend
WEBHOOK_GLOBAL_ENABLED=false                   # webhooks individuais por instância
```

### 9.3 Testando o provisionamento manualmente

Se quiser testar antes de integrar ao backend:

```bash
# 1. Criar instância
curl -X POST https://sua-evolution-api.com/instance/create \
  -H "apikey: SUA_CHAVE_GLOBAL" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "tenant_teste",
    "integration": "WHATSAPP-BAILEYS",
    "qrcode": true
  }'

# 2. Configurar webhook
curl -X POST https://sua-evolution-api.com/webhook/set/tenant_teste \
  -H "apikey: SUA_CHAVE_GLOBAL" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.seudominio.com/webhooks/evolution/teste",
    "webhook_by_events": true,
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
  }'

# 3. Obter QR Code
curl https://sua-evolution-api.com/instance/connect/tenant_teste \
  -H "apikey: SUA_CHAVE_GLOBAL"
# Resposta: { "base64": "data:image/png;base64,..." }

# 4. Verificar status
curl https://sua-evolution-api.com/instance/connectionState/tenant_teste \
  -H "apikey: SUA_CHAVE_GLOBAL"
# Resposta: { "state": "open" } quando conectado
```

### 9.4 Reconexão automática

Quando o WhatsApp desconectar, a Evolution API envia um webhook `CONNECTION_UPDATE` com `state: close`. O backend:

1. Atualiza o status do tenant para `disconnected` no Supabase
2. Chama automaticamente `GET /instance/connect/{instance}` para gerar novo QR
3. Salva o novo QR no banco
4. O dashboard detecta a mudança via Supabase Realtime e exibe o banner de reconexão
5. Dispara alerta no Sentry com nível `warning`

O cliente verá automaticamente o banner "WhatsApp desconectado — escaneie o QR para reconectar" sem precisar recarregar a página.

---

## 10. Checklist de validação pós-deploy

```
[ ] Supabase: migrations rodaram sem erro
[ ] Supabase: RLS ativo em todas as tabelas
[ ] Backend: GET https://api.seudominio.com/health retorna 200
[ ] Frontend: https://app.seudominio.com abre a tela de login
[ ] Login: usuário admin consegue autenticar
[ ] Tenant: ao cadastrar cliente, instância é criada automaticamente na Evolution API
[ ] QR Code: aparece na tela de configurações do tenant em menos de 5 segundos
[ ] WhatsApp: após escanear QR, status muda para verde sem recarregar a página
[ ] Reconexão: ao desconectar o WhatsApp, novo QR aparece automaticamente no dashboard
[ ] Webhook: Evolution API envia mensagem de teste e aparece no dashboard
[ ] Etapa 1: lead criado automaticamente ao receber mensagem
[ ] Etapa 2: arraste com gmail preenche e dispara
[ ] Etapa 3: modal de valor aparece, lead move e dispara
[ ] Google Ads: conversão aparece com status PENDING no diagnóstico
[ ] Sentry: erro de teste capturado e aparece no painel
[ ] Sentry: alerta de WhatsApp desconectado aparece como warning
[ ] Logfire: logs de webhook visíveis no painel
[ ] Deploy automático: push no GitHub disparou novo deploy
```
