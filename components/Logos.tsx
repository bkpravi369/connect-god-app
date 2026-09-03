import React, { useState } from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Path, G, RadialGradient, Stop, Defs } from 'react-native-svg';

// ── Brahma Kumari Red Sun emblem ──────────────────────────────────────
// A radiant red-to-orange sun with a glowing center point — the
// official Brahma Kumari symbol rendered as crisp SVG.
export function BKSunEmblem({ size = 44 }: { size?: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bksun-core" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#fff5e6" />
          <Stop offset="35%" stopColor="#fdba74" />
          <Stop offset="75%" stopColor="#ea580c" />
          <Stop offset="100%" stopColor="#9a3412" />
        </RadialGradient>
        <RadialGradient id="bksun-halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#fdba74" stopOpacity="0.8" />
          <Stop offset="60%" stopColor="#f97316" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Outer halo */}
      <Circle cx="50" cy="50" r="48" fill="url(#bksun-halo)" />

      {/* 12 sun rays */}
      <G>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 50 + 30 * Math.cos(angle);
          const y1 = 50 + 30 * Math.sin(angle);
          const x2 = 50 + 46 * Math.cos(angle);
          const y2 = 50 + 46 * Math.sin(angle);
          return (
            <Path
              key={i}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke="#ea580c"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.7"
            />
          );
        })}
      </G>

      {/* Sun disc */}
      <Circle cx="50" cy="50" r="28" fill="url(#bksun-core)" />
      <Circle cx="50" cy="50" r="28" fill="none" stroke="#c2410c" strokeWidth="1.5" opacity="0.4" />

      {/* Inner glow point — the soul / point of light */}
      <Circle cx="50" cy="50" r="7" fill="#fff5e6" opacity="0.9" />
      <Circle cx="50" cy="50" r="3" fill="#ffffff" />
    </Svg>
  );
}

// ── Channel logo: Supreme Light Creations ─────────────────────────────
// Golden sun with radiating light beams — "supreme light" theme
export function SupremeLightLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="sl-grad" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#fff3c7" />
          <Stop offset="50%" stopColor="#fbbf24" />
          <Stop offset="100%" stopColor="#d97706" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="#fef3c7" />
      <G>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const x1 = 50 + 26 * Math.cos(a);
          const y1 = 50 + 26 * Math.sin(a);
          const x2 = 50 + 45 * Math.cos(a);
          const y2 = 50 + 45 * Math.sin(a);
          return <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#d97706" strokeWidth="3" strokeLinecap="round" opacity="0.6" />;
        })}
      </G>
      <Circle cx="50" cy="50" r="24" fill="url(#sl-grad)" />
      <Circle cx="50" cy="50" r="24" fill="none" stroke="#b45309" strokeWidth="1.5" />
      <Circle cx="50" cy="50" r="5" fill="#ffffff" opacity="0.9" />
    </Svg>
  );
}

// ── Channel logo: BK Sheeba ───────────────────────────────────────────
// Deep orange-red lotus / flame motif
export function BKSheebaLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="sh-grad" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#ffedd5" />
          <Stop offset="60%" stopColor="#fb923c" />
          <Stop offset="100%" stopColor="#c2410c" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="#fff7ed" />
      {/* Lotus petals */}
      <G>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          const cx = 50 + 20 * Math.cos(a);
          const cy = 50 + 20 * Math.sin(a);
          const rotation = (i * 45);
          return (
            <Path
              key={i}
              d="M 0 0 C -8 -12, 8 -12, 0 0 Z"
              transform={`translate(${cx} ${cy}) rotate(${rotation})`}
              fill="url(#sh-grad)"
              opacity="0.75"
            />
          );
        })}
      </G>
      <Circle cx="50" cy="50" r="16" fill="url(#sh-grad)" />
      <Circle cx="50" cy="50" r="16" fill="none" stroke="#9a3412" strokeWidth="1" />
      <Circle cx="50" cy="50" r="4" fill="#ffffff" opacity="0.9" />
    </Svg>
  );
}

// ── Channel logo: BK Sheeja ───────────────────────────────────────────
// Warm saffron circle with a radiant star
export function BKSheejaLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="sj-grad" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#ffedd5" />
          <Stop offset="55%" stopColor="#f97316" />
          <Stop offset="100%" stopColor="#7c2d12" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="#ffedd5" />
      {/* 6-point star (two triangles) */}
      <G>
        <Path d="M 50 18 L 58 42 L 82 42 L 62 56 L 70 80 L 50 66 L 30 80 L 38 56 L 18 42 L 42 42 Z" fill="url(#sj-grad)" opacity="0.85" />
      </G>
      <Circle cx="50" cy="50" r="10" fill="#fff5e6" opacity="0.9" />
      <Circle cx="50" cy="50" r="4" fill="#ffffff" />
    </Svg>
  );
}

// ── Channel logo: BKS Calicut ─────────────────────────────────────────
// Red sun emblem variant with "BK" text feel — warm deep red
export function BKSCalicutLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bc-grad" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#fff5e6" />
          <Stop offset="45%" stopColor="#f97316" />
          <Stop offset="100%" stopColor="#7f1019" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="#fff7ed" />
      <G>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          const x1 = 50 + 28 * Math.cos(a);
          const y1 = 50 + 28 * Math.sin(a);
          const x2 = 50 + 44 * Math.cos(a);
          const y2 = 50 + 44 * Math.sin(a);
          return <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke="#a01526" strokeWidth="5" strokeLinecap="round" opacity="0.65" />;
        })}
      </G>
      <Circle cx="50" cy="50" r="26" fill="url(#bc-grad)" />
      <Circle cx="50" cy="50" r="26" fill="none" stroke="#5c0b12" strokeWidth="1.5" />
      <Circle cx="50" cy="50" r="6" fill="#ffffff" opacity="0.85" />
    </Svg>
  );
}

const CHANNEL_IMAGE_MAP: Record<string, string> = {
  'bks-calicut': '/images/channel-logos/bks_calicut_logo.jpg',
  'supreme-light': '/images/channel-logos/Supremelight_creation_logo_new.png',
  'bk-sheeba': '/images/channel-logos/BK_sheeba_logo.png',
  'bk-sheeja': '/images/channel-logos/BK_Sheeja_real.png',
};

// ── Dispatcher: get the right logo component by channel id ────────────
export function ChannelLogo({ id, size = 40 }: { id: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUri = CHANNEL_IMAGE_MAP[id];

  if (logoUri && !imgFailed) {
    return (
      <Image
        source={{ uri: logoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  switch (id) {
    case 'supreme-light': return <SupremeLightLogo size={size} />;
    case 'bk-sheeba': return <BKSheebaLogo size={size} />;
    case 'bk-sheeja': return <BKSheejaLogo size={size} />;
    case 'bks-calicut': return <BKSCalicutLogo size={size} />;
    default: return <BKSunEmblem size={size} />;
  }
}
