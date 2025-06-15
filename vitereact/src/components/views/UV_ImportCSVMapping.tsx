import React, { useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface MappingDataType {
  full_name: string;
  phone: string;
  email: string;
  property_preferences: string;
  status: string;
}

interface ProgressStatusType {
  progress: number;
  error: string;
  success: boolean;
}

const UV_ImportCSVMapping: React.FC = () => {
  const navigate = useNavigate();
  const { auth_state, add_notification } = useAppStore();
  
  // Only managers are allowed to access this view
  if (auth_state.role !== "manager") {
    return (
      <>
        <div className="m-4 p-4 border border-red-500 rounded">
          <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
          <p className="mt-2">You do not have permission to access this page.</p>
          <Link to="/clients" className="mt-4 inline-block text-blue-500 underline">
            Return to Client Directory
          </Link>
        </div>
      </>
    );
  }

  // Local state variables
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mappingData, setMappingData] = useState<MappingDataType>({
    full_name: "",
    phone: "",
    email: "",
    property_preferences: "",
    status: "",
  });
  const [progressStatus, setProgressStatus] = useState<ProgressStatusType>({
    progress: 0,
    error: "",
    success: false,
  });

  // Validate mapping: all fields must be non-empty
  const isMappingValid = (): boolean => {
    return (
      mappingData.full_name.trim() !== "" &&
      mappingData.phone.trim() !== "" &&
      mappingData.email.trim() !== "" &&
      mappingData.property_preferences.trim() !== "" &&
      mappingData.status.trim() !== ""
    );
  };

  // Mutation for starting the import process. This uses the POST /clients/import endpoint.
  const importMutation = useMutation(
    async (formData: FormData) => {
      // NOTE: The endpoint is not defined in the provided OpenAPI spec.
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/clients/import`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${auth_state.jwt_token}`,
          },
        }
      );
      return response.data;
    },
    {
      onMutate: () => {
        setProgressStatus({ progress: 10, error: "", success: false });
      },
      onSuccess: (data) => {
        setProgressStatus({ progress: 100, error: "", success: true });
        add_notification({
          notification_id: `notif_${Date.now()}`,
          message: "CSV import completed successfully!",
          type: "success",
          timestamp: new Date().toISOString(),
        });
        // Redirect to Client Directory after a short delay to show success
        setTimeout(() => {
          navigate("/clients");
        }, 1500);
      },
      onError: (error: any) => {
        setProgressStatus({ progress: 0, error: "CSV import failed. Please try again.", success: false });
        add_notification({
          notification_id: `notif_${Date.now()}`,
          message: "CSV import failed. Please try again.",
          type: "error",
          timestamp: new Date().toISOString(),
        });
      },
    }
  );

  // Handle file selection event
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      // Reset progress status
      setProgressStatus({ progress: 0, error: "", success: false });
    }
  };

  // Handle changes in mapping inputs
  const handleMappingChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMappingData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Optionally could call validateMapping here if more advanced logic is needed.
  };

  // Handle form submission: start the CSV import process
  const handleStartImport = (e: FormEvent) => {
    e.preventDefault();
    // Basic validation: csv file must be selected and mapping data must be valid
    if (!csvFile) {
      setProgressStatus((prev) => ({
        ...prev,
        error: "Please select a CSV file before starting the import.",
      }));
      return;
    }
    if (!isMappingValid()) {
      setProgressStatus((prev) => ({
        ...prev,
        error: "Please fill in all mapping fields.",
      }));
      return;
    }

    const formData = new FormData();
    formData.append("csv_file", csvFile);
    // Append mapping data as JSON string
    formData.append("mapping_data", JSON.stringify(mappingData));

    // Initiate the import process via mutation
    importMutation.mutate(formData);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">CSV Import &amp; Mapping</h1>
        <p className="mb-6 text-gray-700">
          Upload a CSV file containing client records and map its headers to the application{"'"}s fields.
          Use the form below to select your file and set up the mapping configuration.
        </p>

        <form onSubmit={handleStartImport} className="space-y-6">
          {/* CSV File Upload */}
          <div>
            <label className="block text-lg font-medium mb-2" htmlFor="csvFile">
              Select CSV File
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100"
            />
            {csvFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected File: {csvFile.name}
              </p>
            )}
          </div>

          {/* Mapping Configuration */}
          <div className="border border-gray-300 p-4 rounded">
            <h2 className="text-xl font-semibold mb-4">Mapping Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1" htmlFor="full_name">
                  CSV Column for Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={mappingData.full_name}
                  onChange={handleMappingChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="e.g., Name"
                />
              </div>
              <div>
                <label className="block font-medium mb-1" htmlFor="phone">
                  CSV Column for Phone
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={mappingData.phone}
                  onChange={handleMappingChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="e.g., PhoneNumber"
                />
              </div>
              <div>
                <label className="block font-medium mb-1" htmlFor="email">
                  CSV Column for Email
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={mappingData.email}
                  onChange={handleMappingChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="e.g., EmailAddress"
                />
              </div>
              <div>
                <label className="block font-medium mb-1" htmlFor="property_preferences">
                  CSV Column for Property Preferences
                </label>
                <input
                  type="text"
                  id="property_preferences"
                  name="property_preferences"
                  value={mappingData.property_preferences}
                  onChange={handleMappingChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="e.g., Preferences"
                />
              </div>
              <div>
                <label className="block font-medium mb-1" htmlFor="status">
                  CSV Column for Status
                </label>
                <input
                  type="text"
                  id="status"
                  name="status"
                  value={mappingData.status}
                  onChange={handleMappingChange}
                  className="w-full border border-gray-300 p-2 rounded"
                  placeholder="e.g., Status"
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {progressStatus.error && (
            <div className="text-red-600 font-medium">
              {progressStatus.error}
            </div>
          )}

          {/* Progress Indicator */}
          {progressStatus.progress > 0 && (
            <div className="w-full bg-gray-200 rounded h-4" role="progressbar" aria-valuenow={progressStatus.progress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="bg-green-500 h-4 rounded"
                style={{ width: `${progressStatus.progress}%` }}
              ></div>
            </div>
          )}

          {/* Start Import Button */}
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={importMutation.isLoading}
            >
              {importMutation.isLoading ? "Importing..." : "Start Import"}
            </button>
            <Link
              to="/clients"
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_ImportCSVMapping;