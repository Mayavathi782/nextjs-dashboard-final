## Next.js App Router Course - Final (all 15 chapters)

This is the complete, final code for the Next.js "Dashboard App" course (nextjs.org/learn/dashboard-app), covering every chapter:

1. Getting Started
2. CSS Styling
3. Optimizing Fonts & Images
4. Creating Layouts & Pages
5. Navigating Between Pages
6. Setting Up Your Database
7. Fetching Data
8. Static & Dynamic Rendering
9. Streaming
10. Adding Search & Pagination
11. Mutating Data
12. Error Handling
13. Improving Accessibility
14. Adding Authentication
15. Adding Metadata

### Quick start

1. Install dependencies:
   ```
   npm install
   ```
   (or `pnpm install` / `yarn install`)

2. Create a `.env` file based on `.env.example` and fill in your Postgres connection details (Vercel Postgres / Neon / any Postgres instance works) and an `AUTH_SECRET` (generate one with `openssl rand -base64 32`).

3. Seed the database (with the dev server running) by visiting:
   ```
   http://localhost:3000/seed
   ```
   This runs `app/seed/route.ts`, which creates the tables and inserts the placeholder data from `app/lib/placeholder-data.ts`.

4. Run the dev server:
   ```
   npm run dev
   ```

5. Log in at `/login` using the demo credentials seeded in the database:
   - Email: `user@nextmail.com`
   - Password: `123456`

For the full written walkthrough of each step, see the [course curriculum](https://nextjs.org/learn/dashboard-app) on the Next.js website.
