import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.procuretrack.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/projects/", "/register"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
