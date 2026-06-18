# Ticketing System API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses are in JSON format. Successful responses return data with HTTP 2xx status codes. Errors return descriptive messages with appropriate HTTP status codes.

---

## Authentication Endpoints

### Register User
- **Endpoint:** `POST /auth/register`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}
```
- **Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Login User
- **Endpoint:** `POST /auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```
- **Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

### Get Current User
- **Endpoint:** `GET /auth/me`
- **Auth Required:** Yes
- **Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Verify Token
- **Endpoint:** `POST /auth/verify`
- **Auth Required:** No
- **Request Body:**
```json
{
  "token": "jwt-token-here"
}
```
- **Response (200):**
```json
{
  "valid": true,
  "decoded": {
    "id": "uuid",
    "email": "user@example.com",
    "iat": 1234567890,
    "exp": 1234571490
  }
}
```

---

## Organization Endpoints

### Create Organization
- **Endpoint:** `POST /orgs`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "name": "My Company"
}
```
- **Response (201):**
```json
{
  "id": "uuid",
  "name": "My Company",
  "slug": "my-company"
}
```

### Get User's Organizations
- **Endpoint:** `GET /orgs`
- **Auth Required:** Yes
- **Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "My Company",
    "slug": "my-company",
    "role": "admin"
  }
]
```

### Get Organization Members
- **Endpoint:** `GET /orgs/:org_id/members`
- **Auth Required:** Yes
- **Role Required:** Admin
- **Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  },
  {
    "id": "uuid",
    "email": "member@example.com",
    "name": "Jane Smith",
    "role": "user"
  }
]
```

### Add Member to Organization
- **Endpoint:** `POST /orgs/:org_id/members`
- **Auth Required:** Yes
- **Role Required:** Admin
- **Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "user"
}
```
- **Response (201):**
```json
{
  "success": true
}
```

### Remove Member from Organization
- **Endpoint:** `DELETE /orgs/:org_id/members/:user_id`
- **Auth Required:** Yes
- **Role Required:** Admin
- **Response (200):**
```json
{
  "success": true
}
```

---

## Ticket Endpoints

### Create Ticket
- **Endpoint:** `POST /tickets/:org_id/tickets`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "title": "Bug in login page",
  "description": "Users cannot login with special characters in password",
  "priority": "high"
}
```
- **Response (201):**
```json
{
  "id": "uuid",
  "title": "Bug in login page",
  "description": "Users cannot login with special characters in password",
  "priority": "high",
  "status": "open"
}
```

### Get Organization Tickets
- **Endpoint:** `GET /tickets/:org_id/tickets?status=open&priority=high&assignedTo=user_uuid`
- **Auth Required:** Yes
- **Query Parameters:**
  - `status` (optional): open, in_progress, resolved, closed
  - `priority` (optional): low, medium, high, urgent
  - `assignedTo` (optional): user_id
- **Response (200):**
```json
[
  {
    "id": "uuid",
    "organisation_id": "uuid",
    "creator_id": "uuid",
    "title": "Bug in login page",
    "description": "Description here",
    "priority": "high",
    "status": "open",
    "assigned_to": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "resolved_at": null
  }
]
```

### Get Single Ticket
- **Endpoint:** `GET /tickets/:org_id/tickets/:ticket_id`
- **Auth Required:** Yes
- **Response (200):**
```json
{
  "id": "uuid",
  "organisation_id": "uuid",
  "creator_id": "uuid",
  "title": "Bug in login page",
  "description": "Description here",
  "priority": "high",
  "status": "open",
  "assigned_to": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "resolved_at": null
}
```

### Update Ticket
- **Endpoint:** `PATCH /tickets/:org_id/tickets/:ticket_id`
- **Auth Required:** Yes
- **Required Permission:** Creator or Admin
- **Request Body:** (send only fields to update)
```json
{
  "title": "Updated title",
  "status": "in_progress",
  "priority": "urgent",
  "assigned_to": "user_uuid"
}
```
- **Response (200):**
```json
{
  "id": "uuid",
  "organisation_id": "uuid",
  "creator_id": "uuid",
  "title": "Updated title",
  "description": "Description here",
  "priority": "urgent",
  "status": "in_progress",
  "assigned_to": "user_uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "resolved_at": null
}
```

### Delete Ticket
- **Endpoint:** `DELETE /tickets/:org_id/tickets/:ticket_id`
- **Auth Required:** Yes
- **Role Required:** Admin
- **Response (200):**
```json
{
  "success": true
}
```

### Get Ticket Activity
- **Endpoint:** `GET /tickets/:org_id/tickets/:ticket_id/activity`
- **Auth Required:** Yes
- **Response (200):**
```json
[
  {
    "id": "uuid",
    "ticket_id": "uuid",
    "user_id": "uuid",
    "action": "created",
    "old_value": null,
    "new_value": "Ticket created",
    "created_at": "2024-01-01T00:00:00Z",
    "name": "John Doe",
    "email": "john@example.com"
  },
  {
    "id": "uuid",
    "ticket_id": "uuid",
    "user_id": "uuid",
    "action": "updated",
    "old_value": null,
    "new_value": "{\"status\":\"in_progress\"}",
    "created_at": "2024-01-01T00:01:00Z",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
]
```

### Add Ticket Attachment
- **Endpoint:** `POST /tickets/:org_id/tickets/:ticket_id/attachments`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "filename": "screenshot.png",
  "fileUrl": "http://localhost:5000/uploads/filename.png"
}
```
- **Response (201):**
```json
{
  "id": "uuid",
  "filename": "screenshot.png",
  "fileUrl": "http://localhost:5000/uploads/filename.png"
}
```

### Get Ticket Attachments
- **Endpoint:** `GET /tickets/:org_id/tickets/:ticket_id/attachments`
- **Auth Required:** Yes
- **Response (200):**
```json
[
  {
    "id": "uuid",
    "ticket_id": "uuid",
    "filename": "screenshot.png",
    "file_url": "http://localhost:5000/uploads/filename.png",
    "uploaded_by": "uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

## File Upload Endpoints

### Upload File to Ticket
- **Endpoint:** `POST /uploads/:org_id/tickets/:ticket_id/upload`
- **Auth Required:** Yes
- **Content-Type:** multipart/form-data
- **Request Field:** `file` (max 10MB)
- **Allowed File Types:** PDF, PNG, JPG, GIF, TXT, DOC, DOCX, XLS, XLSX, ZIP
- **Response (201):**
```json
{
  "filename": "1704067200000-uuid.pdf",
  "originalName": "document.pdf",
  "size": 2048576,
  "url": "/uploads/1704067200000-uuid.pdf"
}
```

### Download File
- **Endpoint:** `GET /uploads/:filename`
- **Auth Required:** No
- **Response:** File binary content

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request body or missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting
Currently no rate limiting is implemented. In production, implement rate limiting middleware.

## CORS
CORS is enabled for all origins. In production, restrict to specific domains.

## Versioning
API version 1.0.0

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","name":"Test User","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```

### Create Organization
```bash
curl -X POST http://localhost:5000/api/orgs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Company"}'
```

### Create Ticket
```bash
curl -X POST http://localhost:5000/api/tickets/ORG_ID/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Ticket",
    "description":"This is a test",
    "priority":"high"
  }'
```

### Upload File
```bash
curl -X POST http://localhost:5000/api/uploads/ORG_ID/tickets/TICKET_ID/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf"
```

---

## Support
For API issues, check the backend logs and ensure all environment variables are correctly configured.
