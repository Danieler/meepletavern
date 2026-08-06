import type { Metadata } from "next";
import { AdminHeader } from "@/components/AdminHeader";
import { AdminI18nProvider } from "@/lib/adminI18n";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminI18nProvider>
      <main className="min-h-screen bg-[#f4f1ea]">
        <AdminHeader />
        <div className="container-page py-8">{children}</div>
      </main>
    </AdminI18nProvider>
  );
}
