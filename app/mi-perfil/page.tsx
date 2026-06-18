import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ProfilePanel } from "@/components/auth/ProfilePanel";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <PublicShell>
      <main className="container-page py-10 lg:py-16">
        <ProfilePanel />
      </main>
    </PublicShell>
  );
}
