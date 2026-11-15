import React from 'react';
import { ArrowRight, Download, Shield, Wallet, ReceiptText, Users } from 'lucide-react';
interface LandingPageProps {
  onGoToLogin: (defaultRole?: 'admin' | 'user') => void;
  onGoToRegister: () => void;
  onOpenInstall?: () => void;
}
export const LandingPage:React.FC<LandingPageProps>=({onGoToLogin,onGoToRegister,onOpenInstall})=>(
  <div className="welcome-page">
    <header><span className="wordmark">Takara</span>{onOpenInstall&&<button onClick={onOpenInstall} aria-label="Pasang Takara di perangkat"><Download size={19}/><span>Pasang aplikasi</span></button>}</header>
    <main>
      <div className="welcome-symbol"><Wallet size={42} strokeWidth={1.25}/></div>
      <h1>Keuangan keluarga,<br/>tercatat bersama.</h1>
      <p>Satu tempat untuk melihat saldo, mencatat pengeluaran, dan mengatur keuangan household Anda.</p>
      <div className="welcome-actions"><button className="welcome-primary" onClick={()=>onGoToLogin('user')}>Masuk ke Takara<ArrowRight size={20}/></button><button onClick={onGoToRegister}>Buat akun baru</button></div>
      <div className="welcome-features"><span><Wallet size={19}/>Saldo tiap dompet</span><span><ReceiptText size={19}/>Catatan harian</span><span><Users size={19}/>Household bersama</span></div>
    </main>
    <footer><span>Takara · {new Date().getFullYear()}</span><button onClick={()=>onGoToLogin('admin')}><Shield size={15}/>Masuk admin</button></footer>
  </div>
);
