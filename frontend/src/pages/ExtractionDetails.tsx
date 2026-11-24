import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type ExtractionDetail, type ChecklistItem } from "../lib/api";
import Button from "../components/atomic/Button";

function ExtractionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [extraction, setExtraction] = useState<ExtractionDetail | null>(null);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeBanner, setFinalizeBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        const data = await api.getExtraction(Number(id));
        setExtraction(data);
      } catch {
        // Handled by api.ts
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleExportCsv = () => {
    if (!extraction || extraction.items.length === 0) return;

    // Helper to wrap values in quotes and escape internal quotes
    const escapeCsv = (value: string | number | null) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Item ID",
      "Title",
      "Acceptance Criteria",
      "Priority",
      "Review Status",
      "Confidence Score",
    ];

    const rows = extraction.items.map((item) => [
      escapeCsv(item.id),
      escapeCsv(item.title),
      escapeCsv(item.acceptance_criteria),
      escapeCsv(item.priority),
      escapeCsv(item.review_status),
      escapeCsv(
        item.confidence_score !== null
          ? `${Math.round(item.confidence_score * 100)}%`
          : "N/A",
      ),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create a downloadable file blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Create a clean filename from the extraction title
    const safeTitle = extraction.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${safeTitle || `extraction-${extraction.id}`}-checklist.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Update a field locally in state as the user types/selects
  const handleLocalFieldChange = <K extends keyof ChecklistItem>(
    itemId: number,
    field: K,
    value: ChecklistItem[K],
  ) => {
    setExtraction((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item,
        ),
      };
    });
  };

  // Persist edits and/or review_status to backend
  const handleSaveItem = async (
    item: ChecklistItem,
    nextReviewStatus?: ChecklistItem["review_status"],
  ) => {
    setSavingItemId(item.id);
    try {
      const updated = await api.updateItem(item.id, {
        title: item.title,
        acceptance_criteria: item.acceptance_criteria,
        priority: item.priority,
        review_status: nextReviewStatus ?? item.review_status,
      });

      setExtraction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((existing) =>
            existing.id === updated.id ? updated : existing,
          ),
        };
      });
    } catch {
      // Error toast handled inside api.ts
    } finally {
      setSavingItemId(null);
    }
  };

  // Finalize the execution
  const handleFinalize = async () => {
    if (!extraction) return;
    setIsFinalizing(true);
    setFinalizeBanner(null);

    try {
      const summary = await api.finalizeExtraction(extraction.id);
      setExtraction((prev) =>
        prev ? { ...prev, status: summary.status } : prev,
      );
      setFinalizeBanner(
        `Checklist #${summary.extraction_id} finalized — ${summary.approved_items}/${summary.total_items} items approved.`,
      );
    } catch {
      // Error toast handled inside api.ts
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return (
      <p className="text-center text-brand-charcoal mt-8">
        Loading checklist items...
      </p>
    );
  }

  if (!extraction) {
    return (
      <div className="mt-8 flex flex-col w-full">
        <p className="text-brand-charcoal mb-4 text-center text-xl font-medium">
          Execution not found.
        </p>
        <div className=" mr-auto">
          <Button onClick={() => navigate("/extractions")}>← Back</Button>
        </div>
      </div>
    );
  }
  const isFinalized = extraction.status === "finalized";

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Navigation & Finalize Action */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={() => navigate(-1)}>← Back</Button>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCsv}
            disabled={extraction.items.length === 0}
          >
            Export CSV
          </Button>

          <Button
            onClick={handleFinalize}
            disabled={
              isFinalized || isFinalizing || extraction.items.length === 0
            }
          >
            {isFinalized
              ? "Finalized"
              : isFinalizing
                ? "Finalizing..."
                : "Finalize Checklist"}
          </Button>
        </div>
      </div>

      {/* Finalize Success Banner */}
      {finalizeBanner && (
        <div className="p-3 rounded-lg border border-green-700 bg-green-50 text-green-800 text-sm">
          {finalizeBanner}
        </div>
      )}

      {isFinalized && (
        <div className="p-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 text-sm">
          This checklist has been finalized. Items are locked and can no longer
          be edited.
        </div>
      )}

      {/* Parent Spec Summary Card */}
      <div className="bg-brand-offwhite p-5 rounded-xl flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{extraction.title}</h1>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-brand-gradient text-brand-charcoal">
            ID #{extraction.id} • {extraction.status}
          </span>
        </div>
        <p className="text-sm text-brand-grey whitespace-pre-line">
          {extraction.source_text}
        </p>
      </div>

      {/* Generated Checklist Items */}
      <div className="bg-brand-offwhite p-5 rounded-xl flex flex-col gap-3">
        <h2 className="text-xl font-semibold">
          Generated Checklist Items ({extraction.items.length})
        </h2>

        {extraction.items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No items were generated for this execution.
          </p>
        ) : (
          <div className="grid gap-4">
            {extraction.items.map((item) => {
              const isSaving = savingItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-gray-200 rounded-lg flex flex-col gap-3"
                >
                  {/* Title & Priority Row */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        handleLocalFieldChange(item.id, "title", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md font-semibold text-sm"
                    />

                    <select
                      value={item.priority}
                      onChange={(e) =>
                        handleLocalFieldChange(
                          item.id,
                          "priority",
                          e.target.value as ChecklistItem["priority"],
                        )
                      }
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </div>

                  {/* Acceptance Criteria */}
                  <textarea
                    rows={2}
                    value={item.acceptance_criteria}
                    onChange={(e) =>
                      handleLocalFieldChange(
                        item.id,
                        "acceptance_criteria",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700"
                  />

                  {/* Metadata & Review Action Buttons */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                    <small className="text-xs text-gray-600">
                      Review status:{" "}
                      <strong className="text-gray-900">
                        {item.review_status}
                      </strong>
                      {item.confidence_score !== null &&
                        ` · Confidence: ${Math.round(item.confidence_score * 100)}%`}
                    </small>

                    {!isFinalized && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => handleSaveItem(item)}
                        >
                          {isSaving ? "Saving..." : "Save Edits"}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isSaving}
                          onClick={() => handleSaveItem(item, "needs_edit")}
                        >
                          Needs Edit
                        </Button>
                        <Button
                          variant="success"
                          disabled={isSaving}
                          onClick={() => handleSaveItem(item, "approved")}
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtractionDetails;
