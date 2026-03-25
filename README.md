# CloudNest Imagebed

CloudNest is a Next.js App Router scaffold for a Cloudinary-backed image host. This repository currently includes:

- a branded upload homepage
- direct Cloudinary upload with signed-first and unsigned fallback behavior
- a server-side delete route boundary
- an admin asset browser backed by the Cloudinary Admin API
- a cookie-based admin session
- a server-side delete audit log with Vercel Blob persistence and local fallback
- batch delete support for selected assets
- environment variable scaffolding for Vercel deployment

## Quick start

1. Copy `.env.example` to `.env.local`.
2. Fill in your Cloudinary and admin settings.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.

## Current implementation notes

- Uploads prefer signed upload when server credentials are configured, and fall back to unsigned upload preset mode otherwise.
- `ALLOW_UNSIGNED_UPLOAD_FALLBACK=false` can be used to force signed upload only.
- The delete route is server-only and uses Cloudinary's signed destroy API.
- The admin page supports both single delete and batch delete for selected assets.
- The admin page can fetch real assets from Cloudinary under the configured upload folder.
- The admin surface now uses an HTTP-only cookie session backed by `ADMIN_LOGIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
- Delete audit entries are stored in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is available, with `.data/` JSONL as a local-development fallback.
- The `/admin` page is still a MVP backend surface, not a final production-grade media library.

## Suggested next steps

1. Decide whether to keep the built-in admin session or replace it with `NextAuth` / `Clerk`.
2. If Blob becomes insufficient for querying or retention needs, move delete audit to a shared database or logging backend.
3. Continue improving search, filtering, pagination, and bulk actions in the admin page.
4. Decide whether to remove unsigned fallback entirely after signed upload is verified in production.
