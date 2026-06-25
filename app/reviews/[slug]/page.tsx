import { permanentRedirect } from "next/navigation";

type ReviewRedirectProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ReviewRedirect({ params }: ReviewRedirectProps) {
  const { slug } = await params;
  permanentRedirect(`/resenas/${slug}`);
}

