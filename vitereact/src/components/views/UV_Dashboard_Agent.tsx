import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

// Define interfaces for dashboard data
interface DashboardMetrics {
  total_active_clients: number;
  new_leads: number;
  pending_follow_ups: number;
}

interface RecentActivity {
  activity_id: string;
  description: string;
  timestamp: string;
}

interface DashboardData {
  dashboard_metrics: DashboardMetrics;
  recent_activity: RecentActivity[];
}

const UV_Dashboard_Agent: React.FC = () => {
  // Access global auth_state from Zustand store
  const auth_state = useAppStore((state) => state.auth_state);

  // Function to fetch dashboard metrics and recent activity for the agent
  const fetchDashboardMetrics = useCallback(async (): Promise<DashboardData> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
    const response = await axios.get(
      `${baseUrl}/clients/dashboard?agent_id=${auth_state.user_id}`
    );
    return response.data;
  }, [auth_state.user_id]);

  // Use react-query to fetch the dashboard data on component load
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<DashboardData, Error>(
    ["dashboardMetrics", auth_state.user_id],
    fetchDashboardMetrics
  );

  // Function to handle exporting client data as CSV
  const handleExport = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const response = await axios.get(
        `${baseUrl}/clients/export?agent_id=${auth_state.user_id}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "clients.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 0);
    } catch (err) {
      console.error("Export failed", err);
    }
  }, [auth_state.user_id]);

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Agent Dashboard</h1>
          <div>
            <Link
              to="/clients/new"
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mr-2"
            >
              Add New Client
            </Link>
            <button
              type="button"
              onClick={handleExport}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
            >
              Export Clients
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-600">Loading dashboard data...</div>
        ) : isError ? (
          <div className="text-center text-red-600">Error loading dashboard data: {error?.message}</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-lg font-semibold">Active Clients</h2>
                <p className="text-3xl">
                  {data?.dashboard_metrics.total_active_clients}
                </p>
              </div>
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-lg font-semibold">New Leads</h2>
                <p className="text-3xl">{data?.dashboard_metrics.new_leads}</p>
              </div>
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-lg font-semibold">Pending Follow-Ups</h2>
                <p className="text-3xl">
                  {data?.dashboard_metrics.pending_follow_ups}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              {data && data.recent_activity && data.recent_activity.length > 0 ? (
                <ul className="space-y-2">
                  {data.recent_activity.map((activity) => (
                    <li key={activity.activity_id} className="bg-white shadow rounded p-4">
                      <p className="text-gray-700">{activity.description}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No recent activity available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Dashboard_Agent;