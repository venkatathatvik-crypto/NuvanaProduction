# Nuvana Production - School Management System

A comprehensive multi-tenant school management platform built with React, NestJS, and PostgreSQL.

## Project info

**URL**: https://lovable.dev/projects/f8856d71-98d8-47a4-856a-ab44f090d3e8

## Tech Stack

### Frontend
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication
- OpenAI Integration (optional)

## 🚀 Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- PostgreSQL database

### Installation Steps

#### 1. Clone the repository

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

#### 2. Install Frontend Dependencies

```sh
npm install
```

#### 3. Install Backend Dependencies

```sh
cd backend
npm install
cd ..
```

#### 4. Setup Frontend Environment Variables

Create a `.env` file in the root directory:

```env
# Backend API URL
VITE_BACKEND_URL=https://nuvana360server.onrender.com

# Supabase Configuration (Optional - for file storage)
# VITE_SUPABASE_URL=your_supabase_project_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 5. Setup Backend Environment Variables

Create a `.env` file in the `backend` directory with the following configuration:

```env
# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/nuvana_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Super Admin Registration Secret
SUPER_ADMIN_SECRET=your-ultra-secure-super-admin-secret-change-this

# OpenAI Configuration (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important Placeholders:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:mypassword@localhost:5432/nuvana_db` |
| `JWT_SECRET` | Secret key for JWT access tokens (min 32 characters) | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens (min 32 characters) | `z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4` |
| `SUPER_ADMIN_SECRET` | Secret code for super admin registration | `MySecureAdminCode2024!` |
| `OPENAI_API_KEY` | OpenAI API key for AI features (optional) | `sk-proj-xxxxxxxxxxxxxxxxxxxx` |

**Security Notes:**
- Never commit real `.env` files to version control
- Use strong, random values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- Keep `SUPER_ADMIN_SECRET` secure - only share with trusted administrators
- Change all default values in production environments

#### 6. Setup Database

```sh
cd backend
```

#### 7. Start Development Servers

**Terminal 1 - Backend:**
```sh
npm run start:dev
```

**Terminal 2 - Frontend:**
```sh
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173 (or http://localhost:8080)
- Backend API: https://nuvana360server.onrender.com

## 📝 How to Edit This Code

### Use Lovable

Visit the [Lovable Project](https://lovable.dev/projects/f8856d71-98d8-47a4-856a-ab44f090d3e8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Use Your Preferred IDE

Clone this repo and push changes. Pushed changes will also be reflected in Lovable.

### Edit Files Directly in GitHub

- Navigate to the desired file(s)
- Click the "Edit" button (pencil icon) at the top right
- Make your changes and commit

### Use GitHub Codespaces

- Navigate to the main page of your repository
- Click on the "Code" button (green button) near the top right
- Select the "Codespaces" tab
- Click on "New codespace" to launch a new Codespace environment
- Edit files directly within the Codespace and commit your changes

## 🚢 Deployment

### Frontend Deployment

Simply open [Lovable](https://lovable.dev/projects/f8856d71-98d8-47a4-856a-ab44f090d3e8) and click on Share → Publish.

### Backend Deployment

1. Setup PostgreSQL database on your hosting provider
2. Set environment variables in your hosting platform
3. Run database migrations: `npx prisma migrate deploy`
4. Deploy the NestJS application

## 🌐 Custom Domain

You can connect a custom domain to your Lovable project!

Navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 📚 Documentation

- [API Documentation](./docs/API_DOCUMENTATION.md) - Complete backend API reference
- Frontend: Built with React + TypeScript using Vite
- Backend: NestJS REST API with Prisma ORM

## 🔑 Default Credentials

After seeding the database, you can use these credentials to login:

**Super Admin:**
- Email: Use the secret code from `SUPER_ADMIN_SECRET` during registration

**Note:** For security, change all default credentials in production.
