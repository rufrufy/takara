import React from 'react';

export const BrutalismAnimalBackdrop: React.FC = () => {
  return (
    <div className="brutal-animal-backdrop" aria-hidden="true">
      {/* LEFT 1: Mango Lucky Cat */}
      <div className="brutal-animal brutal-animal--left-1">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Tail */}
          <path
            d="M 104 106 Q 128 96 122 72"
            fill="none"
            stroke="#073B4C"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M 104 106 Q 128 96 122 72"
            fill="none"
            stroke="#FFD166"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Left & Right Ears */}
          <polygon points="34,42 42,14 60,34" fill="#FFD166" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          <polygon points="41,36 45,22 54,32" fill="#FF6B6B" stroke="#073B4C" strokeWidth="2.4" strokeLinejoin="round" />
          <polygon points="106,42 98,14 80,34" fill="#FFD166" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          <polygon points="99,36 95,22 86,32" fill="#FF6B6B" stroke="#073B4C" strokeWidth="2.4" strokeLinejoin="round" />
          {/* Body */}
          <rect x="30" y="76" width="80" height="50" rx="22" fill="#FFD166" stroke="#073B4C" strokeWidth="3.8" />
          {/* Head */}
          <rect x="30" y="30" width="80" height="54" rx="24" fill="#FFD166" stroke="#073B4C" strokeWidth="3.8" />
          {/* Waving Left Paw */}
          <g className="brutal-paw-wave">
            <rect x="14" y="48" width="22" height="36" rx="11" fill="#FFD166" stroke="#073B4C" strokeWidth="3.8" />
            <circle cx="25" cy="59" r="5" fill="#FF6B6B" />
          </g>
          {/* Face Details */}
          <ellipse cx="70" cy="64" rx="22" ry="13" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.5" />
          <circle cx="52" cy="52" r="4.5" fill="#073B4C" />
          <circle cx="88" cy="52" r="4.5" fill="#073B4C" />
          <circle cx="44" cy="60" r="5" fill="#FF6B6B" opacity="0.85" />
          <circle cx="96" cy="60" r="5" fill="#FF6B6B" opacity="0.85" />
          <polygon points="66,58 74,58 70,63" fill="#FF6B6B" stroke="#073B4C" strokeWidth="2" strokeLinejoin="round" />
          <path d="M 63 67 Q 66.5 71 70 67 Q 73.5 71 77 67" fill="none" stroke="#073B4C" strokeWidth="2.5" strokeLinecap="round" />
          {/* Collar + Mint Bell */}
          <rect x="40" y="79" width="60" height="10" rx="5" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3" />
          <circle cx="70" cy="89" r="7.5" fill="#06D6A0" stroke="#073B4C" strokeWidth="3" />
          {/* Coin Badge */}
          <rect x="76" y="96" width="28" height="24" rx="7" fill="#38BDF8" stroke="#073B4C" strokeWidth="3" />
          <text x="90" y="112" textAnchor="middle" fontSize="12" fontWeight="900" fill="#073B4C">
            Rp
          </text>
        </svg>
      </div>

      {/* LEFT 2: Lagoon Tropical Toucan */}
      <div className="brutal-animal brutal-animal--left-2">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Tropical Leaf Perch */}
          <rect x="14" y="108" width="108" height="14" rx="7" fill="#BEF264" stroke="#073B4C" strokeWidth="3.5" />
          {/* Tail Feather */}
          <polygon points="22,88 8,108 34,104" fill="#073B4C" />
          {/* Body */}
          <path
            d="M 30 96 C 24 58 40 30 68 32 C 88 34 94 56 88 106 L 34 106 Z"
            fill="#38BDF8"
            stroke="#073B4C"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* White Throat Bib */}
          <path
            d="M 54 44 C 74 44 82 58 78 82 L 50 82 C 44 68 44 44 54 44 Z"
            fill="#FFFFFF"
            stroke="#073B4C"
            strokeWidth="3"
          />
          {/* Oversized Geometric Toucan Beak */}
          <path
            d="M 74 36 L 122 44 C 130 46 130 62 120 66 L 74 64 Z"
            fill="#FFD166"
            stroke="#073B4C"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          <path
            d="M 106 41 L 122 44 C 130 46 130 62 120 66 L 106 65 Z"
            fill="#FF6B6B"
            stroke="#073B4C"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          {/* Mint Wing */}
          <rect x="28" y="66" width="32" height="28" rx="14" transform="rotate(-14 44 80)" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.5" />
          {/* Eye */}
          <circle cx="64" cy="48" r="8" fill="#FFD166" stroke="#073B4C" strokeWidth="2.8" />
          <circle cx="66" cy="48" r="4" fill="#073B4C" />
          {/* Feet */}
          <rect x="48" y="102" width="12" height="10" rx="4" fill="#FFD166" stroke="#073B4C" strokeWidth="3" />
          <rect x="68" y="102" width="12" height="10" rx="4" fill="#FFD166" stroke="#073B4C" strokeWidth="3" />
        </svg>
      </div>

      {/* LEFT 3: Mint Piggy-Bank Coin Turtle */}
      <div className="brutal-animal brutal-animal--left-3">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Legs */}
          <rect x="26" y="96" width="18" height="20" rx="8" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.5" />
          <rect x="78" y="96" width="18" height="20" rx="8" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.5" />
          {/* Floating Gold Coin */}
          <circle cx="62" cy="30" r="14" fill="#FFD166" stroke="#073B4C" strokeWidth="3.5" />
          <text x="62" y="34" textAnchor="middle" fontSize="11" fontWeight="900" fill="#073B4C">
            ★
          </text>
          {/* Head */}
          <circle cx="108" cy="78" r="20" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.8" />
          <circle cx="114" cy="73" r="4.2" fill="#073B4C" />
          <circle cx="118" cy="82" r="4" fill="#FF6B6B" />
          <path d="M 104 86 Q 112 91 120 86" fill="none" stroke="#073B4C" strokeWidth="2.5" strokeLinecap="round" />
          {/* Dome Shell */}
          <path
            d="M 18 96 C 18 54 102 54 102 96 Z"
            fill="#FFD166"
            stroke="#073B4C"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* Geometric Shell Patches */}
          <polygon points="44,68 62,58 80,68 74,88 50,88" fill="#38BDF8" stroke="#073B4C" strokeWidth="3" strokeLinejoin="round" />
          {/* Coral Shell Rim */}
          <rect x="14" y="90" width="92" height="14" rx="7" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3.5" />
          {/* Coin Slot */}
          <rect x="52" y="61" width="20" height="5" rx="2.5" fill="#073B4C" />
        </svg>
      </div>

      {/* RIGHT 1: Orchid Wise Owl */}
      <div className="brutal-animal brutal-animal--right-1">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Ear Tufts */}
          <polygon points="34,42 26,18 52,32" fill="#C4B5FD" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          <polygon points="106,42 114,18 88,32" fill="#C4B5FD" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          {/* Wings */}
          <ellipse cx="26" cy="82" rx="12" ry="22" fill="#38BDF8" stroke="#073B4C" strokeWidth="3.5" />
          <ellipse cx="114" cy="82" rx="12" ry="22" fill="#38BDF8" stroke="#073B4C" strokeWidth="3.5" />
          {/* Body */}
          <rect x="28" y="28" width="84" height="90" rx="34" fill="#C4B5FD" stroke="#073B4C" strokeWidth="3.8" />
          {/* Mint Belly */}
          <rect x="44" y="76" width="52" height="36" rx="18" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.2" />
          <path d="M 55 89 L 62 95 L 70 89 L 78 95 L 85 89" fill="none" stroke="#073B4C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Big Glasses Eyes */}
          <circle cx="52" cy="54" r="16" fill="#FFFFFF" stroke="#073B4C" strokeWidth="3.5" />
          <circle cx="88" cy="54" r="16" fill="#FFFFFF" stroke="#073B4C" strokeWidth="3.5" />
          <g className="brutal-eye-blink">
            <circle cx="54" cy="54" r="7" fill="#073B4C" />
            <circle cx="86" cy="54" r="7" fill="#073B4C" />
            <circle cx="56" cy="51" r="2.2" fill="#FFFFFF" />
            <circle cx="88" cy="51" r="2.2" fill="#FFFFFF" />
          </g>
          {/* Mango Diamond Beak */}
          <polygon points="70,58 78,66 70,74 62,66" fill="#FFD166" stroke="#073B4C" strokeWidth="3" strokeLinejoin="round" />
          {/* Coral Feet */}
          <rect x="44" y="112" width="18" height="10" rx="5" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3" />
          <rect x="78" y="112" width="18" height="10" rx="5" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3" />
        </svg>
      </div>

      {/* RIGHT 2: Papaya Geometric Fox */}
      <div className="brutal-animal brutal-animal--right-2">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Fluffy Tail */}
          <path
            d="M 86 112 C 118 112 132 82 116 58 C 102 68 92 84 82 96 Z"
            fill="#FDBA74"
            stroke="#073B4C"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          <polygon points="116,58 106,70 120,76" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.8" strokeLinejoin="round" />
          {/* Torso */}
          <rect x="38" y="76" width="56" height="46" rx="18" fill="#FDBA74" stroke="#073B4C" strokeWidth="3.8" />
          {/* Coral Scarf */}
          <rect x="34" y="74" width="64" height="14" rx="7" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3.5" />
          <rect x="44" y="84" width="14" height="20" rx="6" fill="#FF6B6B" stroke="#073B4C" strokeWidth="3" />
          {/* Ears */}
          <polygon points="32,46 36,14 60,34" fill="#FDBA74" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          <polygon points="98,46 94,14 70,34" fill="#FDBA74" stroke="#073B4C" strokeWidth="3.8" strokeLinejoin="round" />
          <polygon points="38,39 40,24 51,33" fill="#073B4C" />
          <polygon points="92,39 90,24 79,33" fill="#073B4C" />
          {/* Faceted Fox Head */}
          <polygon
            points="28,44 65,30 102,44 92,76 65,86 38,76"
            fill="#FDBA74"
            stroke="#073B4C"
            strokeWidth="3.8"
            strokeLinejoin="round"
          />
          {/* White Cheeks */}
          <polygon points="28,48 52,66 65,84 38,76" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.8" strokeLinejoin="round" />
          <polygon points="102,48 78,66 65,84 92,76" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.8" strokeLinejoin="round" />
          {/* Eyes & Nose */}
          <circle cx="51" cy="54" r="4.2" fill="#073B4C" />
          <circle cx="79" cy="54" r="4.2" fill="#073B4C" />
          <polygon points="59,74 71,74 65,82" fill="#073B4C" />
        </svg>
      </div>

      {/* RIGHT 3: Lime Crowned Chill Frog */}
      <div className="brutal-animal brutal-animal--right-3">
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          {/* Mango Crown */}
          <polygon
            points="54,32 60,16 70,26 80,16 86,32"
            fill="#FFD166"
            stroke="#073B4C"
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          {/* Frog Head & Body */}
          <rect x="26" y="44" width="88" height="72" rx="34" fill="#BEF264" stroke="#073B4C" strokeWidth="3.8" />
          {/* Mint Belly */}
          <ellipse cx="70" cy="96" rx="28" ry="18" fill="#06D6A0" stroke="#073B4C" strokeWidth="3.2" />
          {/* Tall Pop Eyes */}
          <circle cx="46" cy="42" r="14" fill="#BEF264" stroke="#073B4C" strokeWidth="3.8" />
          <circle cx="94" cy="42" r="14" fill="#BEF264" stroke="#073B4C" strokeWidth="3.8" />
          <circle cx="46" cy="42" r="8.5" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.5" />
          <circle cx="94" cy="42" r="8.5" fill="#FFFFFF" stroke="#073B4C" strokeWidth="2.5" />
          <circle cx="46" cy="42" r="4" fill="#073B4C" />
          <circle cx="94" cy="42" r="4" fill="#073B4C" />
          {/* Coral Cheeks & Happy Smile */}
          <circle cx="39" cy="64" r="6" fill="#FF6B6B" />
          <circle cx="101" cy="64" r="6" fill="#FF6B6B" />
          <path d="M 52 66 Q 70 77 88 66" fill="none" stroke="#073B4C" strokeWidth="3.4" strokeLinecap="round" />
          {/* Side Paws */}
          <rect x="22" y="102" width="20" height="14" rx="7" fill="#BEF264" stroke="#073B4C" strokeWidth="3.5" />
          <rect x="98" y="102" width="20" height="14" rx="7" fill="#BEF264" stroke="#073B4C" strokeWidth="3.5" />
        </svg>
      </div>
    </div>
  );
};
