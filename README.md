🧠 Notion-like Collaborative Workspace (Backend)

A production-oriented, modular monolith backend system inspired by Notion.
Built with NestJS, TypeORM, SQL Server, Redis, BullMQ, AWS S3, and CASL.

🚀 Overview

This project implements a collaborative workspace system supporting:

Multi-user workspaces (Selections)

Role-based access control (system-level + workspace-level)

JWT access/refresh token rotation with reuse detection

Redis caching & namespace invalidation strategy

Background jobs with BullMQ

S3 presigned upload flow

Note versioning with transactional consistency

Soft-delete lifecycle management

Production-grade logging and error normalization

The system follows a Modular Monolith architecture with strict module boundaries.

🏗 Architecture

Pattern: Modular Monolith
Runtime: Node.js 20 LTS
Framework: NestJS 10

Each business domain is encapsulated in its own module:

AuthModule
UserModule
SelectionModule
NoteModule
AttachmentModule
PermissionModule
NotificationModule
MailModule
QueueModule
CoreModule

Modules communicate only through injected services — never via direct repository access across boundaries.

🔐 Authentication & Authorization
Authentication

JWT Access Token (15 min)

Opaque Refresh Token (30 days, stored as SHA-256 hash)

Token rotation with reuse detection

Refresh family invalidation

HttpOnly + Secure + SameSite cookies

Authorization

Implemented using CASL with dynamic ability building per request.

Supports:

System-level roles (Admin, User)

Workspace-level roles (Owner, Editor, Viewer)

Conditional permissions (e.g. delete own note only)

Example rule:

can(Action.Update, 'Note', { authorId: user.id });
🗄 Database Design

Database: SQL Server
ORM: TypeORM

Key entities:

Users

Roles

Permissions

Selections (Workspaces)

SelectionMembers

Notes

NoteVersions

Attachments

RefreshTokens

Soft Delete Strategy

Primary entities use @DeleteDateColumn().

Soft deletes default

Hard deletes handled by scheduled cleanup job

withDeleted() used in admin endpoints

🧩 Core Features
1️⃣ Workspace (Selection) Management

Create workspace

Add/remove members

Assign roles

Role override per workspace

Membership cache invalidation

2️⃣ Notes

CRUD operations

Authorization matrix

Version snapshot on every update

Transactional consistency

3️⃣ Attachments (S3 Presigned Flow)

Upload flow:

Request presigned PUT URL

Client uploads directly to S3

Confirm upload

Store attachment metadata

Download via presigned GET URL (never public bucket).

⚡ Redis Strategy

Used for:

User cache

Workspace cache

Ability cache

Reset token storage

BullMQ

Namespace pattern example:

user:{id}
selection:{id}
selection:{id}:members
note:{id}
ability:{userId}:{selectionId}

Explicit invalidation on updates.

📨 Background Jobs (BullMQ)

Queues:

mail

notifications

storage

cleanup

Used for:

Welcome email

Reset password email

Invitation email

S3 deletion

Soft-delete cleanup

Exponential backoff (3 retries).
Failed jobs retained for observability.

🛡 Security

Helmet

Rate limiting

Global validation pipe

RFC 7807 error normalization

Structured logging with correlation IDs

Parameterized queries only

Secrets via environment variables

Bcrypt (cost 12)

📊 Observability

Winston structured JSON logging

Request duration logging

Correlation ID via AsyncLocalStorage

Health check endpoint (/health)

BullMQ failure monitoring

📂 Project Structure
src/
core/
auth/
users/
selections/
notes/
attachments/
permissions/
notifications/
mail/
queue/
🐳 Docker

The application can be containerized with:

SQL Server

Redis

API service

Example:

docker-compose up --build
🔧 Environment Variables
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
AWS_REGION=
AWS_BUCKET=
MAIL_HOST=
MAIL_FROM=
APP_URL=

All variables validated at startup using Joi schema.

🧪 Production Readiness

Migrations only (synchronize disabled)

Seed script for default roles/admin

Health check endpoint

Queue monitoring

Structured error handling

Token reuse detection

Soft delete retention strategy

📌 Why This Project?

This project demonstrates:

Backend architecture design

Secure authentication system

Fine-grained authorization

Cache strategy design

Background job processing

File storage best practices

Production hardening mindset

🧠 Author

Phương Nam
Backend-focused Full-Stack Developer
NestJS · .NET · React
