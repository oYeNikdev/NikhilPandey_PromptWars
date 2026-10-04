/** A lens with a wedge missing: the part of the view you can't see. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M16 16 L16 3 A13 13 0 1 0 29 16 Z" fill="currentColor" />
      <path d="M16 16 L16 3 A13 13 0 0 1 29 16 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
    </svg>
  );
}
