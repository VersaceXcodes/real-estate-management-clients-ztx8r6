import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/main";

interface NavLink {
  label: string;
  route: string;
}

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { auth_state, clear_auth_state } = useAppStore((state) => ({
    auth_state: state.auth_state,
    clear_auth_state: state.clear_auth_state
  }));

  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);

  // Update navigation links based on user role whenever auth_state changes
  useEffect(() => {
    if (auth_state.role === "manager") {
      setNavLinks([
        { label: "Dashboard", route: "/dashboard" },
        { label: "Clients", route: "/clients" },
        { label: "User Management", route: "/user-management" }
      ]);
    } else if (auth_state.role === "agent") {
      setNavLinks([
        { label: "Dashboard", route: "/dashboard" },
        { label: "Clients", route: "/clients" }
      ]);
    } else {
      setNavLinks([]);
    }
  }, [auth_state.role]);

  // Toggle profile dropdown visibility
  const toggleProfileDropdown = (): void => {
    setDropdownOpen(prev => !prev);
  };

  // Handle logout by clearing auth state and navigating to the login page
  const handleLogout = (): void => {
    clear_auth_state();
    navigate("/login");
  };

  // If user is not authenticated, do not display this nav bar.
  if (!auth_state.is_authenticated) {
    return null;
  }

  return (
    <>
      <nav className="bg-blue-600 text-white fixed top-0 left-0 right-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold">
              EstateConnect
            </Link>
          </div>
          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.route}
                className="hover:underline transition duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleProfileDropdown}
              className="flex items-center focus:outline-none"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-blue-600 font-bold">
                {auth_state.name.charAt(0).toUpperCase()}
              </div>
              <span className="ml-2">{auth_state.name}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded-md shadow-lg py-2 z-20">
                <Link
                  to="/account-settings"
                  className="block px-4 py-2 hover:bg-gray-200"
                  onClick={() => setDropdownOpen(false)}
                >
                  Account Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left block px-4 py-2 hover:bg-gray-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Placeholder div to maintain layout spacing due to fixed nav */}
      <div className="h-16"></div>
    </>
  );
};

export default GV_TopNav;