import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as csvParse } from 'csv-parse';
import { Parser as Json2csvParser } from 'json2csv';
import pkg from 'pg';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const {
  DATABASE_URL,
  PGHOST,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  PGPORT = 5432,
  JWT_SECRET,
  PORT,
  SENDGRID_API_KEY,
  SENDGRID_SENDER_EMAIL,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER
} = process.env;

// Initialize PostgreSQL Pool
const pool = new pkg.Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { require: true }
      }
    : {
        host: PGHOST || "ep-ancient-dream-abbsot9k-pooler.eu-west-2.aws.neon.tech",
        database: PGDATABASE || "neondb",
        user: PGUSER || "neondb_owner",
        password: PGPASSWORD || "npg_jAS3aITLC5DX",
        port: Number(PGPORT),
        ssl: { require: true }
      }
);

// Initialize SendGrid if API key is present
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Initialize Twilio client if credentials are present
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Import zod schemas from the zodschemas.js file (located in the backend root)
import {
  userEntitySchema,
  createUserInputSchema,
  updateUserInputSchema,
  searchUserQuerySchema,
  clientEntitySchema,
  createClientInputSchema,
  updateClientInputSchema,
  searchClientQuerySchema,
  communicationsLogEntitySchema,
  createCommunicationsLogInputSchema,
  updateCommunicationsLogInputSchema,
  searchCommunicationsLogQuerySchema,
  clientAttachmentEntitySchema,
  createClientAttachmentInputSchema,
  updateClientAttachmentInputSchema,
  searchClientAttachmentQuerySchema,
  activityLogEntitySchema,
  createActivityLogInputSchema,
  updateActivityLogInputSchema,
  searchActivityLogQuerySchema,
  passwordResetRequestEntitySchema,
  createPasswordResetRequestInputSchema,
  updatePasswordResetRequestInputSchema,
  searchPasswordResetRequestQuerySchema,
} from './zodschemas.js';

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the Express app
const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory (boilerplate code)
app.use(express.static(path.join(__dirname, 'public')));

// Serve attachments from the storage folder
const attachmentsPath = path.join(__dirname, 'storage', 'attachments');
if (!fs.existsSync(attachmentsPath)) {
  fs.mkdirSync(attachmentsPath, { recursive: true });
}
app.use('/attachments', express.static(attachmentsPath));

/*
  JWT Authentication middleware.
  This middleware checks the Authorization header for a valid token.
*/
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/*
  Multer setup for CSV import using memory storage.
  Files are processed from memory and then discarded.
*/
const csvUpload = multer({ storage: multer.memoryStorage() });

/*
  Multer setup for attachments upload.
  Files are stored on disk in the ./storage/attachments folder.
*/
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, attachmentsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});
const attachmentUpload = multer({ storage: attachmentStorage });

/* ===========================================
   Authentication Endpoints
===========================================*/

/*
  POST /login
  - Validates user credentials, compares password (simple equality here),
    updates last_login_at, and returns a JWT token along with basic user details.
*/
app.post('/login', async (req, res) => {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    const parsedBody = loginSchema.parse(req.body);
    const { email, password } = parsedBody;

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = userResult.rows[0];

    // Use bcrypt.compare for secure password verification
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last_login_at and updated_at timestamp
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);

    const tokenPayload = {
      user_id: user.user_id,
      name: user.name,
      role: user.role
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

    const userData = userEntitySchema.pick({ user_id: true, name: true, role: true }).parse(user);
    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /password-reset-request
  - Initiates a password reset by generating a unique reset token, inserting a new request record into the database,
    and sending password reset instructions via SendGrid.
*/
app.post('/password-reset-request', async (req, res) => {
  try {
    const resetReqSchema = z.object({
      email: z.string().email()
    });
    const parsedBody = resetReqSchema.parse(req.body);
    const { email } = parsedBody;

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const request_id = uuidv4();
      const reset_token = uuidv4();
      const expires_at = new Date(Date.now() + 3600000).toISOString(); // Expires in 1 hour

      // Insert password reset request record into DB
      await pool.query(
        `INSERT INTO password_reset_requests (request_id, user_id, reset_token, created_at, expires_at, consumed)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, FALSE)`,
        [request_id, user.user_id, reset_token, expires_at]
      );

      // Build email message with reset link using SendGrid
      if (SENDGRID_API_KEY && SENDGRID_SENDER_EMAIL) {
        const msg = {
          to: email,
          from: SENDGRID_SENDER_EMAIL,
          subject: 'Password Reset Request',
          text: `Hello, please click the following link to reset your password: https://yourapp.com/reset?token=${reset_token}&request_id=${request_id}`,
          html: `<p>Hello, please click the following link to reset your password:</p>
                 <a href="https://yourapp.com/reset?token=${reset_token}&request_id=${request_id}">Reset Password</a>`
        };
        try {
          const sendResponse = await sgMail.send(msg);
          // Optionally, check sendResponse[0].statusCode === 202
        } catch (apiError) {
          console.error("SendGrid error:", apiError);
          // You might decide to handle this error (e.g., queue for retry) without affecting the response
        }
      }
    }
    // Always return the same response for security reasons
    res.json({ message: "Password reset instructions sent if email exists." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /password-reset
  - Accepts a reset token and a new password, updates the user's password, and marks the reset request as consumed.
*/
app.post('/password-reset', async (req, res) => {
  try {
    const resetSchema = z.object({
      reset_token: z.string(),
      new_password: z.string().min(6, { message: "Password must be at least 6 characters long" })
    });
    const parsedBody = resetSchema.parse(req.body);
    const { reset_token, new_password } = parsedBody;

    const resetResult = await pool.query('SELECT * FROM password_reset_requests WHERE reset_token = $1', [reset_token]);
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    const resetRequest = resetResult.rows[0];
    if (resetRequest.consumed) {
      return res.status(400).json({ error: "Reset token already used" });
    }
    if (new Date(resetRequest.expires_at) < new Date()) {
      return res.status(400).json({ error: "Reset token expired" });
    }

    // Hash the new password before updating
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [hashedPassword, resetRequest.user_id]);

    // Mark reset request as consumed
    await pool.query('UPDATE password_reset_requests SET consumed = TRUE WHERE request_id = $1', [resetRequest.request_id]);

    res.json({ message: "Password successfully updated." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================================
   Client Endpoints
===========================================*/

/*
  GET /clients
  - Retrieves a paginated list of client records.
  - Agents only see their own clients; Managers see all.
  - Supports query filtering, sorting, and pagination.
*/
app.get('/clients', authenticateJWT, async (req, res) => {
  try {
    const parsedQuery = searchClientQuerySchema.parse(req.query);
    let { query: searchQuery, limit, offset, sort_by, sort_order } = parsedQuery;

    // Whitelist sorting parameters
    const allowedSortBy = ['client_id', 'full_name', 'created_at', 'updated_at'];
    const allowedSortOrder = ['ASC', 'DESC'];
    sort_by = allowedSortBy.includes(sort_by) ? sort_by : 'full_name';
    sort_order = allowedSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    let baseQuery = 'SELECT * FROM clients WHERE deleted_at IS NULL';
    const queryParams = [];

    if (req.user.role === 'agent') {
      queryParams.push(req.user.user_id);
      baseQuery += ` AND assigned_agent_id = $${queryParams.length}`;
    }
    if (searchQuery) {
      queryParams.push(`%${searchQuery}%`);
      baseQuery += ` AND full_name ILIKE $${queryParams.length}`;
    }
    baseQuery += ` ORDER BY ${sort_by} ${sort_order}`;
    queryParams.push(limit, offset);
    baseQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(baseQuery, queryParams);
    const clients = result.rows.map(row => clientEntitySchema.parse(row));
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  GET /clients/:client_id
  - Retrieves detailed data for a specific client.
  - Ensures an agent sees only their assigned client.
*/
app.get('/clients/:client_id', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const result = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const client = result.rows[0];
    if (req.user.role === 'agent' && client.assigned_agent_id !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(clientEntitySchema.parse(client));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /clients
  - Creates a new client record.
  - Uses createClientInputSchema for validation, generates client_id and timestamps.
*/
app.post('/clients', authenticateJWT, async (req, res) => {
  try {
    const parsedBody = createClientInputSchema.parse(req.body);
    const client_id = uuidv4();
    const now = new Date().toISOString();

    if (req.user.role === 'agent' && !parsedBody.assigned_agent_id) {
      parsedBody.assigned_agent_id = req.user.user_id;
    }

    const insertQuery = `
      INSERT INTO clients 
      (client_id, full_name, phone, email, property_location, property_type, budget_range, additional_preferences, status, last_contact_date, next_follow_up_date, assigned_agent_id, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`;
    const values = [
      client_id,
      parsedBody.full_name,
      parsedBody.phone,
      parsedBody.email,
      parsedBody.property_location || null,
      parsedBody.property_type || null,
      parsedBody.budget_range || null,
      parsedBody.additional_preferences || null,
      parsedBody.status,
      parsedBody.last_contact_date || null,
      parsedBody.next_follow_up_date || null,
      parsedBody.assigned_agent_id || null,
      parsedBody.notes || null,
      now,
      now
    ];
    const result = await pool.query(insertQuery, values);
    res.status(201).json(clientEntitySchema.parse(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  PUT /clients/:client_id
  - Updates an existing client record.
  - Validates input using updateClientInputSchema and sets updated_at automatically.
  - Checks permission for agent updates.
*/
app.put('/clients/:client_id', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const parsedBody = updateClientInputSchema.parse({ ...req.body, client_id });

    const currentResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const currentClient = currentResult.rows[0];
    if (req.user.role === 'agent' && currentClient.assigned_agent_id !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let updateFields = [];
    let values = [];
    let idx = 1;
    for (const key in parsedBody) {
      if (key !== 'client_id') {
        updateFields.push(`${key} = $${idx}`);
        values.push(parsedBody[key]);
        idx++;
      }
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    const updateQuery = `UPDATE clients SET ${updateFields.join(', ')} WHERE client_id = $${idx} RETURNING *`;
    values.push(client_id);
    const result = await pool.query(updateQuery, values);
    res.json(clientEntitySchema.parse(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  DELETE /clients/:client_id
  - Performs a soft delete by setting the deleted_at timestamp.
  - Checks permissions for agents.
*/
app.delete('/clients/:client_id', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const currentResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    const currentClient = currentResult.rows[0];
    if (req.user.role === 'agent' && currentClient.assigned_agent_id !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await pool.query('UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE client_id = $1', [client_id]);
    res.json({ message: "Client record soft-deleted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /clients/import
  - Accepts a CSV file upload, parses each row, validates with createClientInputSchema,
    and inserts the client record into the database.
  - Only managers are allowed to perform import.
*/
app.post('/clients/import', authenticateJWT, csvUpload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: "Only managers can import clients." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required." });
    }
    csvParse(req.file.buffer, { columns: true, trim: true }, async (err, records) => {
      if (err) return res.status(400).json({ error: err.message });
      let successCount = 0;
      let errorCount = 0;
      for (const record of records) {
        try {
          const data = createClientInputSchema.parse(record);
          const client_id = uuidv4();
          const now = new Date().toISOString();
          const insertQuery = `
            INSERT INTO clients 
            (client_id, full_name, phone, email, property_location, property_type, budget_range, additional_preferences, status, last_contact_date, next_follow_up_date, assigned_agent_id, notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
          const values = [
            client_id,
            data.full_name,
            data.phone,
            data.email,
            data.property_location || null,
            data.property_type || null,
            data.budget_range || null,
            data.additional_preferences || null,
            data.status,
            data.last_contact_date || null,
            data.next_follow_up_date || null,
            data.assigned_agent_id || null,
            data.notes || null,
            now,
            now
          ];
          await pool.query(insertQuery, values);
          successCount++;
        } catch (parseError) {
          errorCount++;
        }
      }
      res.json({ message: "CSV import completed", successCount, errorCount });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  GET /clients/export
  - Exports client records as CSV.
  - Uses similar filtering as GET /clients.
*/
app.get('/clients/export', authenticateJWT, async (req, res) => {
  try {
    const parsedQuery = searchClientQuerySchema.parse(req.query);
    let { query: searchQuery, limit, offset, sort_by, sort_order } = parsedQuery;

    // Whitelist sorting parameters
    const allowedSortBy = ['client_id', 'full_name', 'created_at', 'updated_at'];
    const allowedSortOrder = ['ASC', 'DESC'];
    sort_by = allowedSortBy.includes(sort_by) ? sort_by : 'full_name';
    sort_order = allowedSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    let baseQuery = 'SELECT * FROM clients WHERE deleted_at IS NULL';
    const queryParams = [];
    if (req.user.role === 'agent') {
      queryParams.push(req.user.user_id);
      baseQuery += ` AND assigned_agent_id = $${queryParams.length}`;
    }
    if (searchQuery) {
      queryParams.push(`%${searchQuery}%`);
      baseQuery += ` AND full_name ILIKE $${queryParams.length}`;
    }
    baseQuery += ` ORDER BY ${sort_by} ${sort_order}`;
    queryParams.push(limit, offset);
    baseQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const result = await pool.query(baseQuery, queryParams);
    const clients = result.rows;
    const json2csvParser = new Json2csvParser();
    const csv = json2csvParser.parse(clients);
    res.header('Content-Type', 'text/csv');
    res.attachment('clients_export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================================
   Communication Logs Endpoints
===========================================*/

/*
  GET /clients/:client_id/communications
  - Retrieves communication log entries for a specific client.
*/
app.get('/clients/:client_id/communications', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const clientResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    if (req.user.role === 'agent' && clientResult.rows[0].assigned_agent_id !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const commResult = await pool.query('SELECT * FROM communications_log WHERE client_id = $1 ORDER BY communication_date DESC', [client_id]);
    const communications = commResult.rows.map(row => communicationsLogEntitySchema.parse(row));
    res.json(communications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /clients/:client_id/communications
  - Creates a new communication log entry for a client.
  - After recording the log, sends an SMS notification using Twilio.
*/
app.post('/clients/:client_id/communications', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const parsedBody = createCommunicationsLogInputSchema.parse({ ...req.body, client_id });
    // Override created_by with authenticated user's ID
    parsedBody.created_by = req.user.user_id;
    const log_id = uuidv4();
    const now = new Date().toISOString();
    const insertQuery = `
      INSERT INTO communications_log
      (log_id, client_id, created_by, communication_date, note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const values = [
      log_id,
      parsedBody.client_id,
      parsedBody.created_by,
      parsedBody.communication_date,
      parsedBody.note,
      now,
    ];
    const result = await pool.query(insertQuery, values);
    const communicationLog = communicationsLogEntitySchema.parse(result.rows[0]);

    // After inserting the log, send an SMS notification via Twilio.
    const clientRes = await pool.query('SELECT phone FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (clientRes.rows.length > 0) {
      const clientInfo = clientRes.rows[0];
      if (clientInfo.phone && TWILIO_PHONE_NUMBER) {
        try {
          await twilioClient.messages.create({
            body: `A new communication log entry has been recorded for your account.`,
            from: TWILIO_PHONE_NUMBER,
            to: clientInfo.phone
          });
        } catch (smsError) {
          console.error("Twilio SMS error:", smsError);
        }
      }
    }
    res.status(201).json(communicationLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  PUT /communications/:log_id
  - Updates an existing communication log entry.
*/
app.put('/communications/:log_id', authenticateJWT, async (req, res) => {
  try {
    const { log_id } = req.params;
    const parsedBody = updateCommunicationsLogInputSchema.parse({ ...req.body, log_id });
    let updateFields = [];
    let values = [];
    let idx = 1;
    for (const key in parsedBody) {
      if (key !== 'log_id') {
        updateFields.push(`${key} = $${idx}`);
        values.push(parsedBody[key]);
        idx++;
      }
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    const updateQuery = `UPDATE communications_log SET ${updateFields.join(', ')} WHERE log_id = $${idx} RETURNING *`;
    values.push(log_id);
    const result = await pool.query(updateQuery, values);
    res.json(communicationsLogEntitySchema.parse(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================================
   Client Attachments Endpoints
===========================================*/

/*
  GET /clients/:client_id/attachments
  - Lists all attachments for the specified client.
*/
app.get('/clients/:client_id/attachments', authenticateJWT, async (req, res) => {
  try {
    const { client_id } = req.params;
    const result = await pool.query('SELECT * FROM client_attachments WHERE client_id = $1', [client_id]);
    const attachments = result.rows.map(row => clientAttachmentEntitySchema.parse(row));
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /clients/:client_id/attachments
  - Uploads a file as a new attachment for the specified client.
  - Uses multer for file handling and inserts file metadata into the database.
*/
app.post('/clients/:client_id/attachments', authenticateJWT, attachmentUpload.single('file'), async (req, res) => {
  try {
    const { client_id } = req.params;
    const clientResult = await pool.query('SELECT * FROM clients WHERE client_id = $1 AND deleted_at IS NULL', [client_id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    if (req.user.role === 'agent' && clientResult.rows[0].assigned_agent_id !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }
    const attachment_id = uuidv4();
    const now = new Date().toISOString();
    const file_name = req.file.originalname;
    const file_url = `/attachments/${req.file.filename}`;
    const uploaded_by = req.user.user_id;
    const insertQuery = `
      INSERT INTO client_attachments
      (attachment_id, client_id, uploaded_by, file_name, file_url, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const values = [attachment_id, client_id, uploaded_by, file_name, file_url, now];
    const result = await pool.query(insertQuery, values);
    res.status(201).json(clientAttachmentEntitySchema.parse(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================================
   Activity Log Endpoints
===========================================*/

/*
  GET /activity-log
  - Retrieves a paginated list of activity log entries.
  - Restricted to manager access.
*/
app.get('/activity-log', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: "Forbidden - manager access only" });
    }
    const parsedQuery = searchActivityLogQuerySchema.parse(req.query);
    let { limit, offset, sort_by, sort_order } = parsedQuery;

    // Whitelist sorting parameters for activity log
    const allowedSortBy = ['activity_id', 'user_id', 'timestamp'];
    const allowedSortOrder = ['ASC', 'DESC'];
    sort_by = allowedSortBy.includes(sort_by) ? sort_by : 'timestamp';
    sort_order = allowedSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const queryText = `SELECT * FROM activity_log ORDER BY ${sort_by} ${sort_order} LIMIT $1 OFFSET $2`;
    const result = await pool.query(queryText, [limit, offset]);
    const activities = result.rows.map(row => activityLogEntitySchema.parse(row));
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/*
  POST /activity-log
  - Records a new activity log entry.
*/
app.post('/activity-log', authenticateJWT, async (req, res) => {
  try {
    const parsedBody = createActivityLogInputSchema.parse(req.body);
    // Override user_id with the authenticated user's id
    parsedBody.user_id = req.user.user_id;
    const activity_id = uuidv4();
    const now = new Date().toISOString();
    const insertQuery = `
      INSERT INTO activity_log (activity_id, user_id, client_id, action_type, action_details, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const values = [
      activity_id,
      parsedBody.user_id,
      parsedBody.client_id || null,
      parsedBody.action_type,
      parsedBody.action_details || null,
      now
    ];
    const result = await pool.query(insertQuery, values);
    res.status(201).json(activityLogEntitySchema.parse(result.rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===========================================
   Catch-all Route for SPA
===========================================*/
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ===========================================
   Start the Server
===========================================*/
const port = PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});