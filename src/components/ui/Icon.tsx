/* ==========================================================================
   Icons — authored, not imported.

   No icon library by choice. Every glyph below is drawn on the same grid:
   24×24, 1.5 stroke, round caps and joins, currentColor. Consistency is the
   whole point — one stroke weight across the product is what separates a
   drawn icon set from a pile of SVGs. Extend this set rather than importing.
   ========================================================================== */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  /** Pixel size for both dimensions. Defaults to 20. */
  size?: number;
};

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="M5.5 11.5 12 5l6.5 6.5" />
    </Svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="2.75" width="6" height="11" rx="3" />
      <path d="M5.5 11v.5a6.5 6.5 0 0 0 13 0V11" />
      <path d="M12 18v3.25" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 7" />
    </Svg>
  );
}

/** Guardrails. Shown wherever a spending limit is in force. */
export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.75 4.75 5.75v5.5c0 4.4 3 8.2 7.25 9.5 4.25-1.3 7.25-5.1 7.25-9.5v-5.5L12 2.75Z" />
    </Svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 2.75 20h18.5L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.05" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

/** Speaker. Two arcs for sound, drawn on the same grid as everything else. */
export function SpeakerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.8 7a7 7 0 0 1 0 10" />
    </Svg>
  );
}

/** Muted. The speaker with the sound struck through. */
export function MuteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6.5 8.5H3.5v7h3L11 19V5Z" />
      <path d="m16 9.5 5 5" />
      <path d="m21 9.5-5 5" />
    </Svg>
  );
}

/** Stop. A square, because that is what stop has always been. */
export function StopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </Svg>
  );
}

/** Retry. The arrow head sits on the arc so it reads at 16px. */
export function RetryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 11.5a8 8 0 1 1-2.4-5.7" />
      <path d="M20.5 4v4.5H16" />
    </Svg>
  );
}

/** Leaving the app — the Razorpay payment page opens in a new tab. */
export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 4H20v6.5" />
      <path d="m19.5 4.5-8 8" />
      <path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
    </Svg>
  );
}

/**
 * Spinner. The arc is drawn, not a border trick, so it inherits stroke weight
 * from the set. Rotation lives in CSS so reduced-motion can stop it.
 */
export function SpinnerIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <circle cx="12" cy="12" r="8.5" opacity={0.25} />
      <path d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5" />
    </svg>
  );
}
