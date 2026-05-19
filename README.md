# TaskFlow — Sistema de Gerenciamento de Tarefas com Kanban

Aplicação fullstack de gerenciamento de tarefas com quadro Kanban, dashboard analítico, autenticação JWT e notificações por e-mail via fila assíncrona.

## Stack

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS + DaisyUI
- **Backend:** NestJS + TypeORM + PostgreSQL
- **Fila:** BullMQ + Redis
- **Infra:** Docker + Docker Compose

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Ou: Node.js 20+, PostgreSQL 16 e Redis 7 instalados localmente

---

## Como executar com Docker

```bash
# 1. Clone o repositório
git clone https://github.com/SunflowerRonin/Taskflow-Kanban.git
cd Taskflow-Kanban

# 2. Configure as variáveis de ambiente do backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais (veja seção abaixo)

# 3. Suba todos os serviços
docker-compose up -d

# 4. Acesse
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

---

## Como executar localmente (sem Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais

npm install
npm run start:dev
# Rodando em http://localhost:3001
```

### Frontend

```bash
cd src
cp .env.example .env.local
npm install
npm run dev
# Rodando em http://localhost:3000
```

> Certifique-se de que PostgreSQL e Redis estão rodando antes de subir o backend.

---

## Variáveis de ambiente

### `backend/.env`

```env
# Banco de dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=taskflow

# Redis (fila de e-mails)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT — chave secreta para assinar os tokens de autenticação
# Gere uma chave segura com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=troque_por_uma_chave_segura

# E-mail (SMTP) — veja tutorial abaixo
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=seu_usuario_mailtrap
MAIL_PASS=sua_senha_mailtrap

# Origem permitida no CORS — use * para liberar tudo em dev, ou defina o domínio em produção
CORS_ORIGIN=http://localhost:3000
```

### `src/.env.local`

```env
# URL do backend — não altere em desenvolvimento local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> Copie o exemplo disponível: `cp src/.env.example src/.env.local`

---

## Como gerar o JWT_SECRET

O `JWT_SECRET` é a chave que assina e valida todos os tokens de autenticação da aplicação. Use qualquer string longa e aleatória — nunca use palavras simples em produção.

Para gerar uma chave segura, rode no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o resultado no `.env`:

```env
JWT_SECRET=a1b2c3d4e5f6... (sua chave gerada)
```

---

## Como configurar o e-mail com Mailtrap

O Mailtrap é um serviço gratuito de e-mail para desenvolvimento — ele captura os e-mails enviados pela aplicação sem entregá-los de verdade, permitindo testar o envio com segurança.

### Passo a passo

1. Acesse [https://mailtrap.io](https://mailtrap.io) e crie uma conta gratuita

2. No menu lateral, clique em **Email Testing → Sandboxes**

3. Clique na sua sandbox (geralmente chamada **My Inbox**)

4. Abra a aba **Integration**, clique em **SMTP** e copie as credenciais exibidas:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: xxxxxxxxxxxxxxx
Password: xxxxxxxxxxxxxxx
```

5. Cole no seu `backend/.env`:

```env
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=xxxxxxxxxxxxxxx
MAIL_PASS=xxxxxxxxxxxxxxx
```

6. Suba o backend — os e-mails enviados pela aplicação aparecerão na caixa de entrada da sandbox em tempo real.

> Em produção, substitua pelas credenciais do seu provedor real (SendGrid, SES, Resend, etc.)

---

## Decisões técnicas e trade-offs

### Frontend
- **Next.js App Router** com rotas protegidas via middleware. Layout compartilhado entre `/kanban` e `/dashboard` com sidebar.
- **@dnd-kit** para drag & drop — mais leve e acessível que react-beautiful-dnd, suporta reordenação dentro da coluna via `SortableContext`.
- **Recharts** para os gráficos do dashboard — API declarativa e boa integração com React.
- **DaisyUI** como sistema de design — tokens semânticos (`base-100`, `primary`, etc.) que facilitam tema claro/escuro sem CSS customizado.

### Backend
- **TypeORM com `synchronize: true`** em desenvolvimento — conveniente para iterar rápido, mas deve ser substituído por migrations em produção.
- **Histórico de movimentações** salvo como `jsonb` na própria entidade Task — evita uma tabela extra para o escopo do projeto, mas em produção o ideal seria uma tabela `task_history` separada para facilitar queries.
- **BullMQ + Redis** para a fila de e-mails — processamento assíncrono garante que a resposta da API não depende do envio de e-mail. O worker processa em background.
- **@nestjs/schedule** para o cron de prazo próximo — verifica diariamente às 8h tarefas com vencimento em até 2 dias e enfileira lembretes.
- **Eager loading do User na Task** — conveniente para não precisar de joins manuais, mas pode gerar N+1 em listagens grandes. Trade-off aceitável para o escopo.

### Infra
- **Docker Compose com healthcheck em todos os serviços** — garante ordem de inicialização correta (postgres → redis → backend → frontend).
- **Next.js rewrites** como proxy para o backend — elimina problemas de CORS em desenvolvimento e simplifica a configuração de produção.
