import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  FolderBookmark,
} from "lucide-react";
import Button from "./atomic/Button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    id: "extractions",
    label: "Extractions",
    path: "/extractions",
    icon: FolderBookmark,
  },
];

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`p-3 bg-brand-offwhite transition-all duration-300 flex flex-col gap-4 ${isCollapsed ? "w-16 justify-center" : "w-50"} rounded-2xl h-fit`}
    >
      <div
        className={`flex flex-row items-center ${isCollapsed ? "justify-center" : "justify-between"}`}
      >
        {!isCollapsed && <h1>Taskify</h1>}
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="common"
          className="border border-brand-grey/30"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* Tabs */}
      <div className="w-full flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.id}
              className={`flex flex-row ${isActive ? "bg-brand-beige rounded-2xl border border-brand-grey/30" : ""} ${isCollapsed ? "justify-center px-0" : "justify-start gap-3 px-3"}`}
            >
              <Button
                variant="common"
                onClick={() => handleTabClick(item.path)}
              >
                <div className="flex flex-row items-center gap-3">
                  <Icon size={16} />
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${isActive ? "font-medium" : "font-normal"}`}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sidebar;
