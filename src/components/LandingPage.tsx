import React from 'react';
import { ArrowRight, Download, Shield, Wallet, ReceiptText, Users, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (defaultRole?: 'admin' | 'user') => void;
  onGoToRegister: () => void;
  onOpenInstall?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, onGoToRegister, onOpenInstall }) => (
  <div className="welcome-page">
    <header>
      <div className="brand-cluster">
        <span className="brand-badge" aria-hidden="true">T</span>
        <span className="wordmark">Takara</span>
      </div>
      {onOpenInstall && (
        <button className="nb-btn" onClick={onOpenInstall} aria-label="Pasang Takara di perangkat">
          <Download size={18} strokeWidth={2.3} />
          <span>Pasang aplikasi</span>
        </button>
      )}
    </header>
    <main>
      <div className="welcome-hero-card">
        <span className="nb-chip inline-flex items-center gap-1.5 bg-[#FFD166] px-3.5 py-1 text-xs mb-4">
          <Sparkles size={14} strokeWidth={2.5} />
          <span>Keuangan Rumah Tangga Seru!</span>
        </span>
        <div className="welcome-symbol">
          <Wallet size={38} strokeWidth={2.1} />
        </div>
        <h1>
          Keuangan keluarga,
          <br />
          tercatat bersama.
        </h1>
        <p>
          Satu tempat ceria & rapi untuk memantau saldo tiap dompet, scan struk belanja pakai AI, dan mengatur keuangan household Anda.
        </p>
        <div className="welcome-actions">
          <button className="welcome-primary" onClick={() => onGoToLogin('user')}>
            <span>Masuk ke Takara</span>
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
          <button onClick={onGoToRegister}>Buat akun keluarga baru</button>
        </div>
      </div>

      <div className="welcome-features">
        <span>
          <Wallet size={17} strokeWidth={2.3} />
          Saldo tiap dompet
        </span>
        <span>
          <ReceiptText size={17} strokeWidth={2.3} />
          Catatan harian & Scan AI
        </span>
        <span>
          <Users size={17} strokeWidth={2.3} />
          Household bersama
        </span>
      </div>
    </main>
    <footer>
      <span>Takara · {new Date().getFullYear()}</span>
      <button className="nb-btn" onClick={() => onGoToLogin('admin')}>
        <Shield size={15} strokeWidth={2.3} />
        <span>Masuk admin</span>
      </button>
    </footer>
  </div>
);
