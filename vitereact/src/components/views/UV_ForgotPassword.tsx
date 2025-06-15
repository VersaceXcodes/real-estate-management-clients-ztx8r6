import React, { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

const UV_ForgotPassword: React.FC = () => {
  // Local state variables based on the datamap
  const [email, setEmail] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Global notification action from Zustand
  const addNotification = useAppStore((state) => state.add_notification);

  // Base URL for API calls
  const baseURL: string = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Define the mutation for submitting the password reset request
  const mutation = useMutation<
    any, // response type, unspecified so we use any
    Error, // error type
    string // payload type (email)
  >({
    mutationFn: (payload: string) => axios.post(`${baseURL}/password-reset-request`, { email: payload }),
    onSuccess: () => {
      setInfoMessage("Password reset instructions have been sent to your email.");
      setErrorMessage("");
    },
    onError: (error: any) => {
      setErrorMessage("Failed to send reset instructions. Please try again.");
      setInfoMessage("");
      addNotification({
        notification_id: Date.now().toString(),
        message: "Failed to send reset instructions.",
        type: "error",
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter a valid email address.");
      setInfoMessage("");
      return;
    }
    // Trigger the password reset request
    mutation.mutate(trimmedEmail);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white shadow-md rounded px-8 py-6 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Forgot Password</h1>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter your email"
                required
              />
            </div>
            {infoMessage && (
              <div className="mb-4 text-green-600 text-sm">
                {infoMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 text-red-600 text-sm">
                {errorMessage}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={mutation.isLoading}
              >
                {mutation.isLoading ? "Sending..." : "Send Reset Instructions"}
              </button>
              <Link to="/login" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;