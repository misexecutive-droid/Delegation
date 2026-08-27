// Shared decorative overlay for navy "chrome" surfaces (the admin header, both sidebar renders,
// and any other card using the same gradient chrome elsewhere in the app) — concentric ring
// circles, one soft blurred glow, and a couple of thin skewed hairlines, echoing OrbitDecoration's
// circle-and-line language without repeating its exact orbit-and-dot pattern.
// `scale="wide"` sizes the rings for the short, wide header; `scale="tall"` sizes them down for
// the narrower, taller sidebar rail; `scale="compact"` is smaller still, for a small stat-card-
// sized surface where even the "tall" rings would overwhelm the available space.
interface AdminChromeAccentsProps {
  scale?: 'wide' | 'tall' | 'compact';
}

const RING_1: Record<Required<AdminChromeAccentsProps>['scale'], string> = {
  wide: '-top-20 -right-14 size-56',
  tall: '-top-10 -right-10 size-36',
  compact: '-top-8 -right-8 size-24',
};
const RING_2: Record<Required<AdminChromeAccentsProps>['scale'], string> = {
  wide: '-top-10 -right-28 size-40',
  tall: '-top-2 -right-20 size-24',
  compact: '-top-1 -right-14 size-16',
};
const GLOW: Record<Required<AdminChromeAccentsProps>['scale'], string> = {
  wide: 'top-1/2 right-32 -translate-y-1/2 size-24',
  tall: 'top-1/3 -right-4 size-20',
  compact: 'top-1/3 -right-2 size-12',
};
const CORNER: Record<Required<AdminChromeAccentsProps>['scale'], string> = {
  wide: '-bottom-16 -left-8 size-32',
  tall: '-bottom-10 -left-8 size-24',
  compact: '-bottom-6 -left-4 size-14',
};

export const AdminChromeAccents = ({ scale = 'wide' }: AdminChromeAccentsProps) => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    <span className={`absolute rounded-full border border-white/10 ${RING_1[scale]}`} />
    <span className={`absolute rounded-full border border-white/10 ${RING_2[scale]}`} />
    <span className={`absolute rounded-full bg-coral-400/10 blur-2xl ${GLOW[scale]}`} />
    <span className={`absolute rounded-full border border-white/10 ${CORNER[scale]}`} />
    <span className="absolute top-0 left-[42%] w-px h-full bg-white/10 -skew-x-12" />
    <span className="absolute top-0 left-[58%] w-px h-full bg-white/10 -skew-x-12" />
  </div>
);
