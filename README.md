# Alboriss-MI

A pixel-perfect, high-security 1:1 replica of the legacy Windows Medical Insurance data entry application, engineered for high-throughput operator practice, home telemetry tracking, and management oversight.

Built with **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase**. Ready for one-click deployment on **Vercel**.

---

## 🌟 Key Features

### 1. Pure 1:1 Legacy Desktop Interface (`/`)
- Exact visual replica matching the legacy Windows desktop application:
  - Compact Windows beveled controls and custom color scheme (`#b0d2ce` background, `#bee2f1` inputs).
  - Exact 9 rows of insurance data entry fields aligned to the pixel.
  - Windows-native tall vertical scrollbar controlling the loaded scanned document image.
- **Strictly Restricted**: Zero login buttons, links, or administrative controls are visible on the main data entry interface. Regular operators cannot view, click, or probe for authentication options.

### 2. Dedicated Employee Identity Verification Gateway (`/login`)
- When employees practice from home, they access the dedicated unlinked gateway at `/login`.
- **Mandatory Live Webcam Snapshot**: Employees must approve camera access and take a live selfie before accessing the data entry application.
- **Automated Telemetry Capture**:
  - Public Client IP address (with Vercel/Cloudflare proxy header support).
  - Geographic location (City, Region, Country, and optional GPS coordinates).
  - Full device specs: Operating System, browser, screen resolution, timezone, language, and hardware cores.
- Upon successful authentication with manager-issued credentials, the employee is automatically forwarded into the data entry terminal.

### 3. Manager Operations & Control Center (`/manager`)
- Hidden behind an unguessable `/manager` gateway with passkey authentication and constant-time password verification.
- **Tab 1: Operator Speed & Productivity**: Real-time tracking of Charts Completed Per Minute (CPM), active time, and total volume.
- **Tab 2: Employee Credentials Management**: Create unique usernames/passwords for each employee, toggle active/suspended status, or delete accounts.
- **Tab 3: Home Practice Attendance & Device Audit**: Review every login event with full-resolution webcam photos, client IP addresses, city/country location, screen resolutions, browsers, and operating systems.

---

## 🚀 Quick Start & Local Development

### Installation
```bash
# Clone the repository
git clone https://github.com/Arkuuuu/Alboriss-MI.git
cd Alboriss-MI

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- **Data Entry Terminal**: `http://localhost:3000/`
- **Employee Login**: `http://localhost:3000/login`
- **Manager Portal**: `http://localhost:3000/manager` (Default passkey: `manager@secure2026`)

---

## ☁️ Supabase Cloud & Vercel Deployment

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the entire contents of `supabase-schema.sql`.
   - Creates `employees`, `login_audit_logs`, and `chart_completions` tables with indexes.
   - Automatically sets up the `audit-photos` Storage bucket with security policies.
4. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from **Project Settings -> API**.

### 2. Vercel Deployment
1. Import this repository into [Vercel](https://vercel.com).
2. Configure the following **Environment Variables**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   MANAGER_USERNAME=manager
   MANAGER_PASSWORD=your-secure-manager-password
   MANAGER_SECRET=random-32-character-secret-string
   ```
3. Click **Deploy**. Vercel will automatically build and publish the app.

---

## 🛡️ Security Hardening

- **PostCSS Vulnerability Override**: Clean dependency tree (`npm audit` reports 0 vulnerabilities).
- **HTTP Security Headers**: `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS), and `Permissions-Policy`.
- **Magic Byte Validation**: Validates binary headers of uploaded images (JPEG, PNG, WebP, BMP) while blocking disguised executables and malicious SVG scripts.
- **Prototype Pollution Defense**: Restricted key updaters blocking `__proto__`, `constructor`, and `prototype`.
- **Rate Limiting**: Throttles failed login attempts on manager and employee routes to block brute-force attacks.
- **Timing Attack Mitigation**: Constant-time verification (`crypto.timingSafeEqual`) on manager passkeys.

---

## 📄 License

Private and confidential. For internal organizational data entry training and operations.
