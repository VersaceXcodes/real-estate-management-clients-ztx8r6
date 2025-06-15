import React, { Component } from "react";
import { BrowserRouter, Route, Routes, Outlet, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* Import views: shared global views (GV_*) and unique views (UV_*) */
import GV_TopNav from '@/components/views/GV_TopNav.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';
import GV_Notifications from '@/components/views/GV_Notifications.tsx';
import GV_Sidebar from '@/components/views/GV_Sidebar.tsx';
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword.tsx';
import UV_Dashboard_Agent from '@/components/views/UV_Dashboard_Agent.tsx';
import UV_Dashboard_Manager from '@/components/views/UV_Dashboard_Manager.tsx';
import UV_ClientDirectory from '@/components/views/UV_ClientDirectory.tsx';
import UV_ClientProfile from '@/components/views/UV_ClientProfile.tsx';
import UV_AddClient from '@/components/views/UV_AddClient.tsx';
import UV_ImportCSVMapping from '@/components/views/UV_ImportCSVMapping.tsx';
import UV_UserManagement from '@/components/views/UV_UserManagement.tsx';

import { useAppStore } from '@/store/main';

// Instantiate a single QueryClient (outside of component to avoid recreation)
const queryClient = new QueryClient();

/* Global Error Boundary to catch runtime errors in the component tree */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log the error details for debugging or reporting.
    console.error("ErrorBoundary caught an error:", error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center">
          <h1>Something went wrong. Please try again later.</h1>
        </div>
      );
    }
    return this.props.children;
  }
}

/* A simple NotFound component to handle unmatched routes */
const NotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <h1>404 - Page Not Found</h1>
  </div>
);

// Layout for authenticated (or guest logged in) views that need global shared components.
const AuthLayout: React.FC = () => {
  const { auth_state } = useAppStore();
  const location = useLocation();

  // Only show GV_Sidebar if the user is a manager and the current route is one of the ones that require extra navigation.
  const showSidebar =
    auth_state.role === "manager" &&
    (location.pathname === "/dashboard" || location.pathname === "/user-management");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Top Navigation */}
      <GV_TopNav />

      {/* Global Notifications */}
      <GV_Notifications />

      {/* Main content area with optional sidebar */}
      <div className="flex flex-1">
        {showSidebar && <GV_Sidebar />}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>

      {/* Global Footer */}
      <GV_Footer />
    </div>
  );
};

// RoleDashboard component to conditionally render the appropriate dashboard based on user role.
const RoleDashboard: React.FC = () => {
  const { auth_state } = useAppStore();
  return auth_state.role === "manager" ? <UV_Dashboard_Manager /> : <UV_Dashboard_Agent />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes (No shared global views) */}
            <Route path="/login" element={<UV_Login />} />
            <Route path="/forgot-password" element={<UV_ForgotPassword />} />

            {/* Authenticated / Guest Routes with shared global components */}
            <Route element={<AuthLayout />}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/clients" element={<UV_ClientDirectory />} />
              <Route path="/clients/:client_id" element={<UV_ClientProfile />} />
              <Route path="/clients/new" element={<UV_AddClient />} />
              <Route path="/clients/import" element={<UV_ImportCSVMapping />} />
              <Route path="/user-management" element={<UV_UserManagement />} />
            </Route>
            
            {/* Fallback Route for unmatched URLs */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;