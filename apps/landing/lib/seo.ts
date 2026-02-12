import config from "@/config";
import { Metadata } from "next";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrlRelative?: string;
  keywords?: string[];
}

export function getSEOTags({
  title,
  description,
  canonicalUrlRelative,
  keywords = [],
}: SEOProps = {}): Metadata {
  const seoTitle = title || config.websiteName;
  const seoDescription = description || config.websiteDescription;
  const canonicalUrl = `${config.websiteUrl}${canonicalUrlRelative || ""}`;

  const metadata: Metadata = {
    title: seoTitle,
    description: seoDescription,
    keywords,
    metadataBase: new URL(config.websiteUrl),
    alternates: {
      canonical: canonicalUrlRelative,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: canonicalUrl,
      siteName: config.websiteName,
      locale: "en_GB",
      type: "website",
      images: [{ url: config.websiteUrl + "/banner.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: [{ url: config.websiteUrl + "/banner.png" }],
    },
  };

  return metadata;
}

export function generateSchemaObject() {
  const { websiteName, websiteUrl } = config;

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: websiteName,
      description: config.websiteDescription,
      url: websiteUrl,
      image: websiteUrl + "/banner.png",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TendHunt",
      url: websiteUrl,
      logo: websiteUrl + "/logo.png",
      description: config.websiteDescription,
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@tendhunt.com",
        contactType: "customer support",
      },
    },
  ];
}

