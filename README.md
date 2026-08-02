# 🎓 GITAM Achievements Portal

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

A full-stack web portal built for **GITAM Deemed to be University** to track, manage, and verify student and faculty achievements. Students upload certificates; faculty and admins review, approve, and export detailed reports.

🔗 **Live Demo:** [achievements-portal-bice.vercel.app](https://achievements-portal-bice.vercel.app)

---

## 📸 Screenshots

| Student Dashboard | Faculty Dashboard | Admin Analytics |
|---|---|---|
| ![Student dashboard](screenshots/student-dashboard.png) | ![Faculty dashboard](screenshots/faculty-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A[Browser frontend - Vercel] --> B[Express server - Render]
    B --> C[Rate limiter]
    B --> D[JWT auth middleware]
    C --> E[Routes: auth, achievements, users, export]
    D --> E
    E --> F[(PostgreSQL - Neon)]
    E --> G[Resend API - OTP emails]
    E --> H[Cloudinary - file storage]
```

---

## ✨ Features

### 👨‍🎓 Student Portal
- Register and log in with GITAM email (`@gitam.in`)
- Submit achievements with certificates, merit letters, and proof photos
- Save drafts and submit when ready
- View real-time status badges — ✅ Verified / ⏳ Pending / ❌ Rejected

### 👩‍🏫 Faculty Portal
- Browse and filter assigned students' achievements
- Verify or reject achievements with remarks
- Export filtered data to styled Excel reports

### 🛡️ Admin Portal
- Full role-based dashboard with analytics charts
- Doughnut chart (achievements by type) and bar chart (monthly trend)
- Approve/reject any achievement with remarks
- Download branded PDF reports per student
- Manage users (students/faculty), bulk-import users via JSON
- Export to Excel with GITAM-branded headers

### 🔒 Security
- JWT-based authentication (8-hour expiry)
- Role-based access control (RBAC) on every API route
- `bcrypt` password hashing (10 salt rounds)
- API rate limiting — 10 login attempts / 15 min, 150 requests / 15 min
- OTP-based password reset (bcrypt-hashed codes, 10-minute expiry, rate-limited)
- XSS-safe HTML rendering (manual escaping on all user inputs)
- Parameterised SQL queries (no SQL injection risk)
- No shared or default credentials — bulk-imported users get unique random temp passwords
- CORS restricted to the deployed frontend origin only

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (Fetch API) |
| **Fonts** | Google Fonts — DM Sans |
| **Charts** | Chart.js 4.x |
| **Backend** | Node.js 18+, Express 4.x |
| **Database** | PostgreSQL (Neon serverless) |
| **Auth** | JSON Web Tokens (`jsonwebtoken`), `bcrypt` |
| **Email** | Resend HTTP API — OTP delivery |
| **File Storage** | Cloudinary (via Multer) — certificates and proof photos |
| **Excel Export** | ExcelJS (styled, branded headers) |
| **PDF Reports** | PDFKit (GITAM-branded per-student reports) |
| **Rate Limiting** | express-rate-limit |
| **Hosting** | Render (backend), Vercel (frontend) |

---

## 📐 Project Structure

```
achievements/
├── index.html              # Student sign-up page
├── login.html               # Role-based login (Student / Faculty / Admin)
├── forgot-password.html     # OTP-based password reset
├── student.html              # Student dashboard
├── faculty.html               # Faculty dashboard
├── admin.html                  # Admin dashboard
├── css/
│   └── style.css            # Global styles
├── js/
│   ├── config.js             # API_BASE environment config
│   ├── login.js
│   ├── forgot-password.js
│   ├── student.js
│   ├── faculty.js
│   └── admin.js
└── backend/
    ├── server.js             # Express app, middleware, route mounting
    ├── db.js                  # PostgreSQL pool (Neon) with error handling
    ├── middleware/
    │   ├── auth.js              # JWT verify + role guard
    │   ├── rateLimiter.js       # express-rate-limit config
    │   ├── otpLimiter.js        # Rate limits for OTP endpoints
    │   └── upload.js             # Multer + Cloudinary storage config
    ├── utils/
    │   └── mailer.js             # Resend OTP email sender
    ├── migrations/
    │   └── add_password_reset.sql
    └── routes/
        ├── auth.js               # login, register, forgot-password, verify-otp, reset-password
        ├── achievements.js       # CRUD + verify/reject + stats
        ├── users.js               # Profile, student/faculty lists, bulk-import
        └── export.js               # Excel + PDF generation
```

---

## 🗄️ Database Schema (Key Tables)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID / SERIAL | Primary key |
| `name` | TEXT | |
| `email` | TEXT | Students: must be `@gitam.in` |
| `roll_number` | TEXT | Students only |
| `faculty_code` | TEXT | Faculty / Admin |
| `password` | TEXT | bcrypt hash |
| `role` | TEXT | `student` \| `faculty` \| `admin` |
| `department` | TEXT | |
| `batch` | TEXT | e.g. `2022–2026` |
| `year_of_study` | TEXT | |
| `faculty_id` | FK → users | Student's assigned faculty |
| `reset_otp_hash` | TEXT | bcrypt hash of active OTP (null if unused) |
| `reset_otp_expires` | TIMESTAMPTZ | OTP expiry (10 min from issue) |
| `reset_otp_attempts` | INTEGER | Failed verify attempts (locks after 5) |

### `achievements`
| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL | Primary key |
| `user_id` | FK → users | Submitter |
| `title` | TEXT | |
| `event_name` | TEXT | |
| `event_type` | TEXT | `academic` \| `technical` \| `sports` \| `cultural` \| `social` |
| `level` | TEXT | `international` \| `national` \| `state` \| `district` \| `college` |
| `result` | TEXT | `winner` \| `runner_up` \| `participant` \| `organizer` |
| `position` | TEXT | e.g. "1st Place", "Best Paper" |
| `place_held` | TEXT | Location of the event |
| `organiser_name` | TEXT | Organising body |
| `start_date` / `end_date` | DATE | |
| `certificate_url` | TEXT | Comma-separated Cloudinary URLs |
| `merit_url` | TEXT | Cloudinary URL |
| `photo_urls` | TEXT[] | Array of Cloudinary URLs |
| `description` | TEXT | Optional |
| `status` | TEXT | `draft` \| `pending` \| `verified` \| `rejected` |
| `remarks` | TEXT | Rejection reason |
| `verified_by` | FK → users | Who approved/rejected |
| `verified_at` | TIMESTAMPTZ | |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login — returns JWT |
| `POST` | `/api/auth/register` | Register new account |
| `POST` | `/api/auth/forgot-password` | Request OTP for password reset |
| `POST` | `/api/auth/verify-otp` | Verify OTP, returns short-lived reset token |
| `POST` | `/api/auth/reset-password` | Set new password using reset token |

### Achievements
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/achievements/mine` | Student/Faculty | Own achievements |
| `GET` | `/api/achievements/all` | Admin | All achievements |
| `GET` | `/api/achievements/students` | Faculty | Assigned students' achievements |
| `GET` | `/api/achievements/stats` | Admin | Dashboard chart data |
| `POST` | `/api/achievements` | Student/Faculty | Submit achievement (multipart, files → Cloudinary) |
| `PUT` | `/api/achievements/:id` | Student/Faculty | Edit own achievement |
| `PATCH` | `/api/achievements/:id/status` | Admin/Faculty | Verify or reject |
| `DELETE` | `/api/achievements/:id` | Student/Faculty | Delete own achievement |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/users/me` | All | Own profile |
| `GET` | `/api/users/students` | Faculty/Admin | Student list |
| `GET` | `/api/users/faculty` | Admin | Faculty list |
| `PUT` | `/api/users/:id` | Self/Admin | Update profile |
| `POST` | `/api/users/bulk-import` | Admin | Bulk create users (unique random temp password per user) |

### Export
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/export/admin/excel` | Admin | Styled Excel for all achievements |
| `GET` | `/api/export/faculty/excel` | Faculty | Styled Excel for assigned students |
| `GET` | `/api/export/mine/excel` | Student/Faculty | Own achievements Excel |
| `GET` | `/api/export/pdf/student/:id` | Admin/Faculty | PDF report per student |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech) — free tier)
- A [Resend](https://resend.com) account for OTP emails (free tier)
- A [Cloudinary](https://cloudinary.com) account for file uploads (free tier)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_super_secret_key_here
PORT=5000
RESEND_API_KEY=your_resend_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5500
```

Run the migration once against your database:

```bash
psql "$DATABASE_URL" -f backend/migrations/add_password_reset.sql
```

Run the server:

```bash
npm run dev    # development (nodemon)
npm start      # production
```

### Frontend Setup

No build step needed. Just open the HTML files directly in a browser **or** serve them with any static file server:

```bash
npx serve .
```

By default, the frontend connects to `http://localhost:5000`. To change this (e.g. for production), edit the `API_BASE` variable in `js/config.js`.

---

## 🌍 Deployment

**Backend (Render):**
1. Connect your GitHub repository to Render, set Root Directory to `backend`.
2. Build Command: `npm install` · Start Command: `npm start`.
3. Add all `.env` variables in the Environment tab.
4. `app.set('trust proxy', 1)` is required in `server.js` for accurate rate limiting behind Render's proxy.

**Frontend (Vercel):**
1. Deploy the root directory containing the HTML/JS/CSS files.
2. Update `API_BASE` in `js/config.js` to your Render backend URL before deploying.
3. Once you have your Vercel URL, lock down backend CORS to that origin only.

**Notes on production behavior:**
- Render's free tier spins down after inactivity — first request after idle may take 30–50 seconds.
- File uploads go directly to Cloudinary rather than local disk, since most PaaS providers (including Render) use an ephemeral filesystem that doesn't persist uploaded files across restarts/redeploys.
- OTP emails are sent via Resend's HTTP API rather than SMTP, since Render's free tier blocks common outbound SMTP ports (465/587).

---

## 👤 Account Creation

Student accounts self-register with a `@gitam.in` email via `/index.html`.

Faculty and admin accounts are created via `POST /api/auth/register` (role: `faculty` or `admin`),
or bulk-imported by an existing admin via `POST /api/users/bulk-import`, which generates a
unique random temporary password per user — no shared or default credentials are used anywhere
in this system. Any user can reset their own password anytime via the "Forgot Password" flow
(OTP sent to their registered email).

---

## 📄 License

MIT — free to use and modify.
