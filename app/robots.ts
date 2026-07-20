import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The moderation console and the write APIs are never useful to a
        // crawler and indexing them only invites automated probing.
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
