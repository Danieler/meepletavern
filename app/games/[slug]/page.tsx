import { redirect } from "next/navigation";

type GameRedirectProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function GameRedirect({ params }: GameRedirectProps) {
  const { slug } = await params;
  redirect(`/juegos/${slug}`);
}

