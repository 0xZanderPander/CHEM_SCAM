import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

// Only the stable public pages are listed. Report pages are deliberately left
// out: they change publication state through moderation, and a stale sitemap
// entry would keep pointing crawlers at content that has been removed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/policy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
