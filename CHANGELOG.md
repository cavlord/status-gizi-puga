# Dokumentasi Perubahan UI

Tanggal: 9 Oktober 2026
Cabang: fix/p0-ui-issues

---

## Ringkasan

Refactor UI menyeluruh pada Dashboard Status Gizi Balita — mulai dari perbaikan bug, peningkatan aksesibilitas, hingga redesign navigasi dari top-nav ke sidebar tetap.

---

## 1. P0 — Perbaikan Kritis

### 1.1 NotFound Page (src/pages/NotFound.tsx)
**Sebelum:** Hardcoded `bg-gray-100`, teks Inggris, tanpa dark mode support.
**Sesudah:** Komponen Card/Button dari shadcn/ui, dark mode support, teks Bahasa Indonesia, ikon Home, branding aplikasi.

### 1.2 Hapus Dead Code (src/pages/Index.tsx)
**Sebelum:** Halaman Index tidak direferensikan di router mana pun, menggunakan `useQuery` langsung (tidak konsisten dengan `useData` context).
**Sesudah:** Dihapus. SummaryCards.tsx juga dihapus (orphan setelah Index.tsx dihapus).

### 1.3 Storage Aman (src/pages/UserManagement.tsx)
**Sebelum:** `localStorage.getItem('posyandu_token')` langsung.
**Sesudah:** `safeStorage.getItem('posyandu_token')` sesuai standar AGENTS.md.

### 1.4 Konsistensi Password (src/pages/Auth.tsx)
**Sebelum:** Reset password hanya memerlukan min 8 karakter.
**Sesudah:** Menggunakan `passwordSchema` yang sama (min 12 karakter, upper+lower+digit+special).

---

## 2. P1 — Peningkatan UX

### 2.1 Loading State Dashboard (src/pages/Dashboard.tsx)
**Sebelum:** Tidak ada loading state, user melihat layar kosong saat data dimuat.
**Sesudah:** Menampilkan `LoadingScreen` saat `isLoading`, pola yang sama dengan DataRecords.

### 2.2 Ukuran Font Modal (src/components/ChildDetailsModal.tsx)
**Sebelah:** Font 7px–10px — sulit dibaca, terutama di mobile.
**Sesudah:** Minimum `text-xs` (12px), responsif dan mudah dibaca.

### 2.3 Aksesibilitas Tabel (src/components/PosyanduTable.tsx)
**Sebelum:** Tombol cell tanpa aria-label.
**Sesudah:** Setiap cell clickable memiliki `aria-label="Lihat detail {status} di Posyandu {posyandu}"`.

### 2.4 Aksesibilitas Status Cards (src/components/VillageNutritionalStatus.tsx)
**Sebelum:** Div clickable tanpa role/keyboard support.
**Sesudah:** `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` (Enter/Space).

### 2.5 Konfirmasi Import (src/pages/Settings.tsx)
**Sebelum:** Import langsung tanpa konfirmasi.
**Sesudah:** AlertDialog warning bahwa data lama akan dihapus.

---

## 3. Perbaikan Chart

### 3.1 Warna Konsisten (src/components/NutritionalStatusChart.tsx)
**Sebelum:** HSL CSS variables untuk line colors.
**Sesudah:** Menggunakan `STATUS_COLORS` yang di-export dari `NutritionalStatusSummary.tsx` — sama dengan EnhancedNutritionalChart.

### 3.2 Label YAxis (src/components/NutritionalStatusChart.tsx)
**Sebelum:** Tidak ada label pada sumbu Y.
**Sesudah:** Label "Jumlah Anak" dengan `allowDecimals={false}`.

### 3.3 Persentase di Pie Chart (src/components/NutritionalStatusSummary.tsx)
**Sebelum:** Hanya legend tanpa angka persentase langsung di slice.
**Sesudah:** Label persentase langsung di slice pie chart (pola yang sama dengan VillageNutritionalStatus).

### 3.4 Empty State (src/components/NutritionalStatusSummary.tsx)
**Sebelum:** Pie chart kosong saat data tidak ada.
**Sesudah:** Pesan "Tidak ada data status gizi untuk ditampilkan".

---

## 4. Sorting Tabel (src/components/PosyanduTable.tsx)
**Sebelum:** Tabel tidak bisa diurutkan.
**Sesudah:** Header kolom (Posyandu dan TOTAL) bisa di-klik untuk sorting asc/desc/none. Row "Tidak Naik BB" selalu tetap di bawah. Header memiliki `aria-sort`.

---

## 5. Redesign Navigasi (src/components/AppLayout.tsx)

### 5.1 Top Nav → Sidebar Tetap
**Sebelum:** Navigasi horizontal di atas (top nav).
**Sesudah:** Sidebar tetap di kiri, 256px lebar, bisa di-collapse ke 64px icon rail.

### 5.2 Struktur Sidebar
- Logo dan brand di bagian atas
- Navigasi berkelompok:
  - Menu Utama: Dashboard, Analytics
  - Administrasi: Manajemen User, Pengaturan (admin only)
- Active state: background tint + indikator bar di kiri
- Animasi GSAP stagger (slide dari kiri)

### 5.3 Collapse
- Tombol "Perkecil" di bawah sidebar
- State tersimpan di `safeStorage` (`posyandu_sidebar_collapsed`)
- Animasi width 300ms ease-in-out
- Saat collapsed: icon-only dengan Tooltip

### 5.4 Top Bar (baru)
- Breadcrumb (Dashboard > nama halaman)
- Online badge
- Theme toggle
- User dropdown (D/email + Keluar)

### 5.5 Mobile
- Sidebar hidden, hamburger membuka Sheet overlay
- Sheet menutup otomatis saat navigasi
- User dropdown juga tersedia di mobile

### 5.6 Content Area
- Max width: 1600px (sebelumnya 7xl)
- Mengisi viewport height, hanya content yang scroll
- Padding lebih kecil

---

## 6. Perbaikan Animasi GSAP (src/hooks/useGsapAnimations.ts)

**Masalah:** `clearProps: "all"` menghapus opacity setelah animasi, menyebabkan elemen tidak terlihat.

**Perubahan:**
- `clearProps: "all"` → `clearProps: "transform"` (pertahankan opacity)
- `immediateRender: false` pada scroll reveal
- `once: true` pada scroll trigger

---

## 7. README.md

Ditulis ulang dengan info lengkap: deskripsi proyek, tech stack, fitur, perintah development, struktur folder, panduan deployment.

---

## Teknologi yang Digunakan

| Kategori | Teknologi |
|----------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| Animasi | Framer Motion + GSAP |
| Charts | Recharts |
| State | TanStack Query v5 |
| Auth | Custom JWT (Supabase Edge Functions) |
| Backend | Supabase (PostgreSQL + Edge Functions) |

---

## Branch

Semua perubahan di-commit dan push ke cabang `fix/p0-ui-issues` di GitHub.
