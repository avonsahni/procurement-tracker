import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.procuretrack.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "ProcureTrack — Project Lifecycle on One Dashboard",
    template: "%s | ProcureTrack",
  },
  description:
    "Procurement and execution tracking for engineering and infrastructure teams. RFQ to handover, vendors, milestones, and budgets — on one live dashboard.",
  keywords: [
    "procurement tracking software",
    "construction procurement management India",
    "infrastructure project tracking",
    "procurement lifecycle management",
    "RFQ management software",
    "project execution tracking",
    "vendor management software India",
    "milestone tracking software",
    "procurement dashboard SaaS",
    "engineering project management tool",
    "DPDP compliant software",
    "procurement software India",
    "project budget tracking",
    "invoice tracking construction",
  ],
  authors: [{ name: "ProcureTrack", url: siteUrl }],
  creator: "ProcureTrack",
  publisher: "ProcureTrack",
  category: "business software",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "ProcureTrack",
    title: "ProcureTrack — Project Lifecycle on One Dashboard",
    description:
      "From RFQ to handover — every package, every rupee, on one live dashboard. Purpose-built for engineering and infrastructure teams.",
  },

  twitter: {
    card: "summary_large_image",
    title: "ProcureTrack — Project Lifecycle on One Dashboard",
    description:
      "From RFQ to handover — every package, every rupee, on one live dashboard.",
    creator: "@procuretrack",
    site: "@procuretrack",
  },

  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: "/apple-touch-icon.png",
  },

  manifest: "/manifest.webmanifest",

  alternates: {
    canonical: "/",
  },

  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  }),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "ProcureTrack",
      url: siteUrl,
      description:
        "Multi-tenant SaaS procurement and execution tracking platform for engineering and infrastructure project teams. Covers the full lifecycle from RFQ to site handover.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          name: "Small Teams",
          priceCurrency: "INR",
          price: "0",
          description: "14-day free trial, no card required",
        },
      ],
      featureList: [
        "Procurement lifecycle management (RFQ to Award)",
        "Execution milestone and subtask tracking",
        "Vendor matrix and bid comparison",
        "Budget, committed, and billed financial tracking",
        "Multi-tenant with role-based access control",
        "DPDP-ready data handling",
        "Full audit trail",
        "Data export",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ProcureTrack",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ProcureTrack",
      description:
        "Procurement and execution tracking for engineering and infrastructure projects.",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
