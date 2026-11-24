import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, status, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import Base, engine, get_db
from app.models import Extraction, ChecklistItem
from app.schemas import (
    ExtractionCreate,
    ExtractionResponse,
    ExtractionDetailResponse,
    ExtractionCountResponse,
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    ExtractionFinalizeResponse,
)
from app.services.extractor import ExtractionError, extract_checklist_with_retry

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Spec-to-Checklist API", lifespan=lifespan)

raw_origins = os.getenv("ALLOWED_ORIGINS")
if not raw_origins:
    raise RuntimeError("ALLOWED_ORIGINS isn't set in the environment variables.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=raw_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post(
    "/api/extractions",
    response_model=ExtractionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_extraction(payload: ExtractionCreate, db: Session = Depends(get_db)):
    row = Extraction(title=payload.title, source_text=payload.source_text)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/api/extractions", response_model=list[ExtractionResponse])
def list_executions(db: Session = Depends(get_db)):
    return db.query(Extraction).order_by(Extraction.id.desc()).all()


@app.get("/api/extractions/count", response_model=ExtractionCountResponse)
def list_executions_count(db: Session = Depends(get_db)):
    total = db.query(Extraction).count()
    return {"count": total}


@app.get("/api/extractions/{extraction_id}", response_model=ExtractionDetailResponse)
def get_extraction(extraction_id: int, db: Session = Depends(get_db)):
    extraction = (
        db.query(Extraction)
        .options(selectinload(Extraction.items))
        .filter(Extraction.id == extraction_id)
        .first()
    )
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")
    return extraction


@app.post(
    "/api/extractions/{extraction_id}/items",
    response_model=ChecklistItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_checklist_item(
    extraction_id: int, payload: ChecklistItemCreate, db: Session = Depends(get_db)
):
    extraction = db.query(Extraction).filter(Extraction.id == extraction_id).first()
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")

    item = ChecklistItem(
        extraction_id=extraction_id,
        title=payload.title,
        acceptance_criteria=payload.acceptance_criteria,
        priority=payload.priority,
        confidence_score=payload.confidence_score,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/api/items/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(
    item_id: int, payload: ChecklistItemUpdate, db: Session = Depends(get_db)
):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if item.extraction.status == "finalized":
        raise HTTPException(
            status_code=400,
            detail="Cannot edit checklist items of a finalized extraction.",
        )

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@app.post(
    "/api/extractions/{extraction_id}/extract",
    response_model=ExtractionDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_extraction(extraction_id: int, db: Session = Depends(get_db)):
    extraction = (
        db.query(Extraction)
        .options(selectinload(Extraction.items))
        .filter(Extraction.id == extraction_id)
        .first()
    )
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")

    extraction.status = "processing"
    db.commit()

    try:
        result = extract_checklist_with_retry(extraction.source_text)
    except ExtractionError as exc:
        extraction.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )

    # Clean prior draft items if re-running extraction on the same spec
    extraction.items.clear()

    for draft in result.items:
        item = ChecklistItem(
            extraction_id=extraction_id,
            title=draft.title,
            acceptance_criteria=draft.acceptance_criteria,
            priority=draft.priority,
            confidence_score=draft.confidence_score,
            review_status="pending_review",
        )
        db.add(item)

    extraction.status = "needs_review"
    db.commit()
    db.refresh(extraction)

    return (
        db.query(Extraction)
        .options(selectinload(Extraction.items))
        .filter(Extraction.id == extraction_id)
        .first()
    )


@app.post(
    "/api/extractions/{extraction_id}/finalize",
    response_model=ExtractionFinalizeResponse,
)
def finalize_extraction(extraction_id: int, db: Session = Depends(get_db)):
    extraction = (
        db.query(Extraction)
        .options(selectinload(Extraction.items))
        .filter(Extraction.id == extraction_id)
        .first()
    )
    if not extraction:
        raise HTTPException(status_code=404, detail="Extraction not found")

    if extraction.status == "finalized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Extraction is already finalized.",
        )

    if not extraction.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot finalize an extraction with no checklist items.",
        )

    unresolved_edits = [
        item for item in extraction.items if item.review_status == "needs_edit"
    ]
    if unresolved_edits:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{len(unresolved_edits)} item(s) still marked as 'needs_edit'. Resolve them before finalizing.",
        )

    unapproved = [item for item in extraction.items if item.review_status != "approved"]
    if unapproved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All items must be approved before finalizing ({len(unapproved)} remaining).",
        )

    extraction.status = "finalized"
    db.commit()

    approved_count = sum(1 for i in extraction.items if i.review_status == "approved")
    needs_edit_count = sum(
        1 for i in extraction.items if i.review_status == "needs_edit"
    )
    pending_count = sum(
        1 for i in extraction.items if i.review_status == "pending_review"
    )

    return ExtractionFinalizeResponse(
        extraction_id=extraction_id,
        status=extraction.status,
        total_items=len(extraction.items),
        approved_items=approved_count,
        needs_edit_items=needs_edit_count,
        pending_review_items=pending_count,
    )
