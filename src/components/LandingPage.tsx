import React from 'react';
import { ArrowRight, Download, Wallet, ReceiptText, Users } from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onOpenInstall?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, onGoToRegister, onOpenInstall }) => (
  <div className="welcome-page">
    <header>
      <div className="brand-cluster">
        <img src="/Takara-192.png" alt="Takara" className="brand-logo-img" />
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
        <div className="mb-4">
          <img
            src="/Takara.png"
            alt="Logo Pohon Keluarga Takara"
            className="w-24 h-24 object-contain"
          />
        </div>
        <h1>
          Keuangan keluarga,
          <br />
          tercatat bersama.
        </h1>
        <p>
          Catat pemasukan, pengeluaran, dan transfer antar dompet keluarga secara rapi — lengkap dengan scan struk dan laporan bulanan.
        </p>
        <div className="welcome-actions">
          <button className="welcome-primary" onClick={onGoToLogin}>
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
    </footer>
  </div>
);
