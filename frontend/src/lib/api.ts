import toast from "react-hot-toast";

const API_BASE_URL: string = import.meta.env.VITE_API_URL;

export type Priority = "low" | "medium" | "high";
export type ReviewStatus = "pending_review" | "approved" | "needs_edit";

export interface ChecklistItem {
  id: number;
  extraction_id: number;
  title: string;
  acceptance_criteria: string;
  priority: Priority;
  confidence_score: number | null;
  review_status: ReviewStatus;
}

export interface ExtractionSummary {
  id: number;
  title: string;
  source_text: string;
  status: string;
  created_at: string;
}

export interface ExtractionDetail extends ExtractionSummary {
  items: ChecklistItem[];
}

export interface FinalizeSummary {
  extraction_id: number;
  status: string;
  total_items: number;
  approved_items: number;
  needs_edit_items: number;
  pending_review_items: number;
}

export interface ExtractionCount {
  count: number;
}

interface RequestOptions extends RequestInit {
  successMessage?: string; // Optional message to trigger a success toast
}

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { successMessage, ...init } = options ?? {};

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const errorBody = await res.json();
        if (typeof errorBody?.detail === "string") {
          message = errorBody.detail;
        }
      } catch {
        // Ignore non-json error responses
      }
      throw new Error(message);
    }

    const data = (await res.json()) as T;

    // 1. Show success toast only when a message is provided
    if (successMessage) {
      toast.success(successMessage, {
        position: "top-right",
      });
    }

    return data;
  } catch (err) {
    // 2. Catches BOTH HTTP errors (!res.ok) and network/server-down errors
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    toast.error(message, {
      position: "top-right",
    });
    throw err;
  }
}

export const api = {
  getExtractionCount: () =>
    request<ExtractionCount>("/api/extractions/count", {
      method: "GET",
    }),

  getAllExecutions: () =>
    request<ExtractionSummary[]>("/api/extractions", {
      method: "GET",
    }),

  createExtraction: (title: string, source_text: string) =>
    request<ExtractionSummary>("/api/extractions", {
      method: "POST",
      body: JSON.stringify({ title, source_text }),
    }),

  runExtraction: (extractionId: number) =>
    request<ExtractionDetail>(`/api/extractions/${extractionId}/extract`, {
      method: "POST",
    }),

  getExtraction: (extractionId: number) =>
    request<ExtractionDetail>(`/api/extractions/${extractionId}`),

  updateItem: (
    itemId: number,
    patch: Partial<
      Pick<
        ChecklistItem,
        "title" | "acceptance_criteria" | "priority" | "review_status"
      >
    >,
  ) =>
    request<ChecklistItem>(`/api/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  finalizeExtraction: (extractionId: number) =>
    request<FinalizeSummary>(`/api/extractions/${extractionId}/finalize`, {
      method: "POST",
    }),
};
