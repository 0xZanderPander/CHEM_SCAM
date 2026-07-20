import type { Metadata } from "next";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "PLACARD — Community Chemical Scam Reports", template: "%s · PLACARD" },
  description: "An anonymous community registry for sharing and confirming reports about suspicious chemical suppliers and online scammers.",
  openGraph: {
    title: "PLACARD — Community Chemical Scam Reports",
    description: "Community-submitted reports about suspicious chemical suppliers and online scammers.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
