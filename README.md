# 🧠 Collaborative Workspace Backend API

A production-oriented, modular monolith backend system inspired by Notion.

## 🚀 Tech Stack

- NestJS 10
- TypeORM
- SQL Server
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

Each business domain is isolated into its own module:

- AuthModule
- UserModule
- SelectionModule
- NoteModule
- AttachmentModule
- PermissionModule
- NotificationModule
- MailModule
- QueueModule
- CoreModule

Modules communicate only through injected services.

---

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

**Database:** SQL Server  
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

docker-compose up --build

---

## 🔧 Environment Variables

Required:
```
APP_PORT=

# Postgres Database
DATABASE_HOST=
DATABASE_PORT=
DATABASE_UID=
DATABASE_PWD=
DATABASE_NAME=

# JWT
JWT_SECRET=

JWT_REFRESH_TOKEN_REMEMBER_EXPIRATION_TIME=
JWT_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
JWT_REFRESH_SECRET=

# Cookie
ACCESS_TOKEN_NAME=
REFRESH_TOKEN_NAME=
COOKIE_DOMAIN=

ACCESS_TOKEN_EXPIRES_IN=
REFRESH_TOKEN_EXPIRES_IN=

# Environment
IS_LOCAL=

# AWS S3
AWS_REGION=
AWS_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_URL=
AWS_PRESIGNED_URL_EXPIRATION=

# Cors
CORS_ORIGINS=

# Domain
WEBSITE_DOMAIN=
SERVER_DOMAIN=


# Redis 
REDIS_URL=
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_HOST=
REDIS_PORT=
REDIS_DB=

# Google capcha
GOOGLE_CAPTCHA_SITE_KEY=
GOOGLE_CAPTCHA_PROJECT_ID=
GOOGLE_CAPTCHA_IS_ENABLED=
GOOGLE_APPLICATION_CREDENTIALS=

# Crypto
CRYPTO_JS_SECRET=


# SMTP Gmail
SMTP_HOST=
SMTP_PORT=
SMTP_PASSWORD=
SMTP_USER_NAME=
SMTP_FROM_EMAIL=

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
