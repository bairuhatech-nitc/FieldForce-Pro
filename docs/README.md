# FieldForce Pro - Local Setup Guide

> [!NOTE]
> This guide outlines the end-to-end process for running a freshly pulled version of the repository, including environment configuration, database setup, Docker orchestration, and resolving local IDE errors.

---

## 1. Environment Configuration

You must create two `.env` files: one for the root directory (Docker orchestration) and one for the backend server.

### Root Environment
1. Copy the example file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the necessary API keys. **Crucially**, ensure the Gemini API key is set for the AI chatbot:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

### Server Environment
1. Copy the configured environment file into the `server` directory:
   ```bash
   cp .env server/.env
   ```

> [!IMPORTANT]
> The `fsm-server` Docker container reads directly from the `server/.env` file. Ensure `GEMINI_API_KEY` is present here as well.

---

## 2. Database Setup (Docker Override)

The base `docker-compose.yml` does not include a database service by default. We use a `docker-compose.override.yml` file to spin up a local PostgreSQL instance and instruct the server to wait for it.

**Step 1:** Create a file named `docker-compose.override.yml` in the root folder.

**Step 2:** Add the following configuration:

```yaml
services:
  # ── The PostgreSQL Database ──
  fsm-postgres:
    image: postgres:15-alpine
    container_name: fsm-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fieldforce_pro_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - fsm-network
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U postgres -d fieldforce_pro_dev" ]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Tell the Server to Wait for the Database ──
  fsm-server:
    depends_on:
      fsm-redis:
        condition: service_healthy
      fsm-postgres:
        condition: service_healthy

volumes:
  postgres-data:
```

> [!TIP]
> The `fsm-server` automatically connects to these PostgreSQL credentials based on its internal database configuration.

---

## 3. Docker Commands & Build Instructions

Once the environment variables and override file are in place, use Docker Compose to orchestrate the stack.

### Initial Startup
To build and start the entire stack for the first time, run:
```bash
docker-compose up -d --build
```
> **Explanation**: `up` starts the containers, `-d` runs them in the background (detached mode), and `--build` forces Docker to build the images using the local Dockerfiles.

### Rebuilding Specific Services
Because the containers serve static bundles or pre-built code, any local changes made to source files (e.g., `.ts`, `.tsx`, `.css`) require the specific container to be rebuilt.

- **Backend / AI Changes** (e.g., modifying `ai.service.ts`):
  ```bash
  docker-compose up -d --build fsm-server
  ```
- **Frontend / React Changes** (e.g., modifying `Sidebar.tsx`, `index.css`):
  ```bash
  docker-compose up -d --build fsm-web
  ```

---

## 4. Local IDE Setup

Because the project runs entirely inside Docker containers, your local host machine won't natively have the `node_modules` installed. This causes IDEs like VSCode to display red squiggly warning lines (e.g., `Cannot find module '@nestjs/common'`).

To resolve these syntax highlighting and type definition errors, install the dependencies locally on your host machine:

**Fix Frontend IDE Errors:**
```bash
cd web
npm install
```

**Fix Backend IDE Errors:**
```bash
cd server
npm install
```

> [!NOTE]
> Installing these locally is purely to satisfy your IDE's TypeScript compiler. You do not need to run the app locally via `npm run dev`.
