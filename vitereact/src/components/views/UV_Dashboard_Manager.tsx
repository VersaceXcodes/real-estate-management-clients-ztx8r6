import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

interface AggregateMetrics {
  new: number;
  in_progress: number;
  closed: number;
}

interface ActivityItem {
  activity_id: string;
  description: string;
  timestamp: string;
}

interface ManagerDashboardData {
  aggregate_metrics: AggregateMetrics;
  activity_feed: ActivityItem[];
}

const fetchAggregateMetrics = async (): Promise<ManagerDashboardData> => {
  // TODO: Endpoint not found in OpenAPI spec / Backend Server main code. Using mock data.
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        aggregate_metrics: {
          new: 5,
          in_progress: 3,
          closed: 10,
        },
        activity_feed: [
          {
            activity_id: "act1",
            description: "Client A added by Agent X",
            timestamp: new Date().toISOString(),
          },
          {
            activity_id: "act2",
            description: "Client B updated by Agent Y",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }, 500);
  });
};

const UV_Dashboard_Manager: React.FC = () => {
  const { auth_state } = useAppStore();
  if (auth_state.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-lg text-red-500">Access Denied: Manager privileges required.</p>
      </div>
    );
  }

  const { data, isLoading, isError, error } = useQuery<ManagerDashboardData, Error>({
    queryKey: ["manager_dashboard_data"],
    queryFn: fetchAggregateMetrics,
  });

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-lg">Loading...</p>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-lg text-red-500">Error: {error.message}</p>
        </div>
      ) : (
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6">Manager Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-semibold mb-2">New Clients</h2>
              <p className="text-4xl font-bold text-blue-500">{data?.aggregate_metrics.new}</p>
            </div>
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-semibold mb-2">In Progress</h2>
              <p className="text-4xl font-bold text-yellow-500">{data?.aggregate_metrics.in_progress}</p>
            </div>
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-xl font-semibold mb-2">Closed</h2>
              <p className="text-4xl font-bold text-green-500">{data?.aggregate_metrics.closed}</p>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
            {data?.activity_feed.length === 0 ? (
              <p className="text-gray-600">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {data?.activity_feed.map((activity) => (
                  <li key={activity.activity_id} className="py-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-800">{activity.description}</span>
                      <time dateTime={activity.timestamp} className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Link
              to="/user-management"
              className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              aria-label="Navigate to User Management"
            >
              User Management
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Dashboard_Manager;