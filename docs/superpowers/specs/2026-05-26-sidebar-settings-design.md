# Design: Menu Lateral Responsivo + Tela de Configurações

**Data:** 2026-05-26  
**Status:** Aprovado

---

## 1. Objetivo

Implementar sidebar responsiva com colapso, active state, badge de status WhatsApp em tempo real e navegação mobile. Adicionar tela `/settings` com sub-navegação para conta de usuário (perfil, senha, notificações, organização, usuários). Migrar accent de emerald para `#7F77DD` em todo o projeto.

---

## 2. Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Cor accent | `#7F77DD` (royal blue) em todo o projeto | Substituição total de emerald |
| Arquitetura sidebar | Server layout → AuthProvider (Client) → Sidebar (Client) | Sem props drilling, hook usePermissions funciona naturalmente |
| Rotas settings | `/settings/*` para tudo | Manter estrutura existente, adicionar novas abas |
| Delete account | Placeholder LGPD Phase 2 | Não implementado agora, necessário para compliance |

---

## 3. Sistema de Cores

### globals.css
```css
--accent: #7F77DD;
--accent-dim: #6B63CC;
--accent-light: #A09AE8;
--accent-glow: rgba(127, 119, 221, 0.15);
```
Remover variáveis emerald (`--accent` antiga). Manter `--amber` e `--blue` como estão.

### tailwind.config.js
```js
extend: {
  colors: {
    accent: {
      DEFAULT: '#7F77DD',
      dim: '#6B63CC',
      light: '#A09AE8',
    }
  }
}
```

### Padrão de item de menu
- Normal: `text-zinc-400`
- Hover: `text-zinc-100 bg-zinc-800`
- Ativo: `border-l-2 border-accent bg-zinc-800/60 text-zinc-100` + ícone `text-accent`

### Badges de role
- `super_admin` → `amber`
- `admin` → accent (`#7F77DD`)
- `client` → `emerald`

### WhatsApp badge
- `connected` → `bg-emerald-500`
- `connecting` → `bg-amber-500 animate-pulse`
- `disconnected` → `bg-red-500`

---

## 4. Arquitetura

### Fluxo de dados
```
app/(dashboard)/layout.tsx     [Server Component]
  → busca auth.getUser() + getUserProfile()
  → passa { id, email, name, role, tenant_id } para:

contexts/auth-context.tsx      [Client Component — AuthProvider]
  → expõe useAuth() com user completo
  → expõe usePermissions() derivado do role

components/layout/Sidebar.tsx  [Client Component]
  → consome useAuth()
  → consome usePathname() para active state
  → consome localStorage('sidebar_collapsed') para colapso
  → renderiza WhatsAppStatusBadge (Realtime interno)

components/layout/BottomNav.tsx  [Client Component — mobile]
  → consome useAuth()
  → consome usePathname()
  → Sheet Shadcn para itens secundários
```

### Arquivos a criar
```
frontend/
  contexts/
    auth-context.tsx
  hooks/
    usePermissions.ts
  components/
    layout/
      Sidebar.tsx
      BottomNav.tsx
      WhatsAppStatusBadge.tsx
    settings/
      SettingsNav.tsx
      ProfileForm.tsx
      PasswordForm.tsx
      NotificationsForm.tsx
      OrganizationForm.tsx
      UsersTable.tsx
      DeleteAccountSection.tsx
  app/(dashboard)/
    settings/
      layout.tsx          ← novo layout com SettingsNav
      profile/page.tsx
      password/page.tsx
      notifications/page.tsx
      organization/page.tsx
      users/page.tsx
      delete/page.tsx
      page.tsx            ← redirect para /settings/profile
```

### Arquivos a modificar
```
frontend/
  app/(dashboard)/layout.tsx        ← wrap com AuthProvider, remover sidebar inline
  app/globals.css                   ← migrar variáveis de cor
  tailwind.config.js                ← adicionar accent color
  components/ui/button.tsx          ← variante primary usar accent
  app/api/admin/invite/route.ts     ← aceitar role + tenant_id, permitir admin
```

---

## 5. Sidebar

### Estrutura de itens

```
[Logo]  [Collapse toggle]

── Principal ──
  Home              /home            todos
  Painel Admin      /admin           super_admin only
  Pipeline          /pipeline        todos

── Clientes ──
  Clientes          /admin/tenants   super_admin only
  WhatsApp          /settings/whatsapp   todos  [badge status]
  Google Ads        /settings/google-ads todos
  Palavras-chave    /settings/keywords   todos
  Sites permitidos  /settings/sites      todos

── Análise ──
  Relatórios        /reports         todos

── Conta ──
  Configurações     /settings/profile   todos

── Footer ──
  [Avatar iniciais] Nome  Badge(role)
  [Logout button]
```

### Colapso desktop
- Largura expandida: `w-56` (220px). Colapsada: `w-12` (48px)
- Estado persiste em `localStorage('sidebar_collapsed')`
- Colapsado: labels e seções somem, ícones com `Tooltip` Shadcn
- Transição: `transition-all duration-200`

### Active state
- `usePathname()` para detectar rota ativa
- Match por prefix: `/settings/*` ativa item "Configurações"
- Match exato para: Home, Pipeline, Relatórios, Painel Admin

### Mobile
- Sidebar: `hidden md:flex`
- BottomNav: `flex md:hidden` fixo no rodapé
- 4 ícones: Home, Pipeline, Configurações, `···`
- `···` → `Sheet` Shadcn slide-up com todos os itens secundários

---

## 6. Tela /settings

### Rota padrão
`/settings/page.tsx` faz `redirect('/settings/profile')`

### Layout settings
`app/(dashboard)/settings/layout.tsx` renderiza `SettingsNav` + `{children}` side-by-side. Em mobile, SettingsNav vira `<select>` no topo com `router.push()` onChange.

### Sub-navegação

```
── Conta (todos) ──
  Perfil            /settings/profile
  Senha             /settings/password
  Notificações      /settings/notifications

── Sistema (admin+) ──
  Organização       /settings/organization
  Usuários          /settings/users

── Perigo (todos) ──
  Deletar conta     /settings/delete
```

Proteção de rotas: pages de `organization` e `users` verificam `usePermissions().canManageUsers` e redirecionam `client` para `/settings/profile`.

### ProfileForm
- Campos: Nome (todos), Email (admin+ editável, client readonly + badge "Somente Admin"), Telefone (todos)
- Save: `supabase.from('users').update({ name, email, phone }).eq('id', userId)`
- Toast sucesso/erro via Shadcn

### PasswordForm
- Campos: Senha atual, Nova senha, Confirmar nova senha
- Validações inline: mínimo 8 chars, confirmação igual
- Flow: `supabase.auth.signInWithPassword(email, currentPassword)` → se ok: `supabase.auth.updateUser({ password: newPassword })`

### NotificationsForm
Toggles Shadcn `Switch`. Salvar em `users.notification_preferences` (JSONB):
```json
{
  "lead_stage_changed": true,
  "whatsapp_disconnected": true,
  "conversion_rejected": true,
  "new_lead": false
}
```
**Requer migration:** adicionar coluna `notification_preferences JSONB DEFAULT '{}'` na tabela `users`.

### OrganizationForm (admin+)
- Campos: Nome org (`tenants.name`), Slug (`tenants.slug` — super_admin only), Nome exibido
- Slug: desabilitado para `admin`, editável para `super_admin`
- Validação slug: `/^[a-z0-9-]+$/`
- Preview URL: `app.dominio.com/{slug}`

### UsersTable (admin+)
- Buscar: `supabase.from('users').select('*').eq('tenant_id', tenantId)`
- Exibir: avatar (iniciais), nome, email, badge role
- Ações: Convidar (`POST /api/admin/invite` com `{ email, role, tenant_id }`), Remover (Dialog confirm, não permite remover próprio usuário)

**Atualização necessária em `/api/admin/invite/route.ts`:**
- Aceitar `{ email, role, tenant_id }` no body
- Permitir `admin` (não só `super_admin`) chamar o endpoint
- Validar que `admin` só convida para o próprio `tenant_id`

### DeleteAccountSection (todos)
```tsx
// TODO: LGPD Phase 2 — implementar exclusão de conta
// Necessário para compliance com Art. 18, VI da LGPD
// Flow previsto: solicitar código 6 dígitos via email → confirmar → supabase.auth.admin.deleteUser()
```
UI: card vermelho com aviso de ação irreversível + botão "Solicitar exclusão" que abre Dialog informando "recurso em desenvolvimento".

---

## 7. Hook usePermissions

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuth()
  return {
    canEditEmail:        user?.role === 'super_admin' || user?.role === 'admin',
    canAccessAdminPanel: user?.role === 'super_admin',
    canManageUsers:      user?.role === 'super_admin' || user?.role === 'admin',
    canEditSlug:         user?.role === 'super_admin',
    canManageTenants:    user?.role === 'super_admin',
    isSuperAdmin:        user?.role === 'super_admin',
    isAdmin:             user?.role === 'admin',
    isClient:            user?.role === 'client',
    role:                user?.role,
  }
}
```

Usar em todos os componentes condicionais. Nunca verificar `role` diretamente nos componentes.

---

## 8. Migration Supabase

```sql
-- Adicionar notification_preferences à tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
```

---

## 9. Componentes Shadcn necessários

Verificar se já instalados; instalar se não:
- `Sheet` — mobile nav + invite modal
- `Dialog` — confirmações (delete user, delete account)
- `Switch` — toggles de notificação
- `Tooltip` — sidebar colapsada
- `Select` — mobile settings nav
- `Toast` / `Toaster` — feedback (já existe)
- `Badge` — já existe
- `Avatar` — iniciais de usuário

---

## 10. Restrições e invariantes

- Operações admin (invite, delete user) **nunca** chamam service_role no frontend — sempre via API route Next.js
- RLS do Supabase nunca é bypassado no cliente
- Usuário não pode remover a si mesmo na aba Usuários
- `client` não acessa `/settings/organization` nem `/settings/users` — bloqueado tanto no UI (SettingsNav não exibe) quanto na page (redirect server-side)
- Sidebar usa `remove do DOM` para itens condicionais, não `hidden` via CSS
