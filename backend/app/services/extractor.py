import os
from dotenv import load_dotenv
import json
import logging
import time
from groq import Groq
from groq.types.chat.completion_create_params import (
    ResponseFormat,
    ResponseFormatResponseFormatJsonSchemaJsonSchema,
)
from typing import Literal, Optional
from pydantic import BaseModel, Field, ValidationError, ConfigDict

logger = logging.getLogger(__name__)
load_dotenv()


class ExtractionError(Exception):
    """Raised when extraction can't produce valid structured items after retries."""


class DraftChecklistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=2, max_length=255)
    acceptance_criteria: str = Field(..., min_length=3, max_length=1000)
    priority: Literal["low", "medium", "high"] = "medium"
    confidence_score: Optional[float] = Field(default=0.75, ge=0.0, le=1.0)


class ExtractionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[DraftChecklistItem] = Field(..., min_length=1)


def _build_extraction_json_schema() -> ResponseFormatResponseFormatJsonSchemaJsonSchema:
    """
    Groq strict json_schema requires every object to explicitly set `additionalProperties: False` and list all properties in `required`.
    """
    return {
        "name": "checklist_extraction",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "required": ["items"],
            "properties": {
                "items": {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": [
                            "title",
                            "acceptance_criteria",
                            "priority",
                            "confidence_score",
                        ],
                        "properties": {
                            "title": {
                                "type": "string",
                                "minLength": 2,
                                "maxLength": 255,
                            },
                            "acceptance_criteria": {
                                "type": "string",
                                "minLength": 3,
                                "maxLength": 1000,
                            },
                            "priority": {
                                "type": "string",
                                "enum": ["low", "medium", "high"],
                            },
                            "confidence_score": {
                                "type": "number",
                                "minimum": 0.0,
                                "maximum": 1.0,
                            },
                        },
                    },
                }
            },
        },
    }


def _generate_raw_candidate(source_text: str, attempt: int) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY isn't set in the environment.")
    if not groq_model:
        raise RuntimeError("GROQ_MODEL isn't set in the environment.")

    client = Groq(api_key=api_key)

    system_prompt = "You are a senior product engineer converting raw specs or meeting notes into actionable engineering checklist items. Return concise titles, clear testable acceptance_criteria, accurate priority ('low', 'medium', or 'high'), and a confidence_score between 0.0 and 1.0."

    user_prompt = (
        f"Attempt #{attempt}. Extract structured checklist items from this spec:\n\n"
        f"{source_text}"
    )

    response_format: ResponseFormat = {
        "type": "json_schema",
        "json_schema": _build_extraction_json_schema(),
    }
    response = client.chat.completions.create(
        model=groq_model,
        temperature=0.2 if attempt == 1 else 0.4,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format=response_format,
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("Groq returned an empty response content.")

    return content


def extract_checklist_with_retry(
    source_text: str, max_attempts: int = 3, base_delay_seconds: float = 0.5
) -> ExtractionResult:
    """
    Runs extraction with retry + exponential backoff and enforces strict Pydantic
    schema validation on the parsed output.
    """
    lastError: Optional[Exception] = None

    for attempt in range(1, max_attempts + 1):
        try:
            raw_output = _generate_raw_candidate(
                source_text=source_text, attempt=attempt
            )
            parsed_json = json.loads(raw_output)
            return ExtractionResult.model_validate(parsed_json)
        except (
            json.JSONDecodeError,
            ValidationError,
            TimeoutError,
            RuntimeError,
            Exception,
        ) as exc:
            last_error = exc
            logger.warning(
                "Extraction attempt %s/%s failed: %s", attempt, max_attempts, exc
            )
            if attempt < max_attempts:
                sleep_time = base_delay_seconds * (2 ** (attempt - 1))
                time.sleep(sleep_time)

    raise ExtractionError(
        f"Failed to produce a valid checklist after {max_attempts} attempts: {last_error}"
    )
