# 🚀 Task Management & Labor Analytics Platform

[![Angular](https://img.shields.io/badge/Angular-21+-DD0031?style=for-the-badge&logo=angular)](https://angular.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A high-performance, modern Task Management and Analytics system designed for professional teams. This platform utilizes an **Angular 21 Signals-first** architecture on the frontend and an asynchronous **FastAPI** backend with **Supabase** integration.

The platform goes beyond simple task tracking by providing deep **Labor Efficiency Analytics**, precise work tracking, and a dynamic, fluid UI.

---

### 🔗 Deployment Links
*   **Frontend (Vercel):** [https://task-management-omega-vert.vercel.app](https://task-management-omega-vert.vercel.app)
*   **Backend API (Render):** [https://task-management-i48j.onrender.com/api](https://task-management-i48j.onrender.com/api)
*   **Interactive API Docs:** [https://task-management-i48j.onrender.com/docs](https://task-management-i48j.onrender.com/docs)

---

### ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Dynamic Kanban Board** | Drag-and-drop workflow with pixel-perfect design and status-colored columns. |
| **Real-time Tracking** | Active worker pulse indicators and seamless start/stop work logging. |
| **Labor Efficiency Insights** | High-fidelity analytics distinguishing timeline delays from actual effort. |
| **Global Filtering** | Persistent filters (Team, Assignee, Priority) utilizing `localStorage`. |
| **Premium Design** | SCSS with BEM methodology, smooth micro-interactions, and Native Dark Mode. |
| **Secure File Handling** | Integrated storage for task attachments with AVIF/Modern format support. |

---

### 🛡️ Technical Architecture

#### Frontend: The "Signals" Advantage
This application leverages **Angular 21 Signals** for ultra-efficient, granular state management. By using `signal()`, `computed()`, and `effect()`, we achieve:
*   **No Unnecessary Re-renders**: Granular reactivity ensures only affected UI nodes update.
*   **OnPush Strategy**: Standardized `ChangeDetectionStrategy.OnPush` across all components.
*   **Standalone Components**: A 100% NgModule-free, modular architecture.

#### Backend: Scalable & Asynchronous
The API is built for speed and reliability:
*   **FastAPI**: Asynchronous Request/Response cycle for high concurrency.
*   **SQLAlchemy 2.0**: Utilizing the latest ORM standards with Pydantic V2 validation.
*   **Supabase Integration**: Centralized PostgreSQL database and cloud storage for binary assets.

---

### 📂 Directory Structure

```text
.
├── backend/                # FastAPI Application
│   ├── app/            
│   │   ├── api/            # Route controllers (Auth, Tasks, Attachments)
│   │   ├── models/         # SQLAlchemy ORM Models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── core/           # Security, DB connections, Settings
│   └── requirements.txt
│
└── frontend/               # Angular 21 Application
    ├── src/app/
    │   ├── core/           # Services, Interceptors, Guards
    │   ├── features/       # Lazy-loaded modules (Auth, Dashboard, Tasks)
    │   ├── layout/         # Shell components (Navbar, Main Layout)
    │   └── shared/         # Reusable UI components
    └── src/assets/scss     # Design System (BEM, Variables, Mixins)
```

---

### 🛠️ Local Setup

#### 1. Prerequisites
*   Node.js (LTS) & npm
*   Python 3.10+
*   Supabase Account (Database & Storage)

#### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=your_postgresql_url
SECRET_KEY=your_random_secret_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

#### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

### 👤 Author
**Anjana E**  
*Frontend Developer Trainee*

---
© 2026 Task Management Platform. All rights reserved.
