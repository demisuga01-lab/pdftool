import type { Metadata } from "next";

const SITE_NAME = "PDFTools by WellFriend";
const SITE_URL = "https://tools.wellfriend.online";

type BuildPageMetadataOptions = {
  description: string;
  path: string;
  robots?: Metadata["robots"];
  title: string;
};

export function buildPageMetadata({
  description,
  path,
  robots,
  title,
}: BuildPageMetadataOptions): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots,
  };
}
