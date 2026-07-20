import Link from "next/link";

// No source-repository link: it would tie this site to a named personal account
// and defeat the operator anonymity the whole design is built around.
const links = [
  { href: "/about", label: "About & Terms" },
  { href: "/policy", label: "Privacy & Policies" },
  { href: "/contact", label: "Contact & Removals" },
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
            Reports here are unverified allegations submitted by the public, not legal findings. Use your own judgment.
          </p>
          <div className="font-display flex flex-wrap gap-x-6 gap-y-2 md:justify-end md:self-start">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-[#e8590c]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
