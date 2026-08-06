import { AdminDatabaseNotice } from "@/components/AdminDatabaseNotice";
import { AdminSuggestionsTable } from "@/components/AdminSuggestionsTable";
import { getAdminDatabaseError } from "@/lib/adminDatabaseError";
import { prisma } from "@/lib/prisma";
import { markSuggestionAction } from "./actions";
import { DeleteSuggestionForm } from "./DeleteSuggestionForm";

export const dynamic = "force-dynamic";

export default async function AdminSuggestionsPage() {
  try {
    const rawSuggestions = await prisma.gameSuggestion.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
            profile: {
              select: {
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 250
    });

    const suggestions = rawSuggestions.map((s) => ({
      id: s.id,
      name: s.name,
      notes: s.notes,
      url: s.url,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      user: {
        displayName: s.user.displayName,
        email: s.user.email,
        username: s.user.profile?.username || null
      }
    }));

    return (
      <AdminSuggestionsTable
        suggestions={suggestions}
        markSuggestionAction={markSuggestionAction}
        DeleteSuggestionForm={DeleteSuggestionForm}
      />
    );
  } catch (error) {
    const databaseError = getAdminDatabaseError(error);
    if (!databaseError) {
      throw error;
    }
    return <AdminDatabaseNotice error={databaseError} />;
  }
}
