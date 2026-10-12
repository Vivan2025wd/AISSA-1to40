<div align="center">

# 🎓 O/L Science Quiz Platform

### Sri Lanka's free online Science quiz engine for O/L students

*Timed exams · Island-wide leaderboards · Bilingual content · Live admin control*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Security Model](#-security-model)
- [Question Bank & Medium Support](#-question-bank--medium-support)
- [Quiz Engine & Timer](#-quiz-engine--timer)
- [Leaderboards](#-leaderboards)
- [Roles & Permissions](#-roles--permissions)
- [Admin Guide](#-admin-guide)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌟 Overview

The **O/L Science Quiz Platform** is a full-stack, cloud-native online examination system built for Sri Lankan **G.C.E. Ordinary Level** students.

It replaces manual exam workflows, spreadsheet grading, and disjointed communication with a unified web application that:

1. **Onboards students in seconds** — name, email, school, and chosen medium. No codes, no paperwork.
2. **Runs timed exams** with database-enforced invariants (single attempt, 20-question cap per quiz).
3. **Supports bilingual content** — Sinhala (primary) and English (optional) question texts, options, and explanations.
4. **Decouples questions from quizzes** via a central Question Bank + `quiz_questions` junction table.
5. **Computes multi-tier leaderboards** — per-quiz live top-10 and island-wide cumulative rankings.
6. **Gives admins real control** — schedule quizzes, publish instantly, monitor submissions in real time.
7. **Reserves a super-admin tier** for managing admins and removing users.

---

## ✨ Key Features

### 🎓 Student Experience

- **Fast onboarding** — name + email + school + medium, nothing else
- **Medium-aware** — Sinhala students see Sinhala quizzes only; English students see English quizzes only
- **Interactive exam UI** — question palette, live countdown, autosave, bilingual toggle
- **Auto-submit** — quiz submits itself the moment the timer reaches zero
- **Review mode** — every question with correct/wrong highlighting and full explanation
- **Analytics dashboard** — exams taken, average %, best score, island rank, past results table
- **Leaderboard** — island-wide rankings with medals, search, and your pinned rank bar

### 🛡 Admin Experience

- **Central Question Bank** — full CRUD, bilingual inputs, image upload, 4 or 5 options with explanations
- **Quiz Scheduler** — pick questions from the bank via a live capacity-counted modal, publish/unpublish instantly
- **Per-quiz question manager** — reorder with ▲▼, attach, or detach without deleting bank assets
- **Performance analytics** — filterable attempts table with colour-coded score badges and CSV export
- **Executive dashboard** — questions, students, quizzes, published count, submissions at a glance
- **Two-step admin gatekeeper** — password + bcrypt-verified access code stored in `admin_secrets`, session token in `sessionStorage`

### 👑 Super Admin Experience

- **User management page** — see every admin and student on the platform
- **Create admins** — directly via service-role API, no email confirmation required
- **Promote students to admins** — one click, reversible
- **Demote admins back to students** — one click, guarded by "can't demote the last super admin"
- **Delete any non-super-admin user** — cascades through profiles, results, and answers
- **Guard rails** — cannot delete or demote yourself; cannot touch other super admins

### 📱 Responsive Design

- Mobile-first layouts across every page
- Touch targets ≥ 44px on primary actions
- Horizontal scroll on wide tables
- Sticky headers, mobile drawers, and adaptive grids

---

## 🏗 Architecture

```mermaid
flowchart TD
    User([Student / Admin / Super Admin]) -->|HTTPS| Edge[Next.js Middleware]
    Edge --> App[Next.js App Router]

    subgraph Frontend
        App --> Landing[Landing]
        App --> Auth[Auth: Login / Register]
        App --> Student[Student Portal]
        App --> Admin[Admin Portal - AdminGuard]
        App --> Super[Super Admin Portal]
    end

    subgraph API
        App --> QuizAPI["/api/quiz/[id]"]
        App --> UsersAPI["/api/admin/users"]
    end

    subgraph Supabase
        Auth --> SupaAuth[Supabase Auth]
        Student --> SupaDB[(PostgreSQL)]
        Admin --> SupaDB
        Super --> SupaDB
        Admin --> SupaStorage[Bucket: question-images]
        QuizAPI --> SupaDB
        UsersAPI --> SupaAuth
        UsersAPI --> SupaDB
    end