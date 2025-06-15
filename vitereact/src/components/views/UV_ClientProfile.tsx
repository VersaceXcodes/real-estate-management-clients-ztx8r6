import React, { useState, useEffect, ChangeEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface ClientDetail {
  client_id: string;
  full_name: string;
  phone: string;
  email: string;
  property_preferences: {
    location: string;
    property_type: string;
    budget: string;
    notes: string;
  };
  status: string;
  last_contact: string;
  next_follow_up: string;
  // For manager assign/reassign (optional field)
  assigned_agent_id?: string;
}

interface Communication {
  log_id: string;
  communication_date: string;
  message: string;
}

interface Attachment {
  attachment_id: string;
  file_name: string;
  url: string;
}

const UV_ClientProfile: React.FC = () => {
  const { client_id } = useParams<{ client_id: string }>();
  const navigate = useNavigate();
  const { auth_state } = useAppStore();

  // Local state for inline editing
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editableData, setEditableData] = useState<ClientDetail | null>(null);
  const [assignedAgent, setAssignedAgent] = useState<string>("");

  // Base URL configuration
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Fetch Client Data
  const {
    data: clientDetail,
    isLoading: clientLoading,
    error: clientError,
    refetch,
  } = useQuery<ClientDetail, Error>(
    ["clientDetail", client_id],
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const res = await axios.get(`${baseURL}/clients/${client_id}`);
      return res.data;
    },
    {
      enabled: !!client_id,
      onSuccess: (data) => {
        setEditableData(data);
        if (auth_state.role === "manager" && data.assigned_agent_id) {
          setAssignedAgent(data.assigned_agent_id);
        }
      },
    }
  );

  // Fetch Communication Log
  const {
    data: communications,
    isLoading: communicationsLoading,
  } = useQuery<Communication[], Error>(
    ["communications", client_id],
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const res = await axios.get(`${baseURL}/clients/${client_id}/communications`);
      return res.data;
    },
    {
      enabled: !!client_id,
    }
  );

  // Fetch Attachments
  const {
    data: attachments,
    isLoading: attachmentsLoading,
  } = useQuery<Attachment[], Error>(
    ["attachments", client_id],
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const res = await axios.get(`${baseURL}/clients/${client_id}/attachments`);
      return res.data;
    },
    {
      enabled: !!client_id,
    }
  );

  // Mutation to update client data (inline edits or assign/reassign)
  const updateMutation = useMutation<ClientDetail, Error, any>(
    async (payload: any) => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const res = await axios.put(`${baseURL}/clients/${client_id}`, payload);
      return res.data;
    },
    {
      onSuccess: () => {
        refetch();
        setEditMode(false);
      },
    }
  );

  // Mutation to delete the client
  const deleteMutation = useMutation<void, Error>(
    async () => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      await axios.delete(`${baseURL}/clients/${client_id}`);
    },
    {
      onSuccess: () => {
        navigate("/clients");
      },
    }
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editableData) {
      setEditableData({ ...editableData, [name]: value });
    }
  };

  const handleNestedInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editableData) {
      setEditableData({
        ...editableData,
        property_preferences: {
          ...editableData.property_preferences,
          [name]: value,
        },
      });
    }
  };

  const handleAssignedAgentChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAssignedAgent(e.target.value);
  };

  const handleSave = () => {
    if (editableData) {
      const payload = {
        full_name: editableData.full_name,
        phone: editableData.phone,
        email: editableData.email,
        property_location: editableData.property_preferences.location,
        property_type: editableData.property_preferences.property_type,
        budget_range: editableData.property_preferences.budget,
        notes: editableData.property_preferences.notes,
        status: editableData.status,
        last_contact_date: editableData.last_contact,
        next_follow_up_date: editableData.next_follow_up,
      };
      if (auth_state.role === "manager" && assignedAgent.trim() !== "") {
        payload.assigned_agent_id = assignedAgent.trim();
      }
      updateMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteMutation.mutate();
    }
  };

  if (clientLoading) return <div className="p-4">Loading client data...</div>;
  if (clientError || !editableData)
    return <div className="p-4">Error loading client data.</div>;

  return (
    <>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Client Profile</h1>
        <Link to="/clients" className="text-blue-500 hover:underline mb-4 inline-block">
          &larr; Back to Client Directory
        </Link>
        <div className="bg-white shadow rounded p-4">
          {/* Personal Information Section */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
                {editMode ? (
                  <input
                    id="full_name"
                    type="text"
                    name="full_name"
                    value={editableData.full_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.full_name}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                {editMode ? (
                  <input
                    id="phone"
                    type="text"
                    name="phone"
                    value={editableData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.phone}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                {editMode ? (
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={editableData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.email}</p>
                )}
              </div>
            </div>
          </div>
          {/* Property Preferences Section */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Property Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                {editMode ? (
                  <input
                    id="location"
                    type="text"
                    name="location"
                    value={editableData.property_preferences.location}
                    onChange={handleNestedInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.property_preferences.location}</p>
                )}
              </div>
              <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700">Property Type</label>
                {editMode ? (
                  <input
                    id="property_type"
                    type="text"
                    name="property_type"
                    value={editableData.property_preferences.property_type}
                    onChange={handleNestedInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.property_preferences.property_type}</p>
                )}
              </div>
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Budget</label>
                {editMode ? (
                  <input
                    id="budget"
                    type="text"
                    name="budget"
                    value={editableData.property_preferences.budget}
                    onChange={handleNestedInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.property_preferences.budget}</p>
                )}
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                {editMode ? (
                  <textarea
                    id="notes"
                    name="notes"
                    value={editableData.property_preferences.notes}
                    onChange={handleNestedInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.property_preferences.notes}</p>
                )}
              </div>
            </div>
          </div>
          {/* Status & History Section */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Status & History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                {editMode ? (
                  <input
                    id="status"
                    type="text"
                    name="status"
                    value={editableData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.status}</p>
                )}
              </div>
              <div>
                <label htmlFor="last_contact" className="block text-sm font-medium text-gray-700">Last Contact</label>
                {editMode ? (
                  <input
                    id="last_contact"
                    type="text"
                    name="last_contact"
                    value={editableData.last_contact}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.last_contact}</p>
                )}
              </div>
              <div>
                <label htmlFor="next_follow_up" className="block text-sm font-medium text-gray-700">Next Follow Up</label>
                {editMode ? (
                  <input
                    id="next_follow_up"
                    type="text"
                    name="next_follow_up"
                    value={editableData.next_follow_up}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{editableData.next_follow_up}</p>
                )}
              </div>
            </div>
          </div>
          {/* Manager-Only: Assign / Reassign Section */}
          {auth_state.role === "manager" && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Assign / Reassign Client</h2>
              <div>
                <label htmlFor="assignedAgent" className="block text-sm font-medium text-gray-700">Assigned Agent ID</label>
                <input
                  id="assignedAgent"
                  type="text"
                  value={assignedAgent}
                  onChange={handleAssignedAgentChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  placeholder="Enter agent ID"
                />
              </div>
            </div>
          )}
          {/* Action Buttons */}
          <div className="flex space-x-4 mt-4">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    if (clientDetail) {
                      setEditableData(clientDetail);
                      if (auth_state.role === "manager" && clientDetail.assigned_agent_id) {
                        setAssignedAgent(clientDetail.assigned_agent_id);
                      }
                    }
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        {/* Communication Log Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Communication Log</h2>
          {communicationsLoading ? (
            <p>Loading communications...</p>
          ) : (
            <div className="bg-white shadow rounded p-4">
              {communications && communications.length > 0 ? (
                communications.map((comm) => (
                  <div key={comm.log_id} className="mb-2 border-b pb-2">
                    <p className="text-sm text-gray-600">{comm.communication_date}</p>
                    <p className="text-gray-800">{comm.message}</p>
                  </div>
                ))
              ) : (
                <p>No communications found.</p>
              )}
            </div>
          )}
        </div>
        {/* Attachments Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Attachments</h2>
          {attachmentsLoading ? (
            <p>Loading attachments...</p>
          ) : (
            <div className="bg-white shadow rounded p-4">
              {attachments && attachments.length > 0 ? (
                attachments.map((att) => (
                  <div key={att.attachment_id} className="mb-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {att.file_name}
                    </a>
                  </div>
                ))
              ) : (
                <p>No attachments found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ClientProfile;