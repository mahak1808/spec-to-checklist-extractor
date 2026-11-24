# Spec-to-Checklist Backend (FastAPI + PostgreSQL + Groq)

REST API powering spec ingestion, Groq LLM structured extraction, relational persistence in PostgreSQL, item-level human review, and finalization state enforcement.

## Database & Connection Architecture

```text
FastAPI -> SQLAlchemy ORM -> Psycopg -> PostgreSQL (Supabase)
```

- **Database URL Format:** `postgresql+psycopg://username:password@host:port/database`
- **Relational Schema:** One-to-many relationship between `extractions` (parent spec) and `checklist_items` (child tasks) with `ON DELETE CASCADE` integrity.

## Local Setup

1. **Create and activate a virtual environment:**

   ```bash
   python -m venv venv
   source venv/bin/activate        # macOS / Linux
   # venv\Scripts\activate         # Windows
   ```

2. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

   _(Includes `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg[binary]`, `pydantic`, `python-dotenv`, and `groq`.)_

3. **Configure environment variables:**
   Create a `.env` file inside `backend/`:

   ```env
   DATABASE_URL=postgresql+psycopg://postgres:your_password@db.your-project.supabase.co:5432/postgres
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=openai/gpt-oss-20b
   ```

4. **Run the development server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   Interactive Swagger API docs will be available at `http://127.0.0`.

## API Endpoints

| Method  | Endpoint                         | Description                                                         |
| :------ | :------------------------------- | :------------------------------------------------------------------ |
| `GET`   | `/health`                        | Service health check                                                |
| `POST`  | `/api/extractions`               | Create a spec execution and generate checklist items via Groq       |
| `GET`   | `/api/extractions`               | List all executions ordered by newest first                         |
| `GET`   | `/api/extractions/{id}`          | Fetch a single execution with nested `checklist_items`              |
| `POST`  | `/api/extractions/{id}/items`    | Manually attach a checklist item to an execution                    |
| `PATCH` | `/api/items/{item_id}`           | Edit item fields or update `review_status` (blocked if finalized)   |
| `POST`  | `/api/extractions/{id}/finalize` | Validate all items are `approved` and lock execution as `finalized` |
