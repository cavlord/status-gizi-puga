# Dashboard Status Gizi Balita — UPT Puskesmas Pulau Gadang

> Monitoring status gizi balita (0-5 tahun) per Posyandu. Data tersinkron otomatis dari Google Sheets ke database Supabase setiap hari.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion + GSAP
- **Charts:** Recharts
- **State:** TanStack Query v5
- **Auth:** Custom JWT (via Supabase Edge Functions)
- **Backend:** Supabase (PostgreSQL + Edge Functions)

## Fitur Utama

- Dashboard monitoring status gizi real-time
- Visualisasi tren status gizi per bulan
- Data per Posyandu dengan filter desa/kelurahan dan bulan
- Pencarian riwayat pengukuran anak (per anak)
- Manajemen user (admin)
- Import data dari Google Sheets (admin)
- Dark mode
- Responsive (mobile, tablet, desktop)

## Development

```bash
npm install
npm run dev      # dev server di http://localhost:8080
npm run build    # production build
npm run lint     # eslint
```

## Struktur Proyek

```
src/
├── components/    # UI components (pages, components, ui)
├── contexts/      # React contexts (Auth, Data, Theme)
├── hooks/         # Custom hooks
├── lib/           # Utilities, validation, helpers
└── pages/         # Page components (lazy-loaded)
```

## Deployment

Edge Functions di-deploy ke Supabase:
```bash
npx supabase functions deploy <function-name>
```

## Build & Design

Rossa Gusti Yolanda, S.Gz — UPT Puskesmas Pulau Gadang XIII Koto Kampar

