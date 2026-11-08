# Medical Insurance Data Entry Portal — Supabase & Vercel Deployment Guide

This application is built with **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Supabase** for enterprise data entry practice, employee identity verification, and live productivity monitoring.

---

## 1. Supabase Cloud Setup (2 Minutes)

1. Create a free account or project at [supabase.com](https://supabase.com).
2. Go to your project **SQL Editor** (`Database -> SQL Editor -> New Query`).
3. Open `supabase-schema.sql` from this repository, copy its entire contents, paste it into the SQL Editor, and click **Run**.
   - This automatically creates the `employees`, `login_audit_logs`, and `chart_completions` tables with optimized indexes.
   - It also creates the `audit-photos` Supabase Storage bucket with public-read and authenticated-insert policies.
4. Go to **Project Settings -> API** and copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **Project API Anon Key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Project Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)

---

## 2. Vercel Deployment

### Option A: One-Click Deploy via GitHub
1. Push this repository to your GitHub account.
2. In [Vercel](https://vercel.com), click **Add New -> Project** and import the repository.
3. In the **Environment Variables** section, add:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   MANAGER_USERNAME=manager
   MANAGER_PASSWORD=your-secure-manager-password
   MANAGER_SECRET=random-32-character-secret-string
   ```
4. Click **Deploy**. Vercel will automatically build and launch your application.

### Option B: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
# Enter environment variables when prompted or configure them in Vercel project settings
```

---

## 3. Operational Workflow

### For the Manager:
1. Navigate to `https://your-app.vercel.app/manager`.
2. Authenticate with your manager credentials.
3. In the **Employee Credentials Management** tab:
   - Create new unique credentials (Name, Username, Password) for each employee.
   - Suspend or activate accounts with one click.
4. In the **Operator Productivity & Speed (CPM)** tab:
   - Monitor real-time charts completed per minute (CPM), active time, and total volume.
5. In the **Home Practice Attendance & Device Audit** tab:
   - Inspect captured webcam photos, client IP addresses, city/country location, screen resolutions, browsers, and operating systems.

### For Employees (Practicing from Home):
1. Provide employees with the dedicated link: `https://your-app.vercel.app/login`.
2. The employee approves camera access and captures their live identity photograph.
3. They enter their unique manager-issued credentials.
4. Upon successful verification, they are automatically forwarded into the pure 1:1 Medical Insurance application (`/`).
5. Notice: The main data entry portal (`/`) has **ZERO visible login or admin buttons**, preventing operators from probing or tampering with system controls.

