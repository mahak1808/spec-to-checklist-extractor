import { useState } from "react";
import { api } from "../lib/api";

import Button from "../components/atomic/Button";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const SAMPLE_SPEC = `Checkout & Payment Reliability Spec:
- Users must be authenticated before placing an order.
- Validate inventory stock on the backend before charging payment.
- Show clear error feedback if payment fails and allow retrying without duplicate charges.
- Add optional gift message support as a lower-priority polish item.`;

function Dashboard() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Checkout & Payment Reliability");
  const [sourceText, setSourceText] = useState(SAMPLE_SPEC);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCreateAndExtract(title: string, sourceText: string) {
    setErrorMsg(null);

    if (!title.trim() || sourceText.trim().length < 5) {
      setErrorMsg("Provide a title and at least 5 characters of spec text.");
      toast.error(errorMsg, { position: "top-right" });
      return;
    }

    setIsExtracting(true);
    try {
      const created = await api.createExtraction(
        title.trim(),
        sourceText.trim(),
      );
      const detail = await api.runExtraction(created.id);
      console.log(detail);
      navigate(`/extractions/${created.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <h1 className="text-3xl text-center">Spec-to-Checklist Extractor</h1>
      <h3 className="text-xl text-center">
        Turn raw specs into reviewable engineering tasks, edit or flag items,
        and finalize when ready.
      </h3>

      {/* Form */}
      <div>
        <div className="mb-3 bg-brand-offwhite p-3 rounded-xl">
          <label htmlFor="spec-title" className="text-xl font-medium mb-2">
            Spec Title
          </label>
          <input
            id="spec-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-brand-beige p-2 w-full"
          />
        </div>

        <div className="mb-3 bg-brand-offwhite p-3 rounded-xl">
          <label htmlFor="spec-text" className="text-xl font-medium mb-2">
            Raw Spec / Notes
          </label>
          <textarea
            id="spec-text"
            rows={6}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="bg-brand-beige p-2 w-full"
          />
        </div>

        <div className="flex flex-row gap-3">
          <Button
            disabled={isExtracting}
            onClick={() => handleCreateAndExtract(title, sourceText)}
          >
            {isExtracting ? "Extracting with Groq..." : "Create & Extract"}
          </Button>
          <Button
            disabled={isExtracting}
            onClick={() => {
              setTitle("Checkout & Payment Reliability");
              setSourceText(SAMPLE_SPEC);
              toast.success("Data has been reset to sample data.", {
                position: "top-right",
              });
            }}
          >
            Reset Sample Spec
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
