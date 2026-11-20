import React from 'react';

/**
 * Ilustración institucional (SVG propio): tarjeta con curvas de crecimiento tipo OMS,
 * indicador de cobertura de vacunación y sello de protección. Sin imágenes externas.
 */
export default function Ilustracion({ alto = 220 }) {
  return (
    <svg viewBox="0 0 480 300" height={alto} role="img" aria-label="Curvas de crecimiento y cobertura de vacunación" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'inherit' }}>
      <defs>
        <linearGradient id="il-tarjeta" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef6f2" />
        </linearGradient>
        <linearGradient id="il-banda" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b6e4f" stopOpacity="0.15" />
          <stop offset="1" stopColor="#0b6e4f" stopOpacity="0.02" />
        </linearGradient>
        <filter id="il-sombra" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#032d20" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* línea de latido de fondo */}
      <path d="M0 262 H120 l14 -28 l20 54 l18 -42 l12 16 H480" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* tarjeta principal: curvas de crecimiento */}
      <g filter="url(#il-sombra)">
        <rect x="24" y="22" width="316" height="214" rx="16" fill="url(#il-tarjeta)" />
      </g>
      <text x="44" y="52" fontSize="13" fontWeight="700" fill="#08543c">Curva de crecimiento · peso para la edad</text>
      <text x="44" y="68" fontSize="10" fill="#6b7f77">Referencia OMS · percentiles 5, 50 y 95</text>

      {/* cuadrícula */}
      <g stroke="#d6e4dd" strokeWidth="1">
        <line x1="48" y1="90" x2="320" y2="90" />
        <line x1="48" y1="126" x2="320" y2="126" />
        <line x1="48" y1="162" x2="320" y2="162" />
        <line x1="48" y1="198" x2="320" y2="198" />
      </g>
      <line x1="48" y1="86" x2="48" y2="204" stroke="#9db5aa" strokeWidth="1.5" />
      <line x1="48" y1="204" x2="322" y2="204" stroke="#9db5aa" strokeWidth="1.5" />
      <g fontSize="9" fill="#6b7f77" textAnchor="middle">
        <text x="48" y="218">0</text><text x="116" y="218">12</text><text x="184" y="218">24</text><text x="250" y="218">36</text><text x="300" y="218">48</text>
      </g>

      {/* banda P5-P95 */}
      <path d="M48 192 C110 168 170 140 230 122 S300 100 320 96 L320 132 C300 140 250 156 200 170 S100 200 48 204 Z" fill="url(#il-banda)" />
      {/* P95 / P50 / P5 */}
      <path d="M48 186 C110 150 170 118 230 104 S300 88 320 84" fill="none" stroke="#e67e22" strokeWidth="1.8" strokeDasharray="5 4" />
      <path d="M48 195 C110 166 170 138 230 124 S300 108 320 102" fill="none" stroke="#8aa095" strokeWidth="1.8" strokeDasharray="5 4" />
      <path d="M48 202 C110 186 170 164 230 150 S300 134 320 128" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeDasharray="5 4" />
      {/* niño */}
      <path d="M48 197 C80 176 108 164 140 150 S196 128 238 120 S290 108 312 100" fill="none" stroke="#0b6e4f" strokeWidth="3.2" strokeLinecap="round" />
      <g fill="#ffffff" stroke="#0b6e4f" strokeWidth="2.5">
        <circle cx="48" cy="197" r="4" /><circle cx="116" cy="162" r="4" /><circle cx="184" cy="136" r="4" /><circle cx="248" cy="118" r="4" />
      </g>
      <circle cx="312" cy="100" r="6" fill="#0b6e4f" />
      <circle cx="312" cy="100" r="11" fill="#0b6e4f" opacity="0.18" />

      {/* tarjeta de vacunación */}
      <g filter="url(#il-sombra)">
        <rect x="292" y="116" width="178" height="132" rx="16" fill="#ffffff" />
      </g>
      <text x="310" y="142" fontSize="12" fontWeight="700" fill="#08543c">Vacunación</text>
      <circle cx="338" cy="190" r="26" fill="none" stroke="#e2eee8" strokeWidth="9" />
      <circle cx="338" cy="190" r="26" fill="none" stroke="#0b6e4f" strokeWidth="9" strokeLinecap="round" strokeDasharray="150 164" transform="rotate(-90 338 190)" />
      <text x="338" y="195" fontSize="14" fontWeight="800" fill="#0b6e4f" textAnchor="middle">92%</text>
      <g fontSize="10" fill="#4d6258">
        <circle cx="384" cy="168" r="4" fill="#0b6e4f" /><text x="394" y="172">Aplicadas</text>
        <circle cx="384" cy="190" r="4" fill="#e67e22" /><text x="394" y="194">Pendientes</text>
        <circle cx="384" cy="212" r="4" fill="#c0392b" /><text x="394" y="216">Atrasadas</text>
      </g>

      {/* sello de protección */}
      <g transform="translate(396 14)" filter="url(#il-sombra)">
        <circle cx="30" cy="30" r="30" fill="#ffd98a" />
        <path d="M30 12 L46 18 V32 C46 42 38 49 30 53 C22 49 14 42 14 32 V18 Z" fill="#0b6e4f" />
        <path d="M22 31 L28 37 L39 25" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
