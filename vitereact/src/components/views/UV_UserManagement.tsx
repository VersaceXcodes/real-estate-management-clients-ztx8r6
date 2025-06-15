import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface AgentProfile {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  log_id: string;
  action: string;
  timestamp: string;
}

const UV_UserManagement: React.FC = () => {
  const { auth_state, add_notification } = useAppStore();
  
  // Ensure that only managers access this view
  if (auth_state.role !== "manager") {
    return (
      <>
        <div className="p-4">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p>You do not have permission to view this page.</p>
          <Link to="/dashboard" className="text-blue-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </>
    );
  }
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clientIdInputs, setClientIdInputs] = useState<{ [agentId: string]: string }>({});
  // Local state to track which agent is being updated
  const [currentUpdatingAgent, setCurrentUpdatingAgent] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Fetch agent list using React Query
  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery<AgentProfile[], Error>(
    ["agentList"],
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const response = await axios.get(`${baseUrl}/users`);
      return response.data;
    }
  );

  // Fetch audit logs on demand (disabled by default)
  const {
    data: auditLogs,
    refetch: refetchAuditLogs,
    isFetching: auditLogsFetching,
    error: auditLogsError,
  } = useQuery<AuditLog[], Error>(
    ["auditLogs"],
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const response = await axios.get(`${baseUrl}/activity-log`);
      return response.data;
    },
    { enabled: false }
  );

  // Mutation to update client assignment
  const updateAssignmentMutation = useMutation<
    any,
    Error,
    { agentId: string; clientId: string }
  >(
    async ({ agentId, clientId }) => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const response = await axios.put(`${baseUrl}/clients/${clientId}`, { assigned_agent_id: agentId });
      return response.data;
    },
    {
      onSuccess: (_, variables) => {
        add_notification({
          notification_id: new Date().getTime().toString(),
          message: `Client ${variables.clientId} successfully assigned to agent ${variables.agentId}.`,
          type: "success",
          timestamp: new Date().toISOString(),
        });
        // Optionally, you can refetch data here if needed
      },
      onError: (error, variables) => {
        add_notification({
          notification_id: new Date().getTime().toString(),
          message: `Failed to assign Client ${variables.clientId} to agent ${variables.agentId}. ${error.message}`,
          type: "error",
          timestamp: new Date().toISOString(),
        });
      },
      onSettled: () => {
        setCurrentUpdatingAgent(null);
      },
    }
  );

  // Filter agents based on the search query
  const filteredAgents = agents?.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search agents..."
            aria-label="Search agents"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded p-2 w-full"
          />
        </div>
        {agentsLoading ? (
          <div>Loading agents...</div>
        ) : agentsError ? (
          <div className="text-red-500">Error loading agents: {agentsError.message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">User ID</th>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Role</th>
                  <th className="py-2 px-4 border-b">Reassign Client (Client ID)</th>
                  <th className="py-2 px-4 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.user_id} className="text-center">
                    <td className="py-2 px-4 border-b">{agent.user_id}</td>
                    <td className="py-2 px-4 border-b">{agent.name}</td>
                    <td className="py-2 px-4 border-b">{agent.email}</td>
                    <td className="py-2 px-4 border-b">{agent.role}</td>
                    <td className="py-2 px-4 border-b">
                      <input
                        type="text"
                        placeholder="Enter Client ID"
                        value={clientIdInputs[agent.user_id] || ""}
                        onChange={(e) =>
                          setClientIdInputs({
                            ...clientIdInputs,
                            [agent.user_id]: e.target.value,
                          })
                        }
                        className="border border-gray-300 rounded p-1"
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => {
                          const clientId = clientIdInputs[agent.user_id];
                          if (!clientId) {
                            add_notification({
                              notification_id: new Date().getTime().toString(),
                              message: "Please enter a Client ID.",
                              type: "warning",
                              timestamp: new Date().toISOString(),
                            });
                            return;
                          }
                          setCurrentUpdatingAgent(agent.user_id);
                          updateAssignmentMutation.mutate({ agentId: agent.user_id, clientId });
                        }}
                        disabled={currentUpdatingAgent === agent.user_id}
                        className="bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {currentUpdatingAgent === agent.user_id ? "Updating..." : "Reassign Client"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
          <button
            onClick={() => refetchAuditLogs()}
            className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 mb-4"
          >
            {auditLogsFetching ? "Loading Logs..." : "Load Audit Logs"}
          </button>
          {auditLogsError && (
            <div className="text-red-500">Error loading audit logs: {auditLogsError.message}</div>
          )}
          {auditLogs && auditLogs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Log ID</th>
                    <th className="py-2 px-4 border-b">Action</th>
                    <th className="py-2 px-4 border-b">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.log_id} className="text-center">
                      <td className="py-2 px-4 border-b">{log.log_id}</td>
                      <td className="py-2 px-4 border-b">{log.action}</td>
                      <td className="py-2 px-4 border-b">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="mt-8">
          <Link to="/dashboard" className="text-blue-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_UserManagement;