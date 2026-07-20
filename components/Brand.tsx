import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 no-underline" aria-label="Placard home">
      <span className="relative grid size-11 place-items-center text-4xl leading-none text-[#ffc400]" aria-hidden="true">
        △<span className="absolute bottom-1.5 right-0 text-base font-black text-[#ffc400]">⌕</span>
      </span>
      <span>
        <span className="font-display block text-2xl font-black tracking-[0.04em] text-white">PLACARD</span>
        {!compact && <span className="font-data block text-[10px] uppercase tracking-[0.1em] text-[#b8af9a]">Chemical supply scam registry</span>}
      </span>
    </Link>
  );
}

