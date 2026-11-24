import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Extractions from "./pages/Extractions";
import ExtractionDetails from "./pages/ExtractionDetails";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <div className="bg-brand-gradient min-h-screen p-4 pb-10 pr-8 flex flex-row gap-8">
      <Sidebar />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/extractions" element={<Extractions />} />
        <Route path="/extractions/:id" element={<ExtractionDetails />} />
      </Routes>
      <Toaster />
    </div>
  );
}
