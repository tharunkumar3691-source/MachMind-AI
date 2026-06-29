# MachMind AI - Multimodal AI & AR Industrial Repair Guide

MachMind AI is an enterprise-grade AI-powered augmented reality assistant for industrial maintenance. Built for the Google Gemini API Developer Challenge, it provides technician-guided troubleshooting by fusing real-time telemetry, spatial vision analysis, and web-grounded diagnostic manuals.

## 🚀 Key Features

*   **Multimodal AI Diagnosis:** Combines visual feed, audio acoustics, and device vibration metrics to detect machine faults.
*   **Web-Grounded Prescriptions:** Corroborates diagnoses against uploaded technical manuals and live search queries via Gemini.
*   **AR Overlay Navigation:** Uses computer vision coordinate mapping and ghost overlays to pinpoint faulty components in 3D.
*   **Decentralized Telemetry Verification:** Real-time analysis of sound acoustics and vibration thresholds to verify if a repair was completed correctly.
*   **High Performance Datastore:** Relies on AWS Aurora PostgreSQL and Drizzle ORM for transaction-safe telemetry logging and repair histories.
*   **Scalable Asset Storage:** Powered by Amazon S3 for presigned-URL based uploads of heavy machinery manuals, audio telemetry, and diagnostic evidence.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client[React SPA Client - Vite] <-->|HTTP / REST| API[Express API Server]
    API <-->|Drizzle ORM| DB[(AWS Aurora PostgreSQL)]
    API <-->|AWS SDK| S3[[Amazon S3 Bucket]]
    API <-->|Google GenAI SDK| Gemini[Gemini 1.5 Pro / Flash]
```

### Frontend
*   **React 19 & Vite 6** (Single Page Application, bundle split for optimal chunk delivery)
*   **Tailwind CSS** & Custom Design System (modern dark-theme dashboard, glassmorphism, fluid micro-animations)
*   **WebRTC APIs** (real-time camera & microphone audio analysis)

### Backend
*   **Express 5** (High-throughput server, Vercel Serverless ready)
*   **Drizzle ORM & Postgres.js** (Active connection pooling, transaction isolation, database schema sync)
*   **Google GenAI SDK** (Advanced structured parsing, image/audio reasoning, and grounded search)
*   **AWS SDK for S3** (Secure presigned-URL evidence pipeline)

---

## 💻 Running Locally

### Prerequisites
*   Node.js v18+
*   PostgreSQL or AWS Aurora instance
*   Amazon S3 Bucket

### Configuration
Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your-key-here
DATABASE_URL=postgres://user:password@host:port/database
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-key-here
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
```

### Commands

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Synchronize database schema:**
    ```bash
    npm run db:push
    ```
3.  **Run Build (Production Mode):**
    ```bash
    npm run build
    ```
4.  **Start Production Server:**
    ```bash
    npm start
    ```
    *(The server runs on http://localhost:3000 hosting both the API and optimized static frontend files).*

---

## 🧪 E2E Verification
The project contains an automated E2E integration test suite covering S3 CRUD, database transaction state changes, and live Gemini API diagnostic reasoning.

To run tests:
```bash
npx tsx e2e_test.ts
```
