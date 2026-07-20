import Link from "next/link";

const links = [
  { href: "/about", label: "About & Terms" },
  { href: "/policy", label: "Privacy & Policies" },
  { href: "/contact", label: "Contact & Removals" },
  { href: "https://github.com/0xZanderPander/CHEM_SCAM", label: "Source", external: true },
  { href: "/admin", label: "Admin" },
];

export function SiteFooter() {
  return (
    <>
      <div className="hazard-stripe mt-10" />
      <footer className="border-t-2 border-[#171412] bg-white">
        <div className="page-shell grid gap-6 py-8 text-[13px] leading-6 text-[#45403b] md:grid-cols-2">
          <p className="max-w-md">
            <b className="font-display mb-1 block text-sm text-[#171412]">Legal notice</b>
            This website contains community-submitted reports and allegations. Reports have not necessarily been
            independently verified and should not be interpreted as legal findings. Exercise your own judgment before
            making decisions based on information posted here.
          </p>
          <div className="font-display flex flex-wrap gap-x-6 gap-y-2 md:justify-end md:self-start">
            {links.map((item) =>
              item.external ? (
                <a key={item.href} href={item.href} rel="noreferrer noopener" className="transition-colors hover:text-[#e8590c]">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-[#e8590c]">
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
