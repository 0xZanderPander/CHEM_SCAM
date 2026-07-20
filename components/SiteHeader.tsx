import Link from "next/link";
import { Brand } from "./Brand";

const navigation = [
  { href: "/", label: "Board" },
  { href: "/about", label: "About" },
  { href: "/policy", label: "Policy" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ action, compact = false }: { action?: React.ReactNode; compact?: boolean }) {
  return (
    <header className="bg-[#171412] text-white">
      <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-4">
        <Brand compact={compact} />
        <div className="flex flex-wrap items-center gap-5">
          <nav aria-label="Primary" className="font-display flex flex-wrap gap-5 text-[13px] tracking-[0.06em] text-[#e7e2d8]">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="no-underline transition-colors hover:text-[#ffc400]">
                {item.label}
              </Link>
            ))}
          </nav>
          {action}
        </div>
      </div>
      <div className="hazard-stripe" />
    </header>
  );
}
