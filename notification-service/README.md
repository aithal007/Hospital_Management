# Notification Service

This is the independent Notification Microservice for the CareFlow Hospital Management System. It is responsible for handling all outgoing alerts (Email, SMS, and Push Notifications) on behalf of the main application monolith.

## Features
- **Email Delivery**: Uses the official Resend API client SDK.
- **SMS Delivery**: Console logging stub (extensible for Twilio, etc.).
- **Push Notification**: Console logging stub (extensible for Firebase Cloud Messaging, etc.).
- **Unified Route**: Exposes a unified `/notify` route that delegates dispatching dynamically based on payload structure.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in this directory using the structure of `.env.example`:
   ```env
   PORT=3010
   RESEND_API_KEY=your_resend_api_key
   ```

3. **Start the Service**:
   ```bash
   npm start
   ```

## API Endpoints

### 1. Health Status
`GET /health`
Returns JSON indicating service connectivity and date timestamp.

### 2. Email Dispatch
`POST /notify/email`
Payload body:
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject Header",
  "html": "<h1>HTML Body Content</h1>"
}
```

### 3. SMS Dispatch
`POST /notify/sms`
Payload body:
```json
{
  "to": "+1234567890",
  "message": "Message text alert."
}
```

### 4. Push Notification Dispatch
`POST /notify/push`
Payload body:
```json
{
  "userId": "usr_9988",
  "title": "Alert Title",
  "message": "Notification detail content."
}
```

### 5. Unified Dispatch Route
`POST /notify`
Payload body:
```json
{
  "channel": "email", 
  "payload": {
    "to": "recipient@example.com",
    "subject": "Unified Subject",
    "html": "<p>Unified body content</p>"
  }
}
```
Supported `channel` values: `"email"`, `"sms"`, `"push"`.
