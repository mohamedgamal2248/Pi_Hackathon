// Sanad mark: a heart with a check (verified giving). Drawn as paths so it is crisp at any size.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <path d="M256 418C120 326 92 232 146 178c44-44 100-28 110 14 10-42 66-58 110-14 54 54 26 148-110 240z" fill="#c6f432" />
      <path d="M196 262l44 44 84-92" fill="none" stroke="#0d1b1e" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
