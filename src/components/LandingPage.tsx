import React from 'react';
import {
  Shield,
  Sparkles,
  ArrowRight,
  Receipt,
  Wallet,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeftRight,
  Database,
  Building2,
  Banknote,
  Download
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (defaultRole?: 'admin' | 'user') => void;
  onGoToRegister: () => void;
  onOpenInstall?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, onGoToRegister, onOpenInstall }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-teal-500 selection:text-white">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-800 border border-teal-600/50 flex items-center justify-center p-1.5 shadow-md shadow-teal-950/20">
              <img
                src="/Takara_logo_original_transparan.png"
                alt="Takara"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight leading-none">
                  Takara
                </span>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80">
                  Keuangan Keluarga
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Sistem Pembukuan Rumah Tangga & Multi-Household
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {onOpenInstall && (
              <button
                onClick={onOpenInstall}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all"
                title="Pasang di Layar Utama HP"
              >
                <Download className="w-3.5 h-3.5 text-teal-700" />
                <span>Pasang di HP</span>
              </button>
            )}

            <button
              onClick={() => onGoToLogin('admin')}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Portal</span>
            </button>

            <button
              onClick={() => onGoToRegister()}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 rounded-xl transition-all"
            >
              Daftar Akun
            </button>

            <button
              onClick={() => onGoToLogin('user')}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-teal-900/20 hover:shadow-lg transition-all active:scale-95"
            >
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-teal-50/80 via-slate-50/50 to-transparent pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Versi Baru: Multi-Household, AI Vision OCR & Double-Entry Ledger</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Pencatatan Keuangan Rumah Tangga{' '}
            <span className="text-teal-700">
              Cerdas, Terisolasi & Akurat
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Kelola kas keluarga bersama pasangan, pisahkan dompet tunai & rekening bank, pantau transfer antar akun tanpa bias laba-rugi, dan scan struk nota instan dengan AI Vision.
          </p>

          {/* Hero Action Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              onClick={() => onGoToLogin('user')}
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-teal-700 via-teal-800 to-teal-900 hover:from-teal-800 hover:to-teal-950 text-white rounded-2xl font-bold text-sm shadow-xl shadow-teal-950/20 hover:shadow-2xl transition-all flex items-center justify-center gap-2 group active:scale-98"
            >
              <span>Mulai Catat Keuangan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onGoToRegister()}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Users className="w-4 h-4 text-teal-700" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {/* Micro trust note */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              PIN 5-digit Cepat
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              100% Data Privat
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Bisa Impor Excel
            </span>
          </div>

          {/* Interactive UI Showcase Cards */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
            <div className="p-3 sm:p-5 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Showcase 1: Arus Kas & Saldo */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
                      <span>Total Saldo Bersih</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                        Kas Sehat
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-white">
                      Rp 14.850.000
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-emerald-400 block font-semibold text-[11px] mb-0.5">
                        ↑ Pemasukan
                      </span>
                      <span className="font-bold text-slate-100">Rp 18.500.000</span>
                    </div>
                    <div>
                      <span className="text-rose-400 block font-semibold text-[11px] mb-0.5">
                        ↓ Pengeluaran
                      </span>
                      <span className="font-bold text-slate-100">Rp 3.650.000</span>
                    </div>
                  </div>
                </div>

                {/* Showcase 2: AI Receipt Scanner */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">AI Vision Scanner</h4>
                          <span className="text-[10px] text-slate-500">Scan Struk / Nota</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Otomatis
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Merchant:</span>
                        <strong className="text-slate-900">Supermarket Indomaret</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Nominal Terbaca:</span>
                        <strong className="text-teal-700 font-bold">Rp 145.500</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Kategori AI:</span>
                        <span className="text-slate-800 font-medium">Belanja Harian</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Gemini & OpenAI Vision terintegrasi langsung</span>
                  </div>
                </div>

                {/* Showcase 3: Multi-Dompet Keluarga */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">Multi-Dompet</h4>
                          <span className="text-[10px] text-slate-500">Tunai, Bank & E-Wallet</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        3 Dompet
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-semibold text-slate-800">Kas Tunai (Cash)</span>
                        </div>
                        <span className="font-bold text-slate-900">Rp 850.000</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-semibold text-slate-800">Rekening Gaji Bank</span>
                        </div>
                        <span className="font-bold text-slate-900">Rp 12.500.000</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Transfer antar akun tanpa bias laba-rugi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid Section */}
      <section className="py-16 sm:py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold text-teal-700 tracking-wider uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Fitur Dirancang untuk Keluarga
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
              Kelebihan Takara Dibanding Catatan Biasa
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Semua kebutuhan finansial keluarga modern ada dalam satu dashboard rapi dan mudah dipakai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Multi-Household Terisolasi
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Buat ruang terpisah untuk pengeluaran rumah tangga utama, usaha sampingan, atau tabungan pribadi tanpa khawatir data bercampur.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                AI Vision Receipt Scanner
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Scan nota fisik atau struk belanja instan. Didukung model AI terkini (Gemini & OpenAI) untuk auto-fill nominal dan kategori akurat.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Double-Entry Ledger Akurat
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Transfer dari Bank ke Dompet Tunai bukan pengeluaran. Saldo dihitung dinamis dari buku besar berintegritas tinggi.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Impor Data Excel Finansial
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Sudah punya pembukuan lama di Excel? Impor berkas spreadsheet langsung dengan validasi rekonsiliasi otomatis tanpa hilang histori.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Hak Akses Keluarga & Pasangan
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Atur peran setiap anggota: Owner (pemilik buku), Admin (pengelola), Member (pencatat harian), hingga Viewer (hanya pantau).
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 hover:border-teal-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Privasi Lokal & Cloud Mandiri
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Data Anda aman disimpan di perangkat lokal tanpa tracking pihak ketiga, plus dukungan opsi sinkronisasi mandiri ke Supabase Cloud.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#042F2E] via-[#0F766E] to-[#115E59] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Mulai Rapikan Keuangan Rumah Tangga Hari Ini
          </h2>
          <p className="mt-4 text-sm sm:text-base text-teal-100/90 max-w-xl mx-auto leading-relaxed">
            Daftarkan akun Anda dalam hitungan detik. Tanpa biaya langganan, tanpa repot OTP, cukup nama dan PIN 5-digit aman.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onGoToRegister()}
              className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-100 text-teal-950 font-extrabold text-sm rounded-2xl shadow-xl transition-all active:scale-98"
            >
              Daftar Pengguna Baru
            </button>
            <button
              onClick={() => onGoToLogin('user')}
              className="w-full sm:w-auto px-8 py-3.5 bg-teal-900/60 hover:bg-teal-900/80 text-white border border-teal-400/40 font-bold text-sm rounded-2xl transition-all active:scale-98"
            >
              Masuk ke Akun
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-800 border border-teal-600/40 flex items-center justify-center p-1">
              <img
                src="/Takara_logo_original_transparan.png"
                alt="Takara"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-slate-200 text-sm">Takara Keuangan Keluarga</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onGoToLogin('user')} className="hover:text-white transition-colors">
              Login Pengguna
            </button>
            <button onClick={() => onGoToRegister()} className="hover:text-white transition-colors">
              Daftar Akun
            </button>
            <button onClick={() => onGoToLogin('admin')} className="hover:text-white transition-colors flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" />
              <span>Admin Portal</span>
            </button>
          </div>

          <div className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} Takara. Terisolasi, Akuntabel & Aman.
          </div>
        </div>
      </footer>
    </div>
  );
};
