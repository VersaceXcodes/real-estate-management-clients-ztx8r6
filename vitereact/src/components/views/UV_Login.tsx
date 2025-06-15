import React, { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  user_id: string;
  name: string;
  email: string;
  role: "agent" | "manager";
  jwt_token: string;
  is_authenticated: boolean;
}

const UV_Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error_message, setErrorMessage] = useState<string>("");

  const { set_auth_state, add_notification } = useAppStore();
  const navigate = useNavigate();

  const loginMutation = useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: async (payload: LoginPayload) => {
      // TODO: Endpoint not found in OpenAPI spec / Backend Server main code
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const response = await axios.post(`${baseUrl}/login`, payload);
      return response.data;
    },
    onSuccess: (data: LoginResponse) => {
      // Update the global auth_state with user details and jwt_token
      set_auth_state(data);
      // Dispatch a success notification
      add_notification({
        notification_id: new Date().getTime().toString(),
        message: "Login successful!",
        type: "success",
        timestamp: new Date().toISOString()
      });
      if (data.role === "agent") {
        navigate("/dashboard/agent");
      } else if (data.role === "manager") {
        navigate("/dashboard/manager");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (error: Error) => {
      setErrorMessage("Invalid credentials. Please try again.");
      add_notification({
        notification_id: new Date().getTime().toString(),
        message: "Login failed: " + error.message,
        type: "error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous error
    loginMutation.mutate({ email, password });
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
          {error_message && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert" aria-live="assertive">
              {error_message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-sm text-blue-500 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                disabled={loginMutation.isLoading}
              >
                {loginMutation.isLoading ? "Logging in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_Login;