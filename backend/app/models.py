from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Extraction(Base):
    __tablename__ = "extractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    items: Mapped[list["ChecklistItem"]] = relationship(
        "ChecklistItem",
        back_populates="extraction",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.id",
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    extraction_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("extractions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    acceptance_criteria: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    confidence_score: Mapped[Optional[Float]] = mapped_column(Float, nullable=True)
    review_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending_review"
    )

    extraction: Mapped["Extraction"] = relationship(
        "Extraction", back_populates="items"
    )
