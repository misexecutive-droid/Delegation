// Shared decorative overlay for the admin "chrome" (header + both sidebar renders) — concentric
// ring circles, one soft blurred glow, and a couple of thin skewed hairlines, echoing
// OrbitDecoration's circle-and-line language without repeating its exact orbit-and-dot pattern.
// `scale="wide"` sizes the rings for the short, wide header; `scale="tall"` sizes them down for
// the narrower, taller sidebar rail so they read as accents rather than dominating the surface.
interface AdminChromeAccentsProps {
  scale?: 'wide' | 'tall';
}

export const AdminChromeAccents = ({ scale = 'wide' }: AdminChromeAccentsProps) => {
  const isWide = scale === 'wide';

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <span
        className={`absolute rounded-full border border-white/10 ${
          isWide ? '-top-20 -right-14 size-56' : '-top-10 -right-10 size-36'
        }`}
      />
      <span
        className={`absolute rounded-full border border-white/10 ${
          isWide ? '-top-10 -right-28 size-40' : '-top-2 -right-20 size-24'
        }`}
      />
      <span
        className={`absolute rounded-full bg-coral-400/10 blur-2xl ${
          isWide ? 'top-1/2 right-32 -translate-y-1/2 size-24' : 'top-1/3 -right-4 size-20'
        }`}
      />
      <span
        className={`absolute rounded-full border border-white/10 ${
          isWide ? '-bottom-16 -left-8 size-32' : '-bottom-10 -left-8 size-24'
        }`}
      />
      <span className="absolute top-0 left-[42%] w-px h-full bg-white/10 -skew-x-12" />
      <span className="absolute top-0 left-[58%] w-px h-full bg-white/10 -skew-x-12" />
    </div>
  );
};
