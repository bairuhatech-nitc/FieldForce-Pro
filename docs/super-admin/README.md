# Super Admin Setup Guide

This guide explains how to create the initial Super Admin account for the FieldForce Pro platform. The Super Admin has global access to all features and is not tied to any specific tenant.

## Prerequisites

- Node.js installed
- PostgreSQL running locally or remotely (configured via your `.env` file)
- The `.env` file in your `server` directory must be correctly set up with the database credentials (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`).

## Steps to Create Super Admin

1. **Navigate to the Server Directory:**
   Open your terminal and navigate to the backend server folder:
   ```bash
   cd server
   ```

2. **Ensure Dependencies are Installed:**
   Make sure all npm packages are installed properly:
   ```bash
   npm install
   ```

3. **Run the Seed Script:**
   Because the PostgreSQL database runs in Docker and maps to port `5433` on your host machine (as defined in `docker-compose.override.yml`), you must override the database connection variables when running this locally.

   **On Windows (PowerShell):**
   ```powershell
   $env:DB_HOST="localhost"
   $env:DB_PORT="5433"
   npm exec ts-node -- -r tsconfig-paths/register scripts/seed-super-admin.ts
   ```

   **On Mac/Linux (Bash):**
   ```bash
   DB_HOST=localhost DB_PORT=5433 npm exec ts-node -- -r tsconfig-paths/register scripts/seed-super-admin.ts
   ```



## Super Admin Credentials

By default, the seed script will create an account with the following credentials (unless modified in the script):

- **Email:** `fsm.superadmin@fieldforce.com`
- **Password:** `FieldForce@Super#2024`

## Troubleshooting

- **`bcrypt_lib.node is not a valid Win32 application` Error:** 
  If you encounter this error on Windows, it means the native `bcrypt` module was built for a different architecture. You can fix this by running:
  ```bash
  npm uninstall bcrypt
  npm install bcryptjs
  npm i -D @types/bcryptjs
  ```
  And then updating the `scripts/seed-super-admin.ts` file to import `bcryptjs` instead of `bcrypt`.

- **Database Connection Error:**
  Ensure that your PostgreSQL server is running and that the credentials in your `server/.env` file match the active database.
