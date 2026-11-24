from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

PriorityType = Literal["low", "medium", "high"]
ReviewStatusType = Literal["pending_review", "approved", "needs_edit"]


class ChecklistItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    acceptance_criteria: str = Field(..., min_length=1)
    priority: PriorityType = "medium"
    confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    acceptance_criteria: Optional[str] = Field(default=None, min_length=1)
    priority: Optional[PriorityType] = None
    review_status: Optional[ReviewStatusType] = None


class ChecklistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    extraction_id: int
    title: str
    acceptance_criteria: str
    priority: str
    confidence_score: Optional[float]
    review_status: str


# Create defines what the client sends, while Response defines what the API returns (including server-generated id, status, and created_at)


class ExtractionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    source_text: str = Field(..., min_length=5)


class ExtractionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    source_text: str
    status: str
    created_at: datetime
    updated_at: datetime


class ExtractionDetailResponse(ExtractionResponse):
    items: list[ChecklistItemResponse] = []


class ExtractionCountResponse(BaseModel):
    count: int


class ExtractionFinalizeResponse(BaseModel):
    extraction_id: int
    status: str
    total_items: int
    approved_items: int
    needs_edit_items: int
    pending_review_items: int
