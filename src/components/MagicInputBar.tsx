import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { formatIDR } from '../lib/money';
import {
  parseNaturalTransactionText,
  enhanceMagicInputWithAI,
  type ParsedMagicInput
} from '../lib/magicInputParser';
import { Sparkles, Mic, MicOff, Check, Loader2, Wand2, X } from 'lucide-react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal?: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface MagicInputBarProps {
  mode?: 'standalone' | 'prefill';
  onApplyToForm?: (parsed: ParsedMagicInput) => void;
}

export const MagicInputBar: React.FC<MagicInputBarProps> = ({
  mode = 'standalone',
  onApplyToForm
}) => {
  const { wallets, categories, addTransaction, addLabel, labels, state } = useApp();
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [aiOverride, setAiOverride] = useState<ParsedMagicInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const parsed = useMemo(() => {
    if (aiOverride && text.trim()) return aiOverride;
    return parseNaturalTransactionText(text, wallets, categories);
  }, [text, wallets, categories, aiOverride]);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  const toggleVoiceInput = () => {
    setErrorMsg('');
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechCtor =
      ((window as unknown as Record<string, unknown>).SpeechRecognition as new () => SpeechRecognitionInstance) ||
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => SpeechRecognitionInstance);

    if (!SpeechCtor) {
      setErrorMsg('Browser ini belum mendukung dikte suara. Silakan ketik kalimat langsung.');
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = 'id-ID';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (ev: SpeechRecognitionEventLike) => {
        let transcript = '';
        for (let i = 0; i < ev.results.length; i++) {
          transcript += ev.results[i]?.[0]?.transcript || '';
        }
        setAiOverride(null);
        setText(transcript.trim());
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
      setErrorMsg('Mikrofon tidak dapat diakses.');
    }
  };

  const handleAIRefine = async () => {
    if (!text.trim() || isAiRefining) return;
    setIsAiRefining(true);
    setErrorMsg('');
    try {
      const result = await enhanceMagicInputWithAI(text, wallets, categories, state.aiConfig);
      setAiOverride(result);
      if (mode === 'prefill' && onApplyToForm && result.amount > 0) {
        onApplyToForm(result);
      }
    } finally {
      setIsAiRefining(false);
    }
  };

  const handleDirectAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!text.trim()) return;

    if (parsed.amount <= 0) {
      setErrorMsg('Sertakan nominal uang, misal: "Beli kopi susu 25rb pakai GoPay"');
      return;
    }

    if (mode === 'prefill' && onApplyToForm) {
      onApplyToForm(parsed);
      setToastMsg('Kolom form terisi otomatis!');
      setTimeout(() => setToastMsg(''), 2500);
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      if (parsed.label && !labels.includes(parsed.label)) {
        await addLabel(parsed.label).catch(() => {});
      }
      const res = await addTransaction({
        type: parsed.type,
        amount: parsed.amount,
        categoryId: parsed.categoryId,
        categoryName: parsed.categoryName,
        sourceWalletId: parsed.type === 'income' ? undefined : parsed.sourceWalletId || wallets[0]?.id,
        destinationWalletId:
          parsed.type === 'income'
            ? parsed.destinationWalletId || wallets[0]?.id
            : parsed.type === 'transfer'
            ? parsed.destinationWalletId || wallets[1]?.id
            : undefined,
        label: parsed.label,
        description: parsed.description
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan transaksi kilat.');
      } else {
        setText('');
        setAiOverride(null);
        setToastMsg(`Tersimpan: ${parsed.description} (${formatIDR(parsed.amount)}) ✨`);
        setTimeout(() => setToastMsg(''), 3500);
      }
    } finally {
      setSaving(false);
    }
  };

  const walletLabel = useMemo(() => {
    if (parsed.type === 'transfer') {
      const src = wallets.find(w => w.id === parsed.sourceWalletId)?.name || 'Asal';
      const dst = wallets.find(w => w.id === parsed.destinationWalletId)?.name || 'Tujuan';
      return `${src} → ${dst}`;
    }
    const targetId = parsed.type === 'income' ? parsed.destinationWalletId : parsed.sourceWalletId;
    return wallets.find(w => w.id === targetId)?.name || wallets[0]?.name || 'Dompet';
  }, [parsed, wallets]);

  return (
    <div className="nb-card bg-[#FFF9DB] p-3.5 rounded-3xl space-y-2.5">
      <form onSubmit={handleDirectAction} className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#073B4C]">
            <Sparkles className="w-3.5 h-3.5 text-[#05966F] stroke-[2.6]" />
            <span>Catat Kilat Ketik / Suara</span>
          </span>
          {text.trim() && (
            <button
              type="button"
              onClick={handleAIRefine}
              disabled={isAiRefining}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-[#DDD6FE] text-[#073B4C] border-[1.5px] border-[#073B4C] px-2.5 py-0.5 rounded-full hover:bg-[#C4B5FD]"
              title="Rapikan deteksi kalimat dengan AI"
            >
              {isAiRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>AI Perjelas</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={text}
              onChange={e => {
                setAiOverride(null);
                setErrorMsg('');
                setText(e.target.value);
              }}
              placeholder='Cth: "Beli bensin 50rb pakai GoPay #motor"'
              aria-label="Ketik kalimat transaksi kilat"
              className="w-full pl-3.5 pr-8 py-2.5 bg-white border-2 border-[#073B4C] rounded-2xl text-xs sm:text-sm font-bold text-[#073B4C] focus:outline-none"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setAiOverride(null);
                  setErrorMsg('');
                }}
                aria-label="Hapus teks kilat"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#073B4C]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {speechSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={isListening ? 'Hentikan dikte suara' : 'Dikte suara transaksi'}
              title={isListening ? 'Sedang mendengarkan… Klik untuk berhenti' : 'Bicara dengan mikrofon (Bahasa Indonesia)'}
              className={`nb-btn w-11 h-11 grid place-items-center shrink-0 ${
                isListening ? 'bg-[#FF6B6B] text-white animate-pulse' : 'bg-white text-[#073B4C]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Live Parsed Chips & Submit */}
        {text.trim() && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] ${
                  parsed.type === 'income'
                    ? 'bg-[#A7F3D0] text-[#073B4C]'
                    : parsed.type === 'transfer'
                    ? 'bg-[#BAE6FD] text-[#073B4C]'
                    : 'bg-[#FECDD6] text-[#073B4C]'
                }`}
              >
                {parsed.type === 'income' ? '↙ Masuk' : parsed.type === 'transfer' ? '⇄ Transfer' : '↗ Keluar'}
              </span>

              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] bg-white text-[#073B4C] tabular-nums">
                {parsed.amount > 0 ? formatIDR(parsed.amount) : 'Nominal?'}
              </span>

              {parsed.categoryName && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] bg-[#FFD166] text-[#073B4C] truncate max-w-[150px]">
                  {parsed.categoryName}
                </span>
              )}

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#073B4C] bg-[#E0F2FE] text-[#073B4C] truncate max-w-[140px]">
                👛 {walletLabel}
              </span>

              {parsed.label && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border-[1.5px] border-[#073B4C] bg-[#D9F99D] text-[#073B4C]">
                  #{parsed.label}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || parsed.amount <= 0}
              className="nb-btn bg-[#06D6A0] text-[#073B4C] px-3.5 py-1.5 text-xs flex items-center gap-1.5 shrink-0 ml-auto"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{mode === 'prefill' ? 'Isi ke Form' : 'Simpan Kilat'}</span>
            </button>
          </div>
        )}
      </form>

      {isListening && (
        <p className="text-[11px] font-extrabold text-[#B42340] px-1">
          🎙️ Silakan ucapkan transaksi Anda (contoh: "Makan siang ayam bakar 45 ribu pakai BCA")…
        </p>
      )}

      {errorMsg && (
        <p role="alert" className="text-xs font-bold text-[#911D35] bg-[#FFE0E5] border-[1.5px] border-[#073B4C] rounded-xl px-3 py-1.5">
          {errorMsg}
        </p>
      )}

      {toastMsg && (
        <p role="status" className="text-xs font-extrabold text-[#064E3B] bg-[#D1FAE5] border-[1.5px] border-[#073B4C] rounded-xl px-3 py-1.5">
          {toastMsg}
        </p>
      )}
    </div>
  );
};
