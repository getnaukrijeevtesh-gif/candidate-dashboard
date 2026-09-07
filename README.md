# Admin Dashboard

A full-stack admin dashboard application with React frontend and Node.js backend.

## Project Structure

```
AdminDashboard/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── layouts/      # Layout wrappers
│   │   ├── services/     # API service layer
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   └── App.jsx       # Root App component
│   └── package.json
│
├── backend/           # Express.js backend
│   ├── controllers/      # Request handlers
│   ├── models/           # Database models / schemas
│   ├── routes/           # API route definitions
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic layer
│   ├── config/           # Configuration files
│   └── server.js         # Server entry point
│
└── README.md
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm start
```
