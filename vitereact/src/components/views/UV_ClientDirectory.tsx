import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from '@/store/main';

interface Client {
  client_id: string;
  full_name: string;
  contact_info: string;
  status: string;
  date_added: string;
  assigned_agent: string;
}

const UV_ClientDirectory: React.FC = () => {
  const { global_settings } = useAppStore();
  const defaultPagination = global_settings.default_pagination;

  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("query") || "";
  const initialLimit = searchParams.get("limit") ? Number(searchParams.get("limit")) : defaultPagination;
  const initialOffset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;
  const initialSortBy = searchParams.get("sort_by") || "date_added";
  const initialSortOrder = (searchParams.get("sort_order") as "asc" | "desc") || "asc";

  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [limit, setLimit] = useState<number>(initialLimit);
  const [offset, setOffset] = useState<number>(initialOffset);
  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [filterStatus, setFilterStatus] = useState<string>(""); // local filter for client status
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Update URL search params when state changes (excluding filterStatus as it's local-only)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.query = searchQuery;
    if (limit) params.limit = limit.toString();
    if (offset) params.offset = offset.toString();
    if (sortBy) params.sort_by = sortBy;
    if (sortOrder) params.sort_order = sortOrder;
    setSearchParams(params);
  }, [searchQuery, limit, offset, sortBy, sortOrder, setSearchParams]);

  // Fetch function using react-query.
  const fetchClientList = async (): Promise<Client[]> => {
    // For production, use something like:
    // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    // const params = { query: searchQuery, limit, offset, sort_by: sortBy, sort_order: sortOrder, ...(filterStatus && { status: filterStatus }) };
    // const response = await axios.get(`${baseUrl}/clients`, { params });
    // return response.data;

    // Mock data with filtering applied if filterStatus is provided
    const mockData: Client[] = [
      {
        client_id: "1",
        full_name: "John Doe",
        contact_info: "john@example.com",
        status: "Active",
        date_added: "2023-10-01",
        assigned_agent: "Agent A"
      },
      {
        client_id: "2",
        full_name: "Jane Smith",
        contact_info: "jane@example.com",
        status: "Inactive",
        date_added: "2023-09-15",
        assigned_agent: "Agent B"
      }
    ];
    if (filterStatus) {
      return mockData.filter(client => client.status === filterStatus);
    }
    return mockData;
  };

  const { data: clientList, isLoading, isError, error, refetch } = useQuery<Client[]>({
    queryKey: ['clientList', searchQuery, limit, offset, sortBy, sortOrder, filterStatus],
    queryFn: fetchClientList
  });

  // Toggle selection for a single client
  const handleSelectClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  // Toggle select all visible clients
  const handleSelectAll = () => {
    if (!clientList) return;
    if (selectedClientIds.length === clientList.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(clientList.map(client => client.client_id));
    }
  };

  // Simulate bulk action (e.g., deletion) after confirmation
  const handleBulkAction = () => {
    if (selectedClientIds.length === 0) return;
    const confirmed = window.confirm(`Are you sure you want to perform bulk action on ${selectedClientIds.length} clients?`);
    if (confirmed) {
      // TODO: Implement actual bulk action API call if available.
      console.log("Bulk action performed on clients: ", selectedClientIds);
      setSelectedClientIds([]);
      refetch();
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Client Directory</h1>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <input
            type="text"
            placeholder="Search clients..."
            aria-label="Search clients"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 rounded"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="date_added">Date Added</option>
            <option value="full_name">Full Name</option>
            <option value="status">Status</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            className="border p-2 rounded"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <Link to="/clients/new" className="bg-blue-500 text-white p-2 rounded">
            Add New Client
          </Link>
        </div>
      </div>

      {isLoading && <p>Loading client records...</p>}
      {isError && <p>Error loading client records: {error instanceof Error ? error.message : "Unknown error"}</p>}

      {!isLoading && clientList && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="p-2 border-b">
                  <input
                    type="checkbox"
                    checked={clientList.length > 0 && selectedClientIds.length === clientList.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-2 border-b text-left">Full Name</th>
                <th className="p-2 border-b text-left">Contact Info</th>
                <th className="p-2 border-b text-left">Status</th>
                <th className="p-2 border-b text-left">Date Added</th>
                <th className="p-2 border-b text-left">Assigned Agent</th>
                <th className="p-2 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clientList.map((client) => (
                <tr key={client.client_id} className="hover:bg-gray-100">
                  <td className="p-2 border-b text-center">
                    <input
                      type="checkbox"
                      checked={selectedClientIds.includes(client.client_id)}
                      onChange={() => handleSelectClient(client.client_id)}
                    />
                  </td>
                  <td className="p-2 border-b">{client.full_name}</td>
                  <td className="p-2 border-b">{client.contact_info}</td>
                  <td className="p-2 border-b">{client.status}</td>
                  <td className="p-2 border-b">{client.date_added}</td>
                  <td className="p-2 border-b">{client.assigned_agent}</td>
                  <td className="p-2 border-b">
                    <Link to={`/clients/${client.client_id}`} className="text-blue-500 hover:underline">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedClientIds.length > 0 && (
        <div className="mt-4">
          <button onClick={handleBulkAction} className="bg-red-500 text-white p-2 rounded">
            Perform Bulk Action
          </button>
        </div>
      )}
    </div>
  );
};

export default UV_ClientDirectory;