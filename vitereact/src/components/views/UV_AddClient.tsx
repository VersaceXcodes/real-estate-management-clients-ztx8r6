import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Type definitions for the client form data and errors
interface ClientData {
  full_name: string;
  phone: string;
  email: string;
  property_preferences: {
    location: string;
    property_type: string;
    budget: string;
    notes: string;
  };
  attachments: string[];
}

interface FormErrors {
  full_name?: string;
  phone?: string;
  email?: string;
  property_preferences?: string;
}

// Adjusted response interface to match backend DB schema
interface ClientResponse {
  client_id: string;
}

const UV_AddClient: React.FC = () => {
  const navigate = useNavigate();
  const auth_state = useAppStore((state) => state.auth_state);
  const add_notification = useAppStore((state) => state.add_notification);

  // Local state for form data and errors
  const [form_data, setFormData] = useState<ClientData>({
    full_name: "",
    phone: "",
    email: "",
    property_preferences: {
      location: "",
      property_type: "",
      budget: "",
      notes: "",
    },
    attachments: [],
  });

  const [form_errors, setFormErrors] = useState<FormErrors>({});

  // Inline validation for required top-level fields
  const validateField = (field: string, value: string): string => {
    if (!value.trim()) {
      switch (field) {
        case "full_name":
          return "Full Name is required";
        case "phone":
          return "Phone is required";
        case "email":
          return "Email is required";
        default:
          return "";
      }
    }
    return "";
  };

  // Validate that at least one property preference field is provided
  const validatePropertyPreferences = (): string => {
    const pref = form_data.property_preferences;
    if (
      !pref.location.trim() &&
      !pref.property_type.trim() &&
      !pref.budget.trim() &&
      !pref.notes.trim()
    ) {
      return "At least one property preference is required";
    }
    return "";
  };

  // Handler for input changes (handles both top-level and nested fields)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Check for nested field using dot notation (e.g., "property_preferences.location")
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ClientData],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    // Inline validation on change for top-level required fields
    if (name === "full_name" || name === "phone" || name === "email") {
      const error = validateField(name, value);
      setFormErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  // Handler for file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // For simplicity, we use file names as the attachment strings
      const files = Array.from(e.target.files).map((file) => file.name);
      setFormData((prev) => ({ ...prev, attachments: files }));
    }
  };

  // Form-wide validation before submission
  const validateForm = (): boolean => {
    let errors: FormErrors = {};
    if (!form_data.full_name.trim()) {
      errors.full_name = "Full Name is required";
    }
    if (!form_data.phone.trim()) {
      errors.phone = "Phone is required";
    }
    if (!form_data.email.trim()) {
      errors.email = "Email is required";
    }
    const prefError = validatePropertyPreferences();
    if (prefError) {
      errors.property_preferences = prefError;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Transform nested form_data into a flattened payload matching the backend schema
  const transformFormData = (data: ClientData) => ({
    full_name: data.full_name,
    phone: data.phone,
    email: data.email,
    property_location: data.property_preferences.location,
    property_type: data.property_preferences.property_type,
    budget_range: data.property_preferences.budget,
    additional_preferences: data.property_preferences.notes,
    attachments: data.attachments,
  });

  // useMutation for creating a new client record
  const createClientMutation = useMutation<ClientResponse, Error, ClientData>({
    mutationFn: async (newClient: ClientData) => {
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const payload = transformFormData(newClient);
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code - verify '/clients'
      const response = await axios.post(`${baseUrl}/clients`, payload, {
        headers: {
          Authorization: `Bearer ${auth_state.jwt_token}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Dispatch a success notification
      add_notification({
        notification_id: Date.now().toString(),
        message: "Client created successfully",
        type: "success",
        timestamp: new Date().toISOString(),
      });
      // Redirect to the newly created client profile if available, otherwise to client directory
      if (data && data.client_id) {
        navigate(`/clients/${data.client_id}`);
      } else {
        navigate("/clients");
      }
    },
    onError: (error) => {
      // Dispatch an error notification
      add_notification({
        notification_id: Date.now().toString(),
        message: error.message || "Failed to create client",
        type: "error",
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Submit handler for the form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createClientMutation.mutate(form_data);
    }
  };

  // Cancel button handler - navigates back to the client directory
  const handleCancel = () => {
    navigate("/clients");
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Add New Client</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name*
            </label>
            <input
              type="text"
              name="full_name"
              id="full_name"
              value={form_data.full_name}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
            {form_errors.full_name && (
              <p className="text-red-500 text-sm">{form_errors.full_name}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone*
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={form_data.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
            {form_errors.phone && (
              <p className="text-red-500 text-sm">{form_errors.phone}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email*
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={form_data.email}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
            {form_errors.email && (
              <p className="text-red-500 text-sm">{form_errors.email}</p>
            )}
          </div>
          <fieldset className="border border-gray-300 p-4 rounded-md">
            <legend className="text-base font-medium text-gray-900">
              Property Preferences*
            </legend>
            <div className="mb-2">
              <label
                htmlFor="property_preferences.location"
                className="block text-sm font-medium text-gray-700"
              >
                Location
              </label>
              <input
                type="text"
                name="property_preferences.location"
                id="property_preferences.location"
                value={form_data.property_preferences.location}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="mb-2">
              <label
                htmlFor="property_preferences.property_type"
                className="block text-sm font-medium text-gray-700"
              >
                Property Type
              </label>
              <input
                type="text"
                name="property_preferences.property_type"
                id="property_preferences.property_type"
                value={form_data.property_preferences.property_type}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="mb-2">
              <label
                htmlFor="property_preferences.budget"
                className="block text-sm font-medium text-gray-700"
              >
                Budget
              </label>
              <input
                type="text"
                name="property_preferences.budget"
                id="property_preferences.budget"
                value={form_data.property_preferences.budget}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div className="mb-2">
              <label
                htmlFor="property_preferences.notes"
                className="block text-sm font-medium text-gray-700"
              >
                Notes
              </label>
              <textarea
                name="property_preferences.notes"
                id="property_preferences.notes"
                value={form_data.property_preferences.notes}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            {form_errors.property_preferences && (
              <p className="text-red-500 text-sm">
                {form_errors.property_preferences}
              </p>
            )}
          </fieldset>
          <div>
            <label
              htmlFor="attachments"
              className="block text-sm font-medium text-gray-700"
            >
              Attachments
            </label>
            <input
              type="file"
              name="attachments"
              id="attachments"
              multiple
              onChange={handleFileChange}
              className="mt-1 block w-full"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={createClientMutation.isLoading}
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_AddClient;