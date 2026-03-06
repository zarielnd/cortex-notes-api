# 🧠 Collaborative Workspace Backend API

A production-oriented, modular monolith backend system inspired by Notion.

## 🚀 Tech Stack

- NestJS 10
- TypeORM
- PostgreSql
- Redis
- BullMQ
- AWS S3
- CASL
- JWT (Access + Refresh Rotation)

---

## 📌 Overview

This project implements a collaborative workspace system supporting:

- Multi-user workspaces (Selections)
- Role-based access control (system-level + workspace-level)
- JWT access/refresh token rotation with reuse detection
- Redis caching with explicit invalidation
- Background jobs with BullMQ
- S3 presigned upload flow
- Note versioning with transactional consistency
- Soft-delete lifecycle management
- Structured logging & RFC7807 error normalization

Architecture follows a **Modular Monolith** pattern.

---

## 🏗 Architecture

This project follows a **Modular Monolith** architecture with clear separation between:

- Domain modules
- Infrastructure layer
- Shared common layer
- Configuration layer

---

## 📂 Project Structure

src/

- common/
- config/
- entities/
- infrastructure/
- modules/
- app.module.ts
- data-source.ts
- main.ts

---

## 🧩 Domain Modules (Business Logic)

Location:

src/modules/

Modules:

- attachments
- auth
- mail
- notes
- permissions
- roles
- selections
- storage
- users

Each module encapsulates:

- Controllers
- Services
- DTOs
- Business rules
- Authorization logic

Domain modules do not directly manage infrastructure configuration.

---

## 🧱 Infrastructure Layer

Location:

src/infrastructure/

Contains technical concerns shared across the system.

### CASL

- Ability factory
- Action enums
- Ability types
- CASL module setup

### Database

- TypeORM configuration
- Data source
- Migrations
- Seed scripts

### Queue

- BullMQ integration
- Email worker
- Background processors

### Redis

- Redis connection
- Cache configuration
- Token storage backend

Infrastructure is injected into domain modules via dependency injection.

---

## 🧰 Common Layer

Location:

src/common/

Shared cross-cutting components:

- decorators
- filters
- guards
- interceptors
- types
- utils

This layer contains reusable building blocks used across modules.

---

## ⚙ Configuration

Location:

src/config/

- Environment configuration
- Validation schema
- Centralized config service

All environment variables are validated at startup.

## 🔐 Authentication

### Access Token

- JWT
- 15 minutes TTL
- Sent via Authorization header

### Refresh Token

- 30 days TTL
- Stored as SHA-256 hash in database
- Sent via HttpOnly + Secure cookie
- Token rotation with reuse detection
- Family invalidation support

---

## 🛡 Authorization (CASL)

- System roles: Admin, User
- Workspace roles: Owner, Editor, Viewer
- Conditional permission support

Example rule:

`can(Action.Update, 'Note', { authorId: user.id })`

Ability is built dynamically per request.

---

## 🗄 Database

**Database:** PostgreSql
**ORM:** TypeORM

Core entities:

- Users
- Roles
- Permissions
- Selections
- SelectionMembers
- Notes
- NoteVersions
- Attachments
- RefreshTokens

### Soft Delete

Primary entities use `@DeleteDateColumn()`.

- Soft delete by default
- Hard delete via scheduled cleanup job

---

## 📦 Core Features

### Workspace Management

- Create workspace
- Add/remove members
- Assign roles
- Workspace-level role override
- Membership cache invalidation

### Notes

- CRUD operations
- Authorization matrix
- Version snapshot on update
- Wrapped in transaction

### Attachments (AWS S3)

Upload flow:

1. Request presigned PUT URL
2. Upload directly to S3
3. Confirm upload
4. Store metadata

Download via presigned GET URL.

---

## ⚡ Redis Strategy

Used for:

- User cache
- Workspace cache
- Ability cache
- Reset token storage
- BullMQ queues

Key pattern examples:

- user:{id}
- selection:{id}
- selection:{id}:members
- note:{id}
- ability:{userId}:{selectionId}

---

## 📨 Background Jobs (BullMQ)

Queues:

- mail
- notifications
- storage
- cleanup

Used for:

- Welcome emails
- Reset password emails
- Invitation notifications
- S3 cleanup
- Soft-delete cleanup

---

## 🛡 Security

- Helmet
- Rate limiting
- Global validation pipe
- Structured logging
- Parameterized queries
- Bcrypt (cost 12)
- Secrets via environment variables

---

## 🐳 Docker

Run with:

`docker-compose up --build`

---

## 🔧 Environment Variables

Required:

```env
# App
NODE_ENV=
PORT=
APP_URL=

# Database
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_SSL=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_TTL=

# Mail
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=

# AWS S3
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

COOKIE_SECRET=
ALLOWED_ORIGINS=
```

All validated at startup using Joi schema.

---

## 🎯 Why This Project?

Demonstrates:

- Backend architecture design
- Secure authentication system
- Fine-grained authorization
- Cache strategy design
- Background job processing
- File storage best practices
- Production hardening mindset

---

## 👨‍💻 Author

Phương Nam  
Backend-focused Full-Stack Developer
NestJS · .NET · React
