import type { CSSProperties } from 'react';
import type { MatrixClient } from 'matrix-js-sdk';
import { mxcUrlToHttp } from './matrix';

export const NAMEPLATE_EVENT_TYPE = 'org.lunamix.nameplate' as const;
export const NAMEPLATE_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const NAMEPLATE_ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type NameplateMode = 'none' | 'solid' | 'gradient' | 'image';
export type NameplateFinish = 'clean' | 'split' | 'gloss' | 'carbon' | 'horizon' | 'stripe';

export type NameplateConfig = {
  version: 1;
  mode: NameplateMode;
  presetId?: string;
  colorA?: string;
  colorB?: string;
  finish?: NameplateFinish;
  textColor?: string;
  imageMxc?: string;
  imageOverlay?: boolean;
  updatedAt: number;
};

export type NameplatePreset = {
  id: string;
  name: string;
  config: Omit<NameplateConfig, 'updatedAt'>;
};

export const NAMEPLATE_FINISHES: { id: NameplateFinish; label: string }[] = [
  { id: 'clean', label: 'Clean' },
  { id: 'split', label: 'Split' },
  { id: 'gloss', label: 'Gloss' },
  { id: 'carbon', label: 'Carbon' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'stripe', label: 'Stripe' },
];

export const FREE_NAMEPLATE_PRESETS: NameplatePreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    config: { version: 1, mode: 'none', presetId: 'classic', finish: 'clean' },
  },
  {
    id: 'ocean-cyan',
    name: 'Ocean Cyan',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'ocean-cyan',
      colorA: '#0284c7',
      colorB: '#06b6d4',
      finish: 'gloss',
    },
  },
  {
    id: 'neon-mint',
    name: 'Neon Mint',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'neon-mint',
      colorA: '#059669',
      colorB: '#34d399',
      finish: 'clean',
    },
  },
  {
    id: 'crimson-pulse',
    name: 'Crimson Pulse',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'crimson-pulse',
      colorA: '#be123c',
      colorB: '#f43f5e',
      finish: 'horizon',
    },
  },
  {
    id: 'solar-gold',
    name: 'Solar Gold',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'solar-gold',
      colorA: '#f59e0b',
      colorB: '#fde047',
      finish: 'gloss',
    },
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'royal-violet',
      colorA: '#6d28d9',
      colorB: '#a855f7',
      finish: 'split',
    },
  },
  {
    id: 'midnight-carbon',
    name: 'Midnight Carbon',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'midnight-carbon',
      colorA: '#111827',
      colorB: '#334155',
      finish: 'carbon',
    },
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'sunset-blaze',
      colorA: '#ea580c',
      colorB: '#ec4899',
      finish: 'horizon',
    },
  },
  {
    id: 'sakura-rose',
    name: 'Sakura Rose',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'sakura-rose',
      colorA: '#db2777',
      colorB: '#f9a8d4',
      finish: 'clean',
    },
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'arctic-frost',
      colorA: '#bae6fd',
      colorB: '#e0f2fe',
      finish: 'gloss',
    },
  },
  {
    id: 'emerald-speed',
    name: 'Emerald Speed',
    config: {
      version: 1,
      mode: 'gradient',
      presetId: 'emerald-speed',
      colorA: '#047857',
      colorB: '#10b981',
      finish: 'stripe',
    },
  },
];

const DEFAULT_COLOR_A = '#2563eb';
const DEFAULT_COLOR_B = '#7c3aed';
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const MXC_URI_RE = /^mxc:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/[a-zA-Z0-9._-]+$/;
const VALID_MODES: ReadonlySet<string> = new Set(['none', 'solid', 'gradient', 'image']);
const VALID_FINISHES: ReadonlySet<string> = new Set([
  'clean',
  'split',
  'gloss',
  'carbon',
  'horizon',
  'stripe',
]);

export const DEFAULT_NAMEPLATE: NameplateConfig = {
  version: 1,
  mode: 'none',
  presetId: 'classic',
  finish: 'clean',
  updatedAt: 0,
};

export function isValidHexColor(val: unknown): val is string {
  return typeof val === 'string' && HEX_COLOR_RE.test(val);
}

export function isValidMxcUri(val: unknown): val is string {
  return (
    typeof val === 'string' && val.length <= 512 && MXC_URI_RE.test(val) && !val.includes('..')
  );
}

function normalizePresetId(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!/^[a-z0-9-]{1,40}$/i.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Safely parse and validate a potentially untrusted nameplate payload from
 * Matrix account data or another user's `m.room.member` state content.
 */
export function parseNameplate(raw: unknown): NameplateConfig | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const mode =
    typeof record.mode === 'string' && VALID_MODES.has(record.mode)
      ? (record.mode as NameplateMode)
      : undefined;
  if (!mode) return undefined;

  const finish =
    typeof record.finish === 'string' && VALID_FINISHES.has(record.finish)
      ? (record.finish as NameplateFinish)
      : 'clean';

  const colorA = isValidHexColor(record.colorA) ? record.colorA.toLowerCase() : undefined;
  const colorB = isValidHexColor(record.colorB) ? record.colorB.toLowerCase() : undefined;
  const textColor = isValidHexColor(record.textColor) ? record.textColor.toLowerCase() : undefined;
  const imageMxc = isValidMxcUri(record.imageMxc) ? record.imageMxc : undefined;
  const presetId = normalizePresetId(record.presetId);
  const imageOverlay = typeof record.imageOverlay === 'boolean' ? record.imageOverlay : true;
  const updatedAt =
    typeof record.updatedAt === 'number' &&
    Number.isFinite(record.updatedAt) &&
    record.updatedAt >= 0
      ? Math.floor(record.updatedAt)
      : 0;

  if (mode === 'image' && !imageMxc) {
    return {
      version: 1,
      mode: 'none',
      finish: 'clean',
      updatedAt,
    };
  }

  return {
    version: 1,
    mode,
    ...(presetId ? { presetId } : {}),
    ...(mode === 'solid' || mode === 'gradient' ? { colorA: colorA ?? DEFAULT_COLOR_A } : {}),
    ...(mode === 'gradient' ? { colorB: colorB ?? DEFAULT_COLOR_B } : {}),
    finish,
    ...(textColor ? { textColor } : {}),
    ...(mode === 'image' && imageMxc ? { imageMxc, imageOverlay } : {}),
    updatedAt,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function getRelativeLuminance(hex: string): number {
  if (!isValidHexColor(hex)) return 0.15;
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * Pick high-contrast foreground text color (`#ffffff` or `#0f172a`) for a solid
 * or gradient background pair.
 */
export function getContrastTextColor(hexA?: string, hexB?: string): '#ffffff' | '#0f172a' {
  const validA = isValidHexColor(hexA) ? hexA : DEFAULT_COLOR_A;
  const validB = isValidHexColor(hexB) ? hexB : validA;
  const avgLum = (getRelativeLuminance(validA) + getRelativeLuminance(validB)) / 2;
  return avgLum > 0.36 ? '#0f172a' : '#ffffff';
}

export function isNameplateActive(config?: NameplateConfig): config is NameplateConfig {
  return Boolean(config && config.mode !== 'none');
}

export function areNameplatesEqual(a?: NameplateConfig, b?: NameplateConfig): boolean {
  if (!isNameplateActive(a) && !isNameplateActive(b)) return true;
  if (!a || !b) return false;
  return (
    a.mode === b.mode &&
    a.presetId === b.presetId &&
    a.colorA === b.colorA &&
    a.colorB === b.colorB &&
    (a.finish ?? 'clean') === (b.finish ?? 'clean') &&
    a.textColor === b.textColor &&
    a.imageMxc === b.imageMxc &&
    (a.imageOverlay ?? true) === (b.imageOverlay ?? true)
  );
}

export function resolveNameplateImageUrl(
  mx: MatrixClient,
  config: NameplateConfig | undefined,
  useAuthentication: boolean,
  width = 480,
  height = 120
): string | undefined {
  if (!config || config.mode !== 'image' || !isValidMxcUri(config.imageMxc)) return undefined;
  const resolved = mxcUrlToHttp(mx, config.imageMxc, useAuthentication, width, height, 'crop');
  if (!resolved) return undefined;
  if (!resolved.startsWith('https://') && !resolved.startsWith('http://')) return undefined;
  if (/["'()\\<>]/.test(resolved)) return undefined;
  return resolved;
}

/**
 * Build safe inline CSS custom properties and background declarations for a
 * nameplate pill or banner.
 */
export function getNameplateInlineStyle(
  config: NameplateConfig | undefined,
  resolvedImageUrl?: string
): CSSProperties | undefined {
  if (!isNameplateActive(config)) return undefined;

  if (config.mode === 'image') {
    const fg = config.textColor && isValidHexColor(config.textColor) ? config.textColor : '#ffffff';
    const scrim =
      config.imageOverlay !== false
        ? 'linear-gradient(90deg, rgb(8 10 18 / 0.64), rgb(8 10 18 / 0.36)), '
        : '';
    return {
      color: fg,
      backgroundColor: '#1e293b',
      backgroundImage: resolvedImageUrl ? `${scrim}url("${resolvedImageUrl}")` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      textShadow:
        fg === '#ffffff' ? '0 1px 2px rgb(0 0 0 / 0.72)' : '0 1px 1px rgb(255 255 255 / 0.45)',
    };
  }

  const cA = isValidHexColor(config.colorA) ? config.colorA : DEFAULT_COLOR_A;
  const cB = config.mode === 'gradient' && isValidHexColor(config.colorB) ? config.colorB : cA;
  const fg =
    config.textColor && isValidHexColor(config.textColor)
      ? config.textColor
      : getContrastTextColor(cA, cB);

  const finish = config.finish ?? 'clean';
  let baseGradient =
    config.mode === 'gradient'
      ? `linear-gradient(125deg, ${cA}, ${cB})`
      : `linear-gradient(125deg, ${cA}, ${cA})`;

  if (finish === 'split') {
    baseGradient = `linear-gradient(110deg, ${cA} 0%, ${cA} 52%, ${cB} 52.5%, ${cB} 100%)`;
  } else if (finish === 'horizon') {
    baseGradient = `linear-gradient(180deg, ${cA} 0%, ${cB} 100%)`;
  } else if (finish === 'gloss') {
    baseGradient = `linear-gradient(180deg, rgb(255 255 255 / 0.24) 0%, rgb(255 255 255 / 0.04) 48%, rgb(0 0 0 / 0.14) 100%), ${baseGradient}`;
  } else if (finish === 'carbon') {
    baseGradient = `repeating-linear-gradient(135deg, rgb(255 255 255 / 0.08) 0 4px, rgb(0 0 0 / 0.08) 4px 8px), ${baseGradient}`;
  } else if (finish === 'stripe') {
    baseGradient = `repeating-linear-gradient(-45deg, rgb(255 255 255 / 0.12) 0 8px, transparent 8px 16px), ${baseGradient}`;
  }

  return {
    color: fg,
    backgroundColor: cA,
    backgroundImage: baseGradient,
    textShadow: fg === '#ffffff' ? '0 1px 2px rgb(0 0 0 / 0.42)' : 'none',
  };
}

/**
 * Determine whether a `m.room.member` state event only modified the custom
 * `org.lunamix.nameplate` property while keeping membership, reason, displayname,
 * and avatar identical, so chat timelines do not emit noisy notices.
 */
export function isPureNameplateMemberChange(
  prevContent: Record<string, unknown> | undefined,
  content: Record<string, unknown> | undefined
): boolean {
  if (!prevContent || !content) return false;
  const sameCoreFields =
    prevContent.membership === content.membership &&
    prevContent.reason === content.reason &&
    prevContent.displayname === content.displayname &&
    prevContent.avatar_url === content.avatar_url;
  if (!sameCoreFields) return false;

  const prevPlate = parseNameplate(prevContent[NAMEPLATE_EVENT_TYPE]);
  const nextPlate = parseNameplate(content[NAMEPLATE_EVENT_TYPE]);
  const hadRawPlate = NAMEPLATE_EVENT_TYPE in prevContent;
  const hasRawPlate = NAMEPLATE_EVENT_TYPE in content;

  if (!hadRawPlate && !hasRawPlate) return false;
  return !areNameplatesEqual(prevPlate, nextPlate) || hadRawPlate !== hasRawPlate;
}
