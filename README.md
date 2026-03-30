# 🚀 Task Management Platform

A high-performance, modern Task Management and Analytics system designed for professional teams. It offers strict separation of concerns, utilizing an Angular 21 Signals-first architecture on the frontend and a fast, asynchronous Python FastAPI backend. 

The platform goes beyond simple task tracking by providing deep **Labor Efficiency Analytics**, precise work tracking, and a dynamic, fluid UI.

## ✨ Key Features

*   **Dynamic Kanban Board:** Drag-and-drop workflow with pixel-perfect design, status-colored columns, and strict state management.
*   **Time Tracking & Work Logs:** Real-time pulse indicators for active workers on tasks. Seamless manual log entry and automatic start/stop time tracking.
*   **Labor Efficiency Insights:** Intelligent analytics that distinguish between project timeline delays and actual worker productivity/labor efforts compared to assigned budgets.
*   **Persistent Filtering System:** Global task filtering by Team, Assignee, Priority, and Status with `localStorage` persistence and intelligent "Unassigned" handling.
*   **Role-Based Access & Ownership:** Strict ownership-based permissions for modifying or removing work logs and managing tasks.
*   **Premium Design System:** Fully custom UI avoiding standard libraries. Utilizes SCSS with BEM methodology, smooth micro-interactions, responsive layouts, and a global **Light/Dark Mode** toggle.
*   **File Attachments:** Secure file uploads supporting modern formats (including AVIF integration).

## 🛠️ Technology Stack

### Frontend
*   **Framework:** Angular 21 (100% Standalone Components)
*   **State Management:** Angular Signals (`signal()`, `computed()`, `effect()`)
*   **Routing & Loading:** Native Angular Router with Lazy-loaded features.
*   **Styling:** SCSS, Custom Design System, BEM Naming Convention. CSS Custom Properties for dynamic theming.
*   **Performance:** `ChangeDetectionStrategy.OnPush` enforced universally.

### Backend
*   **Framework:** FastAPI (Python 3.10+)
*   **Database ORM:** SQLAlchemy 2.0
*   **Database:** SQLite / PostgreSQL (psycopg binary)
*   **Migrations:** Alembic
*   **Authentication:** JWT, bcrypt, python-jose
*   **Data Validation:** Pydantic 2.x

## 📂 Project Architecture

```text
/
├── backend/            # FastAPI Application
│   ├── app/            
│   │   ├── api/        # Route controllers
│   │   ├── models/     # SQLAlchemy ORM Models (Task, User, WorkLog, etc.)
│   │   ├── schemas/    # Pydantic validation schemas
│   │   └── core/       # Security, DB connections
│   ├── requirements.txt
│
├── frontend/           # Angular 21 Application
│   ├── src/app/
│   │   ├── core/       # Singleton services, interceptors, guards
│   │   ├── features/   # Lazy-loaded domains (Auth, Dashboard, Tasks)
│   │   ├── layout/     # Shell components (Navbar, Sidebar)
│   ├── src/assets/scss # Global Design System (variables, themes, mixins)



## Setup

1. Clone the repo
2. Create .env file:
   cp .env.example .env

3. Backend setup:
   cd backend
   python -m venv venv
   pip install -r requirements.txt

4. Frontend setup:
   cd frontend
   npm install
