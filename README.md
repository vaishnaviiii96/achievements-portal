# 🎓 GITAM Achievements Portal

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

A full-stack web portal built for **GITAM Deemed to be University** to track, manage, and verify student and faculty achievements. Students upload certificates; faculty and admins review, approve, and export detailed reports.

🔗 **Live Demo:** [your-app.vercel.app](https://your-app.vercel.app) *(update once deployed)*

---

## 📸 Screenshots

| Student Dashboard | Faculty Dashboard | Admin Analytics |
|---|---|---|
| ![Student dashboard](screenshots/student-dashboard.png) | ![Faculty dashboard](screenshots/faculty-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

---

## 🏗️ Architecture

```mermaid
flowchart TD
    A[Browser frontend] --> B[Express server]
    B --> C[Rate limiter]
    B --> D[JWT auth middleware]
    C --> E[Routes: auth, achievements, users, export]
    D --> E
    E --> F[(PostgreSQL - Neon)]
    E --> G[Gmail SMTP - OTP emails]
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
| **Email** | Nodemailer (Gmail SMTP) — OTP delivery |
| **File Uploads** | Multer (JPEG, PNG, PDF, WebP — 10MB limit) |
| **Excel Export** | ExcelJS (styled, branded headers) |
| **PDF Reports** | PDFKit (GITAM-branded per-student reports) |
| **Rate Limiting** | express-rate-limit |

---

## 📐 Architecture

```
achievements/
├── index.html          # Student sign-up page
├── login.html          # Role-based login (Student / Faculty / Admin)
├── signup.html         # Account creation
├── forgot-password.html # OTP-based password reset
├── student.html        # Student dashboard
├── faculty.html        # Faculty dashboard
├── admin.html          # Admin dashboard
├── css/
│   └── style.css       # Global styles
├── js/
│   ├── login.js
│   ├── forgot-password.js
│   ├── student.js
│   ├── faculty.js
│   └── admin.js
└── backend/
    ├── server.js       # Express app + rate limiting
    ├── db.js           # PostgreSQL pool (Neon)
    ├── middleware/
    │   ├── auth.js         # JWT verify + role guard
    │   ├── rateLimiter.js  # express-rate-limit config
    │   └── otpLimiter.js   # Rate limits for OTP endpoints
    ├── utils/
    │   └── mailer.js       # Nodemailer OTP email sender
    ├── migrations/
    │   └── add_password_reset.sql
    └── routes/
        ├── auth.js         # POST /login, /register, /forgot-password, /verify-otp, /reset-password
        ├── achievements.js # CRUD + verify/reject + stats
        ├── users.js        # Profile, student/faculty lists, bulk-import
        └── export.js       # Excel + PDF generation
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
| `level` | TEXT | `international` \| `national` \| `state` \| `college` |
| `result` | TEXT | `winner` \| `runner-up` \| `participant` |
| `start_date` / `end_date` | DATE | |
| `certificate_url` | TEXT | Comma-separated filenames |
| `photo_urls` | TEXT[] | Array of filenames |
| `status` | TEXT | `draft` \| `pending` \| `verified` \| `rejected` |
| `remarks` | TEXT | Rejection reason |
| `verified_by` | FK → users | Who approved/rejected |
| `verified_at` | TIMESTAMP | |

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
| `POST` | `/api/achievements` | Student/Faculty | Submit achievement |
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
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for OTP emails

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
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
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
# e.g. using VS Code Live Server, or:
npx serve .
```

By default, the frontend connects to `http://localhost:5000`. To change this (e.g. for production), edit the `API_BASE` variable in `js/config.js`.

---

## 🌍 Deployment

**Backend (Render, Railway, etc.):**
1. Connect your GitHub repository to your hosting provider.
2. Set the Build Command to `npm install` and the Start Command to `npm start`.
3. Add all `.env` variables (Database URL, JWT Secret, Port, Gmail credentials, Frontend URL) in your hosting dashboard's Environment tab.

**Frontend (Vercel, Netlify, GitHub Pages):**
1. Deploy the root directory containing the HTML/JS/CSS files.
2. **Crucial Step:** Open `js/config.js` and change `API_BASE` to your deployed backend URL before pushing to GitHub.

## 👤 Account Creation

Student accounts self-register with a `@gitam.in` email via `/signup.html`.

Faculty and admin accounts are created via `POST /api/auth/register` (role: `faculty` or `admin`),
or bulk-imported by an existing admin via `POST /api/users/bulk-import`, which generates a
unique random temporary password per user — no shared or default credentials are used anywhere
in this system. Any user can reset their own password anytime via the "Forgot Password" flow
(OTP sent to their registered email).

---

## 📄 License

MIT — free to use and modify.