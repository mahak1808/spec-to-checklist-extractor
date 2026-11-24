# Spec-to-Checklist Frontend (React + TypeScript)

Single-page web application for submitting product specs, browsing extraction runs in a paginated data table, reviewing and editing AI-generated tasks, and exporting finalized checklists.

## Features & Views

- **Dashboard / Extraction Form:** Submit raw specs or meeting notes to trigger AI checklist generation.
- **Executions Table (`/extractions`):** Paginated, sortable table listing all past runs with status badges and creation timestamps.
- **Review & Finalize Workspace (`/extractions/:id`):**
  - Inline editing for task `title`, `priority` (`low`, `medium`, `high`), and `acceptance_criteria`.
  - One-click review actions (**Save Edits**, **Needs Edit**, **Approve**).
  - Finalization guard that unlocks **Finalize Checklist** once all items are approved, locking inputs afterward.
  - Client-side **Export CSV** and **Copy Markdown** generators.

## Local Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file inside `frontend/`:

   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## Available Scripts

- `npm run dev` — Starts the Vite development server with HMR.
- `npm run build` — Runs TypeScript checks and builds the production bundle into `dist/`.
- `npm run preview` — Previews the production build locally.
