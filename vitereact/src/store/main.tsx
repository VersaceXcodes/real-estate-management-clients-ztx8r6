import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Global Types and Interfaces

export interface AuthStateType {
  user_id: string;
  name: string;
  email: string;
  role: "agent" | "manager" | "";
  jwt_token: string;
  is_authenticated: boolean;
}

export interface NotificationType {
  notification_id: string;
  message: string;
  type: "success" | "error" | "warning";
  timestamp: string;
}

export interface SessionStateType {
  last_route: string;
  redirect_after_login: string;
}

export interface GlobalSettingsType {
  theme: string;
  default_pagination: number;
}

export interface AppState {
  auth_state: AuthStateType;
  notification_state: NotificationType[];
  session_state: SessionStateType;
  global_settings: GlobalSettingsType;
  socket: Socket | null;

  // Auth actions
  set_auth_state: (auth: AuthStateType) => void;
  clear_auth_state: () => void;

  // Notification actions
  add_notification: (notification: NotificationType) => void;
  remove_notification: (notification_id: string) => void;
  clear_notifications: () => void;

  // Session actions
  set_last_route: (last_route: string) => void;
  set_redirect_after_login: (redirect_after_login: string) => void;

  // Global settings actions
  set_theme: (theme: string) => void;
  set_default_pagination: (default_pagination: number) => void;

  // Realtime socket actions
  initialize_socket: () => Promise<void>;
  disconnect_socket: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Global state with default values
      auth_state: {
        user_id: "",
        name: "",
        email: "",
        role: "",
        jwt_token: "",
        is_authenticated: false,
      },
      notification_state: [],
      session_state: {
        last_route: "",
        redirect_after_login: "",
      },
      global_settings: {
        theme: "light",
        default_pagination: 10,
      },
      socket: null,

      // Auth actions
      set_auth_state: (auth) => set({ auth_state: auth }),
      clear_auth_state: () =>
        set({
          auth_state: {
            user_id: "",
            name: "",
            email: "",
            role: "",
            jwt_token: "",
            is_authenticated: false,
          },
        }),

      // Notification actions
      add_notification: (notification) =>
        set((state) => ({
          notification_state: [...state.notification_state, notification],
        })),
      remove_notification: (notification_id) =>
        set((state) => ({
          notification_state: state.notification_state.filter(
            (n) => n.notification_id !== notification_id
          ),
        })),
      clear_notifications: () => set({ notification_state: [] }),

      // Session actions
      set_last_route: (last_route) =>
        set((state) => ({
          session_state: { ...state.session_state, last_route },
        })),
      set_redirect_after_login: (redirect_after_login) =>
        set((state) => ({
          session_state: { ...state.session_state, redirect_after_login },
        })),

      // Global settings actions
      set_theme: (theme) =>
        set((state) => ({
          global_settings: { ...state.global_settings, theme },
        })),
      set_default_pagination: (default_pagination) =>
        set((state) => ({
          global_settings: { ...state.global_settings, default_pagination },
        })),

      // Realtime socket actions
      initialize_socket: async () => {
        if (!get().socket) {
          const base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
          const socket = io(base_url);
          set({ socket });
        }
      },
      disconnect_socket: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({ socket: null });
        }
      },
    }),
    {
      name: 'app_store', // name of item in storage
      partialize: (state) => ({
        auth_state: state.auth_state,
        notification_state: state.notification_state,
        session_state: state.session_state,
        global_settings: state.global_settings,
      }),
    }
  )
);