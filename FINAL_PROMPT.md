# Final Prompt: AI Agent Task Management Platform

You are an expert full-stack developer specializing in Angular 20 and Python FastAPI. We are building a basic Task Management Platform heavily inspired by ClickUp and Jira, focusing on a clean, modern, and high-performance user experience.

## Project Overview
The objective is to create a fully functional, basic task management application that features a modern frontend built with Angular 20+ (Standalone, Signals-focused) and a robust backend built with Python FastAPI connected to a PostgreSQL database.

## 1. UI/UX Design & Structure
Please refer to the aesthetic standard of modern top-tier PM tools (like Monday.com or ClickUp):
- **Glassmorphism & Gradients**: Subtle background blur and smooth, non-distracting gradients.
- **Premium Typography**: Consider Google Fonts (Inter, Roboto, or Outfit).
- **Themes**: Implement a default Light theme and a smooth Dark theme with a toggle in the top navigation.
- **Layout**: 
  - **Left Sidebar**: Collapsible. Contains User Profile, Navigation links (Inbox, My Tasks, Projects, Spaces).
  - **Top Navbar**: Global search bar, Theme Toggle (Light/Dark), and a quick "Add Task" floating/header button.
  - **Main Content Area**: Tabular or Board view containing the task lists.

## 2. Core Features (Frontend & Backend)
- **Authentication**: A basic login screen (JWT based approach). 
- **Task Kanban Board**: A drag-and-drop board with standard status columns ("To Do", "In Progress", "Completed").
- **Task List View**: A compact list grouped by Status. Columns should include: Task Name, Assignee (avatar), Priority flag (Low, Normal, High, Urgent), and Time Taken.
- **Task Management (CRUD)**:
  - Add, Edit, Delete daily tasks.
  - Required Fields: Title, Description, Status, Priority, Assignee.
  - Additional Field: **Time Taken** (recording how much time in hours/mins the task took to complete).
- **Attachments**: An option within the Task Details view to upload an image and display a thumbnail preview of it.

## 3. Technology Stack & Database
- **Frontend**: Angular 20. Strict standalone component architecture.
- **Backend**: Python FastAPI with SQLAlchemy or SQLModel (Fast and Modern approach).
- **Database (PostgreSQL)**:
  - `User` table: id, username, email, password_hash
  - `Task` table: id, title, description, status (enum), priority (enum), time_taken_minutes (integer), assignee_id (fk), created_at
  - `Attachment` table: id, task_id (fk), file_path

## 4. Crucial Guidelines (Please read carefully)
- Follow ALL the strict Angular Development rules defined in the `GEMINI.md` file located in the project root. This includes ZERO usage of NgModules, mandatory use of Signals over RxJS for reactive state, `ChangeDetectionStrategy.OnPush` everywhere, BEM methodology for SCSS, and semantic HTML for clear A11Y.
- Provide incremental implementation steps:
  1. Backend setup & DB migrations (FastAPI + PostgreSQL setup).
  2. Backend endpoints (Auth, CRUD, Upload).
  3. Frontend Angular setup configured strictly to the `GEMINI.md` rules.
  4. Frontend UI implementation (Sidebar, Kanban, Forms, Theming).

Please start by providing the initial directory structure outline for both frontend and backend, configure the necessary `environment` files, and write the FastAPI backend models and entry point.
