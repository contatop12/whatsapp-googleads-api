# PRD — Sistema de Rastreamento WhatsApp → Google Ads

**Versão:** 1.1  
**Data:** Maio 2026  
**Status:** Escopo fechado — pronto para desenvolvimento

---

## 1. Visão geral

Sistema multi-tenant de rastreamento avançado de conversões para Google Ads, integrado ao WhatsApp via Evolution API. O produto permite que agências de marketing digital monitorem a jornada completa do lead — desde o clique no anúncio até a conversão final — com um pipeline visual kanban por cliente, disparo automático de eventos para o Google Ads Offline Conversion API e dashboard analítico com edição de dados.

### Objetivo principal

Fechar o gap de atribuição entre campanhas do Google Ads e conversões que acontecem fora do site (dentro do WhatsApp), enviando dados precisos de volta ao Google para otimização de campanhas via Smart Bidding.

### Público-alvo

- Fase 1 (MVP): clientes internos da agência
- Fase 2 (SaaS): produto vendido para outras agências e anunciantes

---

## 2. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS + Shadcn/ui | Visual profissional, base React, ideal para SaaS |
| Backend | FastAPI (Python 3.11+) | Performance, tipagem, integração nativa com Pydantic e Logfire |
| Banco de dados | Supabase (PostgreSQL) | Postgres + Auth + RLS multi-tenant em um único serviço |
| Autenticação | Supabase Auth | JWT, sessões, controle de roles nativo |
| Isolamento de dados | Supabase Row Level Security (RLS) | Garante que cliente A nunca acesse dados do cliente B |
| Webhooks WhatsApp | Evolution API | Captura eventos de mensagens em tempo real |
| Conversões | Google Ads Offline Conversion API | Envio server-side de conversões vinculadas ao gclid |
| Monitoramento de erros | Sentry | Captura exceptions com stack trace no FastAPI e Next.js |
| Logs estruturados | Logfire (Pydantic) | Observabilidade nativa para FastAPI |
| Hospedagem | Easypanel (VPS) | Docker via GitHub para frontend e backend |
| CI/CD | GitHub → Dockerfile → Easypanel | Deploy automático por push |

---

## 3. Arquitetura do sistema

```
[Google Ads]
     │ gclid via URL
     ▼
[Site do cliente]
  - Captura gclid da URL
  - Captura geolocalização por IP
  - Botão/link WhatsApp
     │ POST /api/track (gclid + telefone + geo)
     ▼
[Backend FastAPI — Easypanel]
  - Salva lead no Supabase
  - Associa gclid ao número de telefone
     │
     ├──────────────────────────────────────┐
     │                                      │
     ▼                                      ▼
[Evolution API Webhook]           [Dashboard Next.js]
  - Evento: nova mensagem           - Kanban pipeline
  - Evento: palavra-chave           - Edição de leads
     │                              - Configurações por tenant
     ▼
[Classificador de etapas — FastAPI]
  - Etapa 1: primeira mensagem recebida
  - Etapa 2: vendedor arrasta ou palavra-chave (gmail coletado)
  - Etapa 3: vendedor arrasta com valor informado
     │
     ▼
[Google Ads Offline Conversion API]
  - Envia: gclid + conversion_name + value + timestamp
  - Anti-duplicação: etapa só avança, nunca retrocede após disparo
```

---

## 4. Modelo de dados (Supabase / PostgreSQL)

### 4.1 Tabela: `tenants`

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  google_ads_customer_id TEXT,
  google_ads_conversion_new_lead TEXT,        -- nome da conversão etapa 1
  google_ads_conversion_qualified TEXT,       -- nome da conversão etapa 2
  google_ads_conversion_converted TEXT,       -- nome da conversão etapa 3
  conversion_value_qualified NUMERIC(10,2),   -- valor fixo etapa 2 (palavra-chave)
  conversion_value_converted NUMERIC(10,2),   -- valor fixo etapa 3 (palavra-chave)
  evolution_api_instance TEXT,
  evolution_api_key TEXT,
  evolution_instance_status TEXT DEFAULT 'disconnected', -- disconnected | connecting | connected
  evolution_qr_code TEXT,                     -- QR code base64 para exibir no dashboard
  evolution_qr_expires_at TIMESTAMPTZ,        -- expiração do QR (normalmente 60s)
  keywords_qualified TEXT[],                  -- palavras-chave para etapa 2
  keywords_converted TEXT[],                  -- palavras-chave para etapa 3
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Tabela: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role TEXT CHECK (role IN ('admin', 'client')) DEFAULT 'client',
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Tabela: `leads`

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  gclid TEXT,
  ip TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  stage INTEGER DEFAULT 1 CHECK (stage IN (1, 2, 3)),
  conversion_value NUMERIC(10,2),
  first_message_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4 Tabela: `conversions`

```sql
CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  stage INTEGER NOT NULL,
  gclid TEXT NOT NULL,
  conversion_name TEXT NOT NULL,
  conversion_value NUMERIC(10,2),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  google_ads_status TEXT DEFAULT 'pending',   -- pending | accepted | rejected
  google_ads_response JSONB,
  triggered_by TEXT CHECK (triggered_by IN ('auto', 'manual'))
);
```

### 4.5 Row Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Política: usuário só acessa dados do seu tenant
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY tenant_isolation ON conversions
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));
```

---

## 5. Pipeline de etapas

### 5.1 Etapa 1 — Novo Lead (Secundária)

**Gatilho:** primeira mensagem recebida do número no WhatsApp  
**Campos preenchidos automaticamente:** telefone, nome do número, geolocalização por IP, gclid  
**Disparo Google Ads:** conversão secundária (sem valor)  
**Regra anti-duplicação:** só dispara se o lead ainda não existir no banco para aquele tenant

### 5.2 Etapa 2 — Qualificado (Primária · valor baixo)

**Gatilho:**
- Automático: palavra-chave detectada na conversa (configurável por tenant)
- Manual: vendedor arrasta o card no kanban

**Campos obrigatórios para avançar:**
- Nome ✱
- Telefone ✱ (já preenchido, mas deve ser confirmado)
- Gmail ✱ (campo novo — obrigatório)

**Campos opcionais:** geolocalização (coletada automaticamente por IP), endereço

**Disparo Google Ads:** conversão primária com valor fixo configurado no tenant  
**Bloqueio de retorno:** após disparo da etapa 2, o lead não pode voltar para etapa 1

### 5.3 Etapa 3 — Convertido (Primária · alto valor)

**Gatilho:**
- Automático: palavra-chave detectada (configurável por tenant)
- Manual: vendedor arrasta o card — modal abre solicitando o valor do negócio

**Campos obrigatórios para avançar:**
- Todos os campos da etapa 2 (nome, telefone, gmail) ✱
- Valor do lead em R$ ✱
  - Se automático (palavra-chave): usa valor fixo configurado no tenant
  - Se manual (arraste): vendedor informa o valor no modal

**Bloqueio total de retorno:** após disparo da etapa 3, o card fica travado — nenhum retorno permitido pois a conversão primária de alto valor já foi enviada ao Google Ads e não pode ser desfeita

### 5.4 Regras de progressão — resumo

| Movimento | Permitido | Condição |
|---|---|---|
| 1 → 2 | Sim | Nome + telefone + gmail preenchidos |
| 2 → 3 | Sim | Todos os campos da etapa 2 + valor |
| 1 → 3 | Bloqueado | Deve passar pela etapa 2 |
| 3 → 2 | Bloqueado | Conversão já disparada — irreversível |
| 2 → 1 | Bloqueado | Conversão já disparada — irreversível |

---

## 6. Integração Google Ads

### 6.1 Método utilizado

Google Ads **Offline Conversion Import** via API server-side. Nenhum pixel ou tag no navegador é necessário para as etapas 2 e 3 — o disparo é feito diretamente do backend FastAPI para a Google Ads API usando o `gclid` capturado no momento do clique no site.

### 6.2 Fluxo de captura do gclid

```
1. Lead clica no anúncio do Google → URL do site recebe ?gclid=XXXX
2. Snippet JS no site captura o gclid da URL
3. Ao clicar no botão WhatsApp, o site faz POST para /api/track com:
   - gclid
   - telefone (extraído do link wa.me/55...)
   - ip (resolvido pelo backend)
   - geolocalização por IP (via biblioteca ip-api ou similar)
4. Backend salva o lead com gclid associado ao telefone
```

### 6.3 Snippet JS para o site do cliente

```javascript
// Adicionar antes do fechamento do </body>
(function() {
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  const gclid = getParam('gclid');
  if (gclid) {
    sessionStorage.setItem('gclid', gclid);
  }

  document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const storedGclid = sessionStorage.getItem('gclid');
      const phone = (btn.href.match(/wa\.me\/(\d+)/) || [])[1];

      fetch('https://SEU_BACKEND/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gclid: storedGclid || null,
          phone: phone,
          tenant_id: 'TENANT_ID_DO_CLIENTE',
          page_url: window.location.href,
          referrer: document.referrer
        })
      });
    });
  });
})();
```

### 6.4 Payload de envio para Google Ads API

```python
# Exemplo de payload por etapa
{
  "conversions": [{
    "gclid": "GCLID_CAPTURADO",
    "conversion_action": "customers/CUSTOMER_ID/conversionActions/CONVERSION_ID",
    "conversion_date_time": "2026-05-01 10:30:00+03:00",
    "conversion_value": 500.00,
    "currency_code": "BRL"
  }]
}
```

### 6.5 Como testar as conversões

**Passo 1 — Validar captura do gclid no site:**
- Instalar extensão Google Tag Assistant no Chrome
- Acessar o site via um link com `?gclid=test123`
- Verificar no console do browser que o gclid foi salvo no sessionStorage

**Passo 2 — Testar envio ao backend:**
- Usar o endpoint de debug: `POST /debug/conversion`
- Enviar payload com `gclid` de teste e `dry_run: true`
- O backend valida o payload mas não envia ao Google Ads

**Passo 3 — Validar no painel Google Ads:**
- Acessar Google Ads → Ferramentas → Conversões
- Selecionar a conversão → Diagnóstico
- Status esperados: `ACCEPTED` (processado), `PENDING` (aguardando, até 24h), `REJECTED` (erro no gclid ou payload)

**Passo 4 — Teste end-to-end:**
- Criar campanha de teste no Google Ads
- Clicar no anúncio (gera gclid real)
- Enviar mensagem no WhatsApp
- Verificar no dashboard se o lead apareceu na etapa 1
- Arrastar para etapa 2 e 3
- Aguardar até 24h e conferir no painel Google Ads

---

## 7. Integração Evolution API

### 7.1 Ciclo de vida da instância por tenant

Ao cadastrar um novo tenant, o backend executa automaticamente o fluxo de provisionamento da instância:

```
Cadastro do tenant
       │
       ▼
Verificar se instância já existe na Evolution API
       │
  ┌────┴────┐
  │         │
Existe    Não existe
  │         │
  │         ▼
  │    Criar instância via API
  │    POST /instance/create
  │         │
  └────┬────┘
       │
       ▼
Configurar webhook da instância
POST /webhook/set/{instance}
       │
       ▼
Solicitar QR Code
GET /instance/connect/{instance}
       │
       ▼
Salvar QR (base64) + status 'connecting' no banco
       │
       ▼
Exibir QR Code no dashboard para o cliente escanear
       │
       ▼
Webhook CONNECTION_UPDATE recebido → status 'connected'
       │
       ▼
Instância ativa — webhooks de mensagens habilitados
```

### 7.2 Endpoints Evolution API utilizados

| Ação | Método | Endpoint |
|---|---|---|
| Verificar se instância existe | GET | `/instance/fetchInstances` |
| Criar instância | POST | `/instance/create` |
| Conectar / gerar QR | GET | `/instance/connect/{instance}` |
| Configurar webhook | POST | `/webhook/set/{instance}` |
| Verificar status | GET | `/instance/connectionState/{instance}` |
| Deletar instância | DELETE | `/instance/delete/{instance}` |

### 7.3 Fluxo de criação automática de instância

```python
# services/evolution.py — pseudocódigo

async def provision_instance(tenant: Tenant) -> dict:
    instance_name = f"tenant_{tenant.slug}"

    # 1. Verificar se já existe
    existing = await evolution_get(f"/instance/fetchInstances")
    instance_exists = any(i["instance"]["instanceName"] == instance_name for i in existing)

    if not instance_exists:
        # 2. Criar instância nova
        await evolution_post("/instance/create", {
            "instanceName": instance_name,
            "integration": "WHATSAPP-BAILEYS",
            "qrcode": True,
        })

    # 3. Configurar webhook
    webhook_url = f"{settings.BACKEND_URL}/webhooks/evolution/{tenant.slug}"
    await evolution_post(f"/webhook/set/{instance_name}", {
        "url": webhook_url,
        "webhook_by_events": True,
        "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
    })

    # 4. Solicitar QR Code
    qr_response = await evolution_get(f"/instance/connect/{instance_name}")

    # 5. Salvar no banco
    await update_tenant(tenant.id, {
        "evolution_api_instance": instance_name,
        "evolution_instance_status": "connecting",
        "evolution_qr_code": qr_response.get("base64"),
        "evolution_qr_expires_at": now() + timedelta(seconds=60),
    })

    return qr_response
```

### 7.4 QR Code no dashboard

- Ao acessar Configurações → WhatsApp, o dashboard chama `GET /api/tenants/{id}/whatsapp/qr`
- O backend verifica se o QR está válido (não expirado) — se sim, retorna o base64
- Se expirado, solicita novo QR à Evolution API antes de retornar
- O frontend exibe o QR Code como imagem com polling a cada 5 segundos para verificar se conectou
- Ao receber `CONNECTION_UPDATE` com status `open` no webhook, o backend atualiza o status para `connected` e o frontend exibe confirmação em tempo real via Supabase Realtime

### 7.5 Reconexão automática

Quando a Evolution API envia `CONNECTION_UPDATE` com status `close` (WhatsApp desconectado):

```python
async def handle_connection_update(tenant_slug: str, payload: dict):
    status = payload.get("state")  # "open" | "close" | "connecting"

    if status == "open":
        await update_tenant_status(tenant_slug, "connected")

    elif status == "close":
        await update_tenant_status(tenant_slug, "disconnected")

        # 1. Tentar reconexão automática (gera novo QR)
        await provision_instance(tenant)

        # 2. Notificar admin via Sentry + log
        sentry_sdk.capture_message(
            f"WhatsApp desconectado: tenant {tenant_slug}",
            level="warning"
        )
        logfire.warn("whatsapp_disconnected", tenant=tenant_slug)

        # 3. Exibir banner de alerta no dashboard do cliente
        # (via Supabase Realtime — o frontend escuta mudanças na tabela tenants)
```

### 7.6 Estados da instância no dashboard

| Status | Badge | Ação disponível |
|---|---|---|
| `disconnected` | Vermelho | Botão "Conectar" — exibe QR |
| `connecting` | Amarelo | QR Code visível — aguardando scan |
| `connected` | Verde | Botão "Ver status" — número conectado |

### 7.7 Configuração do webhook por tenant

Cada tenant terá uma URL de webhook única, configurada automaticamente no provisionamento:

```
POST https://SEU_BACKEND/webhooks/evolution/{tenant_slug}
```

Eventos monitorados:
- `MESSAGES_UPSERT` — nova mensagem recebida (classificação de etapas)
- `CONNECTION_UPDATE` — mudança de status da conexão (reconexão automática)
- `QRCODE_UPDATED` — novo QR gerado (atualizar no dashboard)

### 7.8 Lógica de classificação por palavras-chave

```python
# Pseudocódigo do classificador
def classify_message(message: str, tenant: Tenant, lead: Lead) -> int | None:
    text = message.lower().strip()

    # Só avança — nunca retrocede
    if lead.stage == 1:
        for keyword in tenant.keywords_qualified:
            if keyword.lower() in text:
                return 2  # avança para qualificado

    if lead.stage == 2:
        for keyword in tenant.keywords_converted:
            if keyword.lower() in text:
                return 3  # avança para convertido

    return None  # sem mudança de etapa
```

---

## 8. Dashboard — especificação funcional

### 8.1 Telas principais

**Login**
- Autenticação via Supabase Auth (email + senha)
- Cada cliente acessa apenas seus dados (RLS)
- Role `admin` acessa todos os tenants

**Pipeline (Kanban)**
- 3 colunas: Novo Lead / Qualificado / Convertido
- Cards de lead com: nome, telefone, cidade, tempo na etapa
- Drag and drop entre colunas
- Modal de validação ao arrastar — bloqueia se campos obrigatórios estiverem vazios
- Modal de valor ao arrastar para etapa 3 (manual)

**Detalhe do lead**
- Todos os dados coletados
- Campos editáveis: nome, telefone, gmail, endereço
- Campos somente leitura: gclid, IP, geolocalização automática, timestamps
- Histórico de etapas com timestamps

**Configurações do tenant**
- Credenciais Google Ads (customer_id, conversion names)
- WhatsApp — painel de conexão da instância Evolution API:
  - Status da conexão com badge colorido
  - QR Code para escanear (polling automático até conectar)
  - Botão de reconexão manual
  - Número conectado exibido quando ativo
- Palavras-chave por etapa
- Valor fixo de conversão por etapa (para disparos automáticos)

**Relatórios**
- Total de leads por etapa
- Taxa de conversão etapa 1 → 2 → 3
- Leads por origem geográfica
- Timeline de conversões

### 8.2 Roles e permissões

| Ação | Admin | Client |
|---|---|---|
| Ver leads de qualquer tenant | Sim | Não |
| Editar configurações do tenant | Sim | Sim (próprio) |
| Criar novos tenants | Sim | Não |
| Ver relatórios | Sim | Sim (próprio) |
| Mover leads no kanban | Sim | Sim (próprio) |

---

## 9. Monitoramento e observabilidade

### 9.1 Sentry

- Captura automática de exceptions no FastAPI e Next.js
- Alertas por email em erros críticos (webhook falhou, Google Ads rejeitou conversão)
- Integração: `pip install sentry-sdk[fastapi]`

```python
# main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.2,
    environment=settings.ENVIRONMENT
)
```

### 9.2 Logfire (Pydantic)

- Logs estruturados de cada requisição
- Rastreamento de webhooks recebidos
- Rastreamento de chamadas para Google Ads API
- Dashboard visual em logfire.pydantic.dev

```python
# main.py
import logfire

logfire.configure(token=settings.LOGFIRE_TOKEN)
logfire.instrument_fastapi(app)
```

### 9.3 Alertas críticos monitorados

| Evento | Ação |
|---|---|
| Webhook Evolution API não processado | Alerta Sentry + log Logfire |
| WhatsApp desconectado (CONNECTION_UPDATE close) | Alerta Sentry warning + reconexão automática + banner no dashboard |
| QR Code expirou sem scan | Log Logfire + novo QR gerado automaticamente |
| Google Ads retornou REJECTED | Alerta Sentry + status na tabela conversions |
| Lead sem gclid tentou avançar para etapa 2 | Log de warning no Logfire |
| Erro de autenticação Supabase | Alerta Sentry |

---

## 10. Estrutura de repositório

```
/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   │   ├── lead.py
│   │   │   ├── tenant.py
│   │   │   └── conversion.py
│   │   ├── routers/
│   │   │   ├── track.py          # POST /api/track
│   │   │   ├── webhooks.py       # POST /webhooks/evolution/{slug}
│   │   │   ├── leads.py          # CRUD leads
│   │   │   ├── tenants.py        # CRUD tenants
│   │   │   ├── whatsapp.py       # GET /api/tenants/{id}/whatsapp/qr + status
│   │   │   └── debug.py          # GET /debug/conversion
│   │   ├── services/
│   │   │   ├── google_ads.py     # Offline Conversion API
│   │   │   ├── evolution.py      # Criação, conexão e reconexão de instâncias
│   │   │   ├── classifier.py     # Classificador de palavras-chave
│   │   │   ├── geolocation.py    # Resolução de IP → geo
│   │   │   └── pipeline.py       # Regras de progressão de etapas
│   │   └── middleware/
│   │       └── tenant.py         # Extrai tenant do JWT
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── pipeline/
│   │   │   ├── leads/[id]/
│   │   │   ├── settings/
│   │   │   │   ├── whatsapp/     # QR Code + status da instância
│   │   │   │   ├── google-ads/
│   │   │   │   └── keywords/
│   │   │   └── reports/
│   ├── components/
│   │   ├── kanban/
│   │   ├── lead-card/
│   │   ├── whatsapp-qr/          # Componente QR com polling
│   │   └── modals/
│   ├── Dockerfile
│   └── .env.example
│
└── supabase/
    └── migrations/
        ├── 001_tenants.sql
        ├── 002_users.sql
        ├── 003_leads.sql
        ├── 004_conversions.sql
        └── 005_rls_policies.sql
```

---

## 11. Roadmap de fases

### Fase 1 — MVP (uso interno)

- [ ] Setup Supabase: tabelas + RLS + Auth
- [ ] Backend FastAPI: endpoint `/api/track` + webhook Evolution API
- [ ] Serviço Evolution API: criação/conexão automática de instância
- [ ] Dashboard: tela de QR Code com polling e reconexão automática
- [ ] Classificador de etapas + anti-duplicação
- [ ] Integração Google Ads Offline Conversion API
- [ ] Dashboard: login + kanban + edição de lead
- [ ] Sentry + Logfire configurados (incluindo alertas de desconexão WhatsApp)
- [ ] Deploy no Easypanel via Dockerfile
- [ ] Testes end-to-end com gclid real

### Fase 2 — SaaS

- [ ] Onboarding self-service (cadastro de tenant sem admin)
- [ ] Planos e billing (Stripe)
- [ ] Subdomínio por cliente
- [ ] Relatórios avançados com exportação CSV
- [ ] Notificações por email ao avançar etapa
- [ ] API pública para integrações externas

---

## 12. Decisões em aberto

Nenhuma — escopo totalmente fechado para o MVP.
