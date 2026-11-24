import { useEffect, useState } from "react";
import { api, type ExtractionSummary } from "../lib/api";
import DataTable, { type TableColumn } from "react-data-table-component";
import { useNavigate } from "react-router-dom";

const columns: TableColumn<ExtractionSummary>[] = [
  { name: "ID", selector: (row) => row.id, grow: 0, sortable: true },
  {
    name: "Title",
    selector: (row) => row.title,
    maxWidth: "330px",
  },
  {
    name: "Description",
    selector: (row) => row.source_text,
    maxWidth: "330px",
    wrap: false,
  },
  { name: "Status", selector: (row) => row.status, maxWidth: "330px" },
  { name: "Created on", selector: (row) => row.created_at.split("T")[0] },
];

function Extractions() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [executions, setExecutions] = useState<ExtractionSummary[]>([]);

  useEffect(() => {
    const fetchExtractions = async () => {
      try {
        const data = await api.getAllExecutions();
        setExecutions(data);
      } catch {
        // Error toast is already handled inside request() in api.ts
      } finally {
        setIsLoading(false);
      }
    };
    fetchExtractions();
  }, []);
  return (
    <div className="flex flex-col w-full gap-4">
      <h1 className="text-3xl text-center">All Executions</h1>
      <h3 className="text-xl text-center">
        Turn raw specs into reviewable engineering tasks, edit or flag items,
        and finalize when ready.
      </h3>

      {/* 3. Render loading, empty, or data states */}
      <div className="bg-brand-offwhite p-3 rounded-xl">
        {isLoading ? (
          <p className="text-center text-brand-charcoal">
            Loading executions...
          </p>
        ) : executions.length === 0 ? (
          <p className="text-center text-brand-charcoal">
            No executions found.
          </p>
        ) : (
          //   <div className="grid gap-3 mt-4">
          //     {executions.map((item) => (
          //       <div
          //         key={item.id}
          //         className="p-4 border rounded-lg flex justify-between items-center"
          //       >
          //         <div>
          //           <h2 className="font-semibold text-lg">{item.title}</h2>
          //           <p className="text-sm text-gray-500">
          //             {new Date(item.created_at).toLocaleDateString()}
          //           </p>
          //         </div>
          //         <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100">
          //           {item.status}
          //         </span>
          //       </div>
          //     ))}
          //   </div>
          <DataTable
            columns={columns}
            data={executions}
            pagination
            pointerOnHover
            highlightOnHover
            onRowClicked={(row) => navigate(`/extractions/${row.id}`)}
          />
        )}
      </div>
    </div>
  );
}

export default Extractions;
