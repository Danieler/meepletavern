"use client";

import Link from "next/link";
import { AdminSectionHeader } from "@/components/AdminSectionHeader";
import { useAdminI18n } from "@/lib/adminI18n";

export function AdminReviewsHeader() {
  const { t } = useAdminI18n();

  return (
    <div>
      <AdminSectionHeader
        titleKey="reviews.title"
        descriptionKey="reviews.description"
      />
      <div className="mb-6">
        <Link className="button-secondary" href="/admin/reviews/new">
          {t("reviews.newReview")}
        </Link>
      </div>
    </div>
  );
}
