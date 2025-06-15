import { z } from 'zod';

/* ================================================================
   USERS Schemas
   ================================================================ */

// Entity schema for users (used in responses)
export const userEntitySchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: z.string(),
  last_login_at: z.coerce.date().nullable(), // can be null if the user hasn’t logged in
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Input schema for creating a new user (exclude auto-generated fields)
export const createUserInputSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }).max(255),
  email: z.string().email({ message: "Invalid email address" }),
  password_hash: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  role: z.string().min(1, { message: "Role is required" }),
  // last_login_at is optional on creation
  last_login_at: z.coerce.date().nullable().optional(),
  // is_active can be provided but defaults to true at the database level if omitted
  is_active: z.boolean().optional(),
});

// Input schema for updating a user (identification via user_id, other fields optional)
export const updateUserInputSchema = z.object({
  user_id: z.string({ required_error: "User ID is required for update" }),
  name: z.string().min(1, { message: "Name cannot be empty" }).max(255).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  password_hash: z.string().min(6, { message: "Password must be at least 6 characters long" }).optional(),
  role: z.string().min(1, { message: "Role cannot be empty" }).optional(),
  last_login_at: z.coerce.date().nullable().optional(),
  is_active: z.boolean().optional(),
});

// Query schema for searching/filtering users
export const searchUserQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});


/* ================================================================
   CLIENTS Schemas
   ================================================================ */

// Entity schema for clients
export const clientEntitySchema = z.object({
  client_id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  property_location: z.string().nullable(),
  property_type: z.string().nullable(),
  budget_range: z.string().nullable(),
  additional_preferences: z.string().nullable(),
  status: z.string(),
  last_contact_date: z.coerce.date().nullable(),
  next_follow_up_date: z.coerce.date().nullable(),
  assigned_agent_id: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable(),
});

// Input schema for creating a new client (exclude auto-generated and primary key fields)
export const createClientInputSchema = z.object({
  full_name: z.string().min(1, { message: "Full name is required" }).max(255),
  phone: z.string().min(7, { message: "Phone number seems too short" }).max(20),
  email: z.string().email({ message: "Invalid email address" }),
  property_location: z.string().nullable().optional(),
  property_type: z.string().nullable().optional(),
  budget_range: z.string().nullable().optional(),
  additional_preferences: z.string().nullable().optional(),
  status: z.string().min(1, { message: "Status is required" }),
  last_contact_date: z.coerce.date().nullable().optional(),
  next_follow_up_date: z.coerce.date().nullable().optional(),
  assigned_agent_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Input schema for updating a client (client_id is required; other fields optional)
export const updateClientInputSchema = z.object({
  client_id: z.string({ required_error: "Client ID is required for update" }),
  full_name: z.string().min(1, { message: "Full name cannot be empty" }).max(255).optional(),
  phone: z.string().min(7, { message: "Phone number seems too short" }).max(20).optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  property_location: z.string().nullable().optional(),
  property_type: z.string().nullable().optional(),
  budget_range: z.string().nullable().optional(),
  additional_preferences: z.string().nullable().optional(),
  status: z.string().min(1, { message: "Status cannot be empty" }).optional(),
  last_contact_date: z.coerce.date().nullable().optional(),
  next_follow_up_date: z.coerce.date().nullable().optional(),
  assigned_agent_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Query schema for searching/filtering clients
export const searchClientQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['full_name', 'created_at', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});


/* ================================================================
   COMMUNICATIONS_LOG Schemas
   ================================================================ */

// Entity schema for communications_log
export const communicationsLogEntitySchema = z.object({
  log_id: z.string(),
  client_id: z.string(),
  created_by: z.string(),
  communication_date: z.coerce.date(),
  note: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable(),
});

// Input schema for creating a new communications_log entry
export const createCommunicationsLogInputSchema = z.object({
  client_id: z.string({ required_error: "Client ID is required" }),
  created_by: z.string({ required_error: "Created by is required" }),
  communication_date: z.coerce.date({ required_error: "Communication date is required" }),
  note: z.string().min(1, { message: "Note cannot be empty" }),
});

// Input schema for updating a communications_log entry
export const updateCommunicationsLogInputSchema = z.object({
  log_id: z.string({ required_error: "Log ID is required for update" }),
  client_id: z.string().optional(),
  created_by: z.string().optional(),
  communication_date: z.coerce.date().optional(),
  note: z.string().min(1, { message: "Note cannot be empty" }).optional(),
});

// Query schema for communications_log
export const searchCommunicationsLogQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['communication_date', 'created_at']).default('communication_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});


/* ================================================================
   CLIENT_ATTACHMENTS Schemas
   ================================================================ */

// Entity schema for client_attachments
export const clientAttachmentEntitySchema = z.object({
  attachment_id: z.string(),
  client_id: z.string(),
  uploaded_by: z.string(),
  file_name: z.string(),
  file_url: z.string().url({ message: "File URL must be a valid URL" }),
  uploaded_at: z.coerce.date(),
});

// Input schema for creating a new client_attachment
export const createClientAttachmentInputSchema = z.object({
  client_id: z.string({ required_error: "Client ID is required" }),
  uploaded_by: z.string({ required_error: "Uploaded by is required" }),
  file_name: z.string().min(1, { message: "File name is required" }),
  file_url: z.string().min(1, { message: "File URL is required" }).url({ message: "Must be a valid URL" }),
  uploaded_at: z.coerce.date({ required_error: "Upload date is required" }),
});

// Input schema for updating a client_attachment
export const updateClientAttachmentInputSchema = z.object({
  attachment_id: z.string({ required_error: "Attachment ID is required for update" }),
  client_id: z.string().optional(),
  uploaded_by: z.string().optional(),
  file_name: z.string().min(1, { message: "File name cannot be empty" }).optional(),
  file_url: z.string().min(1, { message: "File URL cannot be empty" }).url({ message: "Must be a valid URL" }).optional(),
  uploaded_at: z.coerce.date().optional(),
});

// Query schema for client_attachments
export const searchClientAttachmentQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['uploaded_at', 'file_name']).default('uploaded_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});


/* ================================================================
   ACTIVITY_LOG Schemas
   ================================================================ */

// Entity schema for activity_log
export const activityLogEntitySchema = z.object({
  activity_id: z.string(),
  user_id: z.string(),
  client_id: z.string().nullable(),
  action_type: z.string(),
  action_details: z.string().nullable(),
  timestamp: z.coerce.date(),
});

// Input schema for creating a new activity_log entry
export const createActivityLogInputSchema = z.object({
  user_id: z.string({ required_error: "User ID is required" }),
  // client_id is optional and may be null
  client_id: z.string().nullable().optional(),
  action_type: z.string().min(1, { message: "Action type is required" }),
  action_details: z.string().nullable().optional(),
  timestamp: z.coerce.date({ required_error: "Timestamp is required" }),
});

// Input schema for updating an activity_log entry
export const updateActivityLogInputSchema = z.object({
  activity_id: z.string({ required_error: "Activity ID is required for update" }),
  user_id: z.string().optional(),
  client_id: z.string().nullable().optional(),
  action_type: z.string().min(1, { message: "Action type cannot be empty" }).optional(),
  action_details: z.string().nullable().optional(),
  timestamp: z.coerce.date().optional(),
});

// Query schema for activity_log
export const searchActivityLogQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['timestamp', 'action_type']).default('timestamp'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});


/* ================================================================
   PASSWORD_RESET_REQUESTS Schemas
   ================================================================ */

// Entity schema for password_reset_requests
export const passwordResetRequestEntitySchema = z.object({
  request_id: z.string(),
  user_id: z.string(),
  reset_token: z.string(),
  created_at: z.coerce.date(),
  expires_at: z.coerce.date(),
  consumed: z.boolean(),
});

// Input schema for creating a new password_reset_request
export const createPasswordResetRequestInputSchema = z.object({
  user_id: z.string({ required_error: "User ID is required" }),
  reset_token: z.string().min(1, { message: "Reset token is required" }),
  expires_at: z.coerce.date({ required_error: "Expiration date is required" }),
  // Consumed defaults to false if not provided; optional in input
  consumed: z.boolean().optional(),
});

// Input schema for updating a password_reset_request
export const updatePasswordResetRequestInputSchema = z.object({
  request_id: z.string({ required_error: "Request ID is required for update" }),
  user_id: z.string().optional(),
  reset_token: z.string().min(1, { message: "Reset token cannot be empty" }).optional(),
  expires_at: z.coerce.date().optional(),
  consumed: z.boolean().optional(),
});

// Query schema for password_reset_requests
export const searchPasswordResetRequestQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'expires_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});