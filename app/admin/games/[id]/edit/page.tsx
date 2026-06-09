import { redirect } from "next/navigation";

type EditGamePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditGamePage({ params }: EditGamePageProps) {
  const { id } = await params;

  redirect(`/admin/games/${id}`);
}
