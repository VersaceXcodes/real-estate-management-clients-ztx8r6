import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

const GV_Sidebar: React.FC = () => {
  // Access global auth_state from Zustand store
  const auth_state = useAppStore((state) => state.auth_state);

  // Render nothing if the user is not a manager
  if (auth_state.role !== "manager") {
    return null;
  }

  // Local state for collapse/expand flag
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Define manager-specific sidebar navigation links
  const sidebar_links: { label: string; route: string }[] = [
    { label: "User Management", route: "/user-management" },
    { label: "Bulk Operations", route: "/clients/import" }
  ];

  // Function to toggle sidebar collapse/expand state
  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <div
      className={`flex flex-col bg-gray-100 border-r border-gray-300 h-full transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4">
        {/* Sidebar Header */}
        <h2 className="text-xl font-bold">
          {!isCollapsed ? "Manager Panel" : "MP"}
        </h2>
      </div>
      <nav className="flex-1">
        <ul>
          {sidebar_links.map((link) => (
            <li key={link.route}>
              <Link
                to={link.route}
                className="block px-4 py-2 hover:bg-gray-200"
              >
                {!isCollapsed ? link.label : link.label.charAt(0)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4">
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className="w-full px-2 py-1 border border-gray-400 rounded hover:bg-gray-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
    </div>
  );
};

export default GV_Sidebar;