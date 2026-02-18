# LappyGo — Fullstack Next.js + Supabase + Midtrans

Modern fullstack e-commerce platform built with **Next.js 16**, **Supabase**, and **Midtrans**.  
Project ini dikembangkan sebagai **portfolio production-ready** untuk menunjukkan implementasi payment gateway, realtime order system, admin dashboard, dan scalable architecture.

> Fokus: clean architecture, realtime UX, payment integration, dan developer experience.

---

## 🔗 Demo & Repository

- **Live Demo:** _(https://lappygo-store.vercel.app/)_  
- **GitHub Repo:** _(https://github.com/yudhasanggrama/lappygo-store/)_  

---

## 🧠 Project Overview

LappyGo adalah aplikasi e-commerce fullstack dengan fitur utama:

- Checkout & payment gateway (Midtrans Snap)
- Realtime order updates (Supabase Realtime)
- Admin dashboard
- Stock synchronization
- Email notification system
- Production-ready architecture

Project ini menampilkan kemampuan:

- Fullstack Next.js development
- Payment gateway integration
- Realtime database handling
- Clean UI engineering
- Scalable project structure

---

## 🚀 Tech Stack

### Frontend
- Next.js 15.5.4 (App Router)
- React 19
- Tailwind CSS 4
- Shadcn UI
- Zustand
- TypeScript

### Backend
- Next.js Route Handlers
- Supabase (Postgres, Auth, Realtime)
- Midtrans Payment Gateway
- Resend Email API

### Tooling
- ESLint 9  
- Zod validation  
- Lucide React icons  

---

## 🛍 Features

### User Side
- Product catalog
- Cart system (Zustand)
- Checkout flow
- Midtrans Snap payment popup
- Payment status realtime
- Order history page
- Email after payment
- Auto cancel unpaid order
- Stock auto update

### Admin Panel
- Manage orders
- Update order status
- Cancel & refund order
- Realtime order updates
- Stock management
- Email notification to customer

### Realtime System
- Supabase realtime subscription
- UI update tanpa refresh
- Admin & user sync instant

### Payment Flow
```
User checkout  
→ Midtrans Snap popup  
→ User payment  
→ Midtrans webhook  
→ Update database  
→ Reduce stock  
→ Send email  
→ Realtime UI update  
```

---

## 🏗 Architecture

```
Frontend (Next.js)
      ↓
API Route (Server)
      ↓
Midtrans Payment
      ↓
Webhook
      ↓
Supabase Database
      ↓
Realtime broadcast
      ↓
Admin & User UI update
```

---

## 📦 Getting Started

```bash
npm install
npm run dev
```

Open:
```
http://localhost:3000
```

Webhook testing:
```bash
ngrok http 3000
```

---

## 🔐 Environment Variables

Create `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false

RESEND_API_KEY=
```

---

## 📂 Project Structure

```
app/
 ├ checkout/
 ├ my-orders/
 ├ admin/
 ├ api/
lib/
 ├ supabase/
 ├ midtrans/
 ├ email/
stores/
hooks/
components/
```

---

## 🧪 Technical Challenges Solved

### Realtime Order Sync
- Supabase realtime subscription
- Auto reconnect strategy
- UI update without refresh

### Payment Gateway Integration
- Midtrans Snap integration
- Webhook signature verification
- Status reconciliation

### Stock Consistency
- Reduce stock after settlement
- Restore stock when cancelled
- Prevent double update

### Admin ↔ User Sync
- Order update instant
- No manual refresh needed

---

## 🎯 Why This Project

Project ini menunjukkan kemampuan:

- Fullstack architecture
- Payment system integration
- Realtime database system
- Production-ready mindset
- Clean scalable codebase

Cocok untuk portfolio posisi:

- Fullstack Developer
- Backend Developer
- Next.js Engineer

---

## 👨‍💻 Author

**Yudha Sanggrama Wijaya**  
Fullstack Developer

GitHub: _(https://github.com/yudhasanggrama)_  
LinkedIn: _(https://www.linkedin.com/in/yudhasanggrama/)_  
Portfolio: _(opsional)_

---

## ⭐ Future Improvements

- Product search & filter  
- Pagination  
- Admin analytics  
- Multi-role auth  
- Invoice PDF  
- Image upload storage  
- Review system  

---

## 📜 License
MIT
