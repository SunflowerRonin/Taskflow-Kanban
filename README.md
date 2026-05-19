# TaskFlow — Sistema de Gerenciamento de Tarefas

App fullstack de gerenciamento de tarefas com quadro Kanban, autenticação, dashboard e notificações por e-mail.

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, DaisyUI |
| Backend | NestJS, TypeORM, PostgreSQL |
| Infra | Docker, Docker Compose |

### Autenticação
- Cadastro e login com e-mail e senha
- Autenticação via JWT com proteção de rotas
- Hash de senha com bcrypt
- Validação de formulários com feedback por campo

### Quadro Kanban
- Colunas: A Fazer, Em Andamento, Em Revisão, Concluído
- Cards arrastáveis entre colunas e reordenáveis dentro da coluna
- Atualização de status automática ao mover o card
- Upload e remoção de anexos diretamente no card (até 10MB por arquivo)
- Integração com Bitrix24: importação em massa de tarefas, exportação de card individual e sincronização em tempo real via webhook (eventos de criação, atualização e exclusão)

### Modal de Edição
- Campos: título, descrição, responsável, prioridade (baixa/média/alta), data de entrega, tags
- Histórico de movimentações com timestamp e responsável
- Upload e remoção de anexos

### Dashboard Analítico
- Cards por status (gráfico de barras e pizza)
- Tarefas por responsável
- Tarefas atrasadas com dias de atraso
- Fluxo de conclusão ao longo do tempo (gráfico de linha por semana)
- Filtro por período
- Exportação dos dados filtrados em CSV

### Fila de E-mail
- Envio ao responsável quando um card é atribuído a ele
- Envio ao responsável quando o status do card é alterado
- Lembrete automático de prazo (cron diário às 8h para tarefas vencendo em 2 dias)
- Processamento assíncrono via BullMQ + Redis

### Integração Bitrix24 (bônus)
- Importação em massa de tarefas do Bitrix24 para o Kanban local
- Exportação de qualquer card para uma tarefa no Bitrix24
- Webhook de saída: o Bitrix24 notifica o backend em tempo real sobre criação (`ONTASKADD`), edição (`ONTASKUPDATE`) e exclusão (`ONTASKDELETE`) de tarefas, mantendo os dois sistemas sincronizados
- Validação de autenticidade do webhook via secret token (`BITRIX_WEBHOOK_SECRET`)
- Toda a integração é opcional — o sistema funciona normalmente sem as variáveis de ambiente do Bitrix configuradas

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

## Como executar com Docker

```bash
git clone <url-do-repositorio>
cd taskflow

# Suba todos os serviços (postgres, redis, backend, frontend)
docker-compose up --build
```

Acesse: [http://localhost:3000](http://localhost:3000)

> O Docker Compose sobe os serviços com healthchecks encadeados: o backend aguarda o postgres e redis ficarem prontos antes de iniciar, e o frontend aguarda o backend.


## Como executar localmente

### 1. Suba o banco e o Redis via Docker

```bash
docker-compose up postgres redis
```

### 2. Backend

```bash
cd backend
npm install

# Copie e configure o .env
cp .env.example .env
# Edite o .env com suas credenciais se necessário

npm run start:dev
# Backend disponível em http://localhost:3001
```

### 3. Frontend

```bash
cd src
npm install

# Copie o .env
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001 já está configurado

npm run dev
# Frontend disponível em http://localhost:3000
```

## Variáveis de ambiente

### Backend (`backend/.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=taskflow

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=troque_por_uma_chave_segura

MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=seu_usuario_mailtrap
MAIL_PASS=sua_senha_mailtrap

# Opcional — integração Bitrix24
BITRIX_WEBHOOK_URL=
BITRIX_WEBHOOK_SECRET=
```

### Frontend (`src/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```


## Decisões técnicas e trade-offs

### JWT stateless sem refresh token
Optei por JWT com expiração longa para simplificar o escopo do case. Em produção, implementaria refresh tokens com rotação automática e blacklist no Redis para permitir logout real e revogação.

### Fila de e-mail com BullMQ
A arquitetura de filas está completa e funcional. Em desenvolvimento, o `MailService` loga os eventos no console em vez de enviar e-mails reais — isso permite rodar o projeto sem configurar um servidor SMTP. Para ativar o envio real, basta preencher as variáveis `MAIL_*` com credenciais de um serviço como Mailtrap, SendGrid ou Gmail SMTP.

### Drag & drop com @dnd-kit
Escolhido em vez do react-beautiful-dnd por ser ativamente mantido, ter suporte nativo a dispositivos touch e oferecer melhor performance com a API de sensores configuráveis. A reordenação dentro da coluna e a movimentação entre colunas são tratadas no mesmo handler `onDragEnd`.

### Métricas do dashboard calculadas no frontend
As métricas são derivadas da lista de tasks já carregada em memória, evitando endpoints analíticos adicionais no backend. Isso funciona bem para o volume esperado em um case. Em produção com grande volume de dados, as agregações seriam movidas para queries SQL no banco (GROUP BY status, COUNT, etc.) e o frontend consumiria endpoints dedicados.

### TypeORM com `synchronize: true`
Habilitado apenas em desenvolvimento para aplicar mudanças de schema automaticamente sem necessidade de migrations manuais. Em produção, `synchronize` seria `false` e as mudanças de schema seriam gerenciadas via migrations versionadas (`typeorm migration:generate` / `migration:run`).

### Upload de anexos em disco local
Os arquivos são armazenados em `backend/uploads/` e servidos como arquivos estáticos pelo NestJS. Em produção, substituiria por um bucket S3 (ou compatível) para escalar horizontalmente e não depender do filesystem do container.

### Uso de IA no desenvolvimento
Claude (Anthropic) foi utilizado como assistente técnico ao longo do desenvolvimento. As contribuições foram principalmente em: configuração inicial do ambiente (Docker Compose com healthchecks encadeados, estrutura de módulos do NestJS), partes mais complexas do backend (lógica do webhook Bitrix24 com tratamento dos três eventos, processador de filas BullMQ, scheduler de prazos com cron), otimizações pontuais de código (correção do bug no agrupamento semanal do dashboard, registro do AppController no módulo raiz) e na redação deste README. 

## Estrutura do projeto

```
taskflow/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/         # JWT strategy, login, register
│   │   ├── tasks/        # CRUD de tasks, upload de anexos
│   │   ├── users/        # CRUD de usuários
│   │   ├── mail/         # Serviço de e-mail (Nodemailer)
│   │   ├── queue/        # BullMQ processors e scheduler
│   │   └── bitrix/       # Integração Bitrix24 (bônus)
│   └── uploads/          # Arquivos de anexo
├── src/                  # Next.js Frontend
│   ├── app/
│   │   ├── login/        # Tela de login
│   │   ├── register/     # Tela de cadastro
│   │   └── (app)/
│   │       ├── kanban/   # Quadro Kanban
│   │       └── dashboard/ # Dashboard analítico
│   ├── components/
│   │   └── kanban/       # KanbanBoard, KanbanCard, CardModal
│   ├── services/         # Chamadas à API (tasks, users, auth, bitrix)
│   └── types/            # Tipos TypeScript compartilhados
└── docker-compose.yml
```
