"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Crown, Loader2, MailPlus, Shield, Trash2, UserMinus, UserRound, UsersRound } from "lucide-react";
import { TavernConfirmDialog } from "@/components/taverns/TavernConfirmDialog";
import {
  normalizeTavernMemberQuery,
  MAX_TAVERN_MEMBER_QUERY_LENGTH,
  MIN_TAVERN_MEMBER_QUERY_LENGTH,
  useTavernMemberSuggestions
} from "@/hooks/useTavernMemberSuggestions";

type Person = { id: string; username: string; displayName: string };
type Member = { id: string; role: "ADMIN" | "MEMBER"; joinedAt: string; user: Person };
type Invitation = { id: string; expiresAt: string; user: Person };
type MemberActionIntent = { member: Member; action: "role" | "remove" };

export function TavernMembersClient({
  tavernId,
  currentUserId,
  currentRole,
  initialMembers,
  initialInvitations
}: {
  tavernId: string;
  currentUserId: string;
  currentRole: "ADMIN" | "MEMBER";
  initialMembers: Member[];
  initialInvitations: Invitation[];
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionIntent, setActionIntent] = useState<MemberActionIntent | null>(null);
  const [actionError, setActionError] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const isAdmin = currentRole === "ADMIN";
  const {
    query: memberSearchQuery,
    suggestions,
    searching,
    searchedQuery,
    clear: clearMemberSuggestions
  } = useTavernMemberSuggestions({ tavernId, enabled: isAdmin, value: username, selectedUsername });

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/taverns/${tavernId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const payload = (await response.json().catch(() => null)) as { invitation?: Invitation; error?: string } | null;
      if (!response.ok || !payload?.invitation) throw new Error(payload?.error || "No se pudo invitar al usuario.");
      setInvitations((current) => [payload.invitation!, ...current]);
      setUsername("");
      setSelectedUsername(null);
      clearMemberSuggestions();
      setFeedback({ tone: "success", text: "Invitación enviada. La ludoteca no se compartirá hasta que la acepte." });
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "No se pudo invitar al usuario." });
    } finally {
      setPending(false);
    }
  }

  async function memberAction(member: Member, action: "role" | "remove") {
    const nextRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    setActingId(member.id);
    setActionError("");
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/taverns/${tavernId}/members/${member.id}`, {
        method: action === "remove" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "role" ? { role: nextRole } : {})
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo actualizar el miembro.");
      if (action === "remove") {
        clearMemberSuggestions();
        setMembers((current) => current.filter((entry) => entry.id !== member.id));
      } else {
        setMembers((current) => current.map((entry) => entry.id === member.id ? { ...entry, role: nextRole } : entry));
      }
      setFeedback({
        tone: "success",
        text: action === "remove"
          ? `${member.user.displayName} ya no forma parte de la taberna.`
          : `${member.user.displayName} ahora es ${nextRole === "ADMIN" ? "administrador" : "miembro"}.`
      });
      setActionIntent(null);
      if (action === "remove") router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "No se pudo actualizar el miembro.");
    } finally {
      setActingId(null);
    }
  }

  async function revoke(invitationId: string) {
    setActingId(invitationId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/account/taverns/${tavernId}/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "No se pudo cancelar la invitación.");
      clearMemberSuggestions();
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
    } catch (caught) {
      setFeedback({ tone: "error", text: caught instanceof Error ? caught.message : "No se pudo cancelar la invitación." });
    } finally {
      setActingId(null);
    }
  }

  const actionMember = actionIntent?.member;
  const nextActionRole = actionMember?.role === "ADMIN" ? "MEMBER" : "ADMIN";
  const actionTitle = actionIntent?.action === "remove"
    ? `¿Expulsar a ${actionMember?.user.displayName || "este miembro"}?`
    : nextActionRole === "ADMIN"
      ? `¿Hacer administrador a ${actionMember?.user.displayName || "este miembro"}?`
      : `¿Retirar los permisos de ${actionMember?.user.displayName || "este administrador"}?`;
  const actionDescription = actionIntent?.action === "remove"
    ? "Sus juegos dejarán de aparecer en la ludoteca conjunta. Las partidas que ya figuran en el historial se conservarán."
    : nextActionRole === "ADMIN"
      ? "Podrá invitar y expulsar miembros, cambiar roles, renombrar la taberna y eliminarla definitivamente."
      : "Seguirá formando parte de la taberna y podrá consultar la ludoteca y registrar partidas, pero ya no podrá administrarla.";
  const actionPending = Boolean(actionMember && actingId === actionMember.id);

  return (
    <>
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <section>
          <p className="tavern-eyebrow">La mesa</p>
          <h2 className="font-display mt-2 text-3xl font-bold text-wood">Miembros</h2>
          <div className="mt-4 grid gap-2 rounded-md border border-walnut/12 bg-white/55 p-4 text-sm font-semibold leading-6 text-walnut/68 sm:grid-cols-2">
            <p><strong className="text-wood">Miembros:</strong> consultan la ludoteca conjunta y registran partidas.</p>
            <p><strong className="text-wood">Administradores:</strong> además invitan, gestionan roles, cambian el nombre y pueden eliminar la taberna.</p>
          </div>
          <div className="mt-5 grid gap-3">
            {members.map((member) => (
              <article key={member.id} className="tavern-card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-walnut/12 bg-vanilla text-wood"><UserRound size={20} /></span>
                  <div className="min-w-0">
                    <Link href={`/u/${member.user.username}`} prefetch={false} className="font-display block truncate text-xl font-bold text-wood hover:text-ember">{member.user.displayName}</Link>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.08em] text-walnut/48">
                      {member.role === "ADMIN" ? <Crown size={14} className="text-ember" /> : <UsersRound size={14} />}
                      {member.role === "ADMIN" ? "Administrador" : "Miembro"}{member.user.id === currentUserId ? " · Tú" : ""}
                    </p>
                  </div>
                </div>
                {isAdmin && member.user.id !== currentUserId ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="button-secondary"
                      disabled={actingId === member.id}
                      onClick={() => {
                        setActionError("");
                        setActionIntent({ member, action: "role" });
                      }}
                    >
                      <Shield size={16} /> {member.role === "ADMIN" ? "Hacer miembro" : "Hacer administrador"}
                    </button>
                    <button
                      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-ruby/20 text-ruby hover:bg-ruby/8"
                      disabled={actingId === member.id}
                      onClick={() => {
                        setActionError("");
                        setActionIntent({ member, action: "remove" });
                      }}
                      aria-label={`Expulsar a ${member.user.displayName}`}
                    >
                      {actingId === member.id ? <Loader2 className="animate-spin" size={16} /> : <UserMinus size={16} />}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-28">
        {isAdmin ? (
          <section className="tavern-panel p-5">
            <MailPlus className="text-ember" size={22} />
            <h2 className="font-display mt-3 text-2xl font-bold text-wood">Invitar miembro</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-walnut/62">Invita por nombre de usuario. La otra persona deberá aceptar antes de compartir su ludoteca.</p>
            <form className="mt-4 grid gap-3" onSubmit={invite}>
              <div className="relative">
                <label>
                  <span className="field-label">Nombre de usuario</span>
                  <span className="relative mt-2 block">
                    <input
                      className="field-input pr-10"
                      required
                      minLength={3}
                      maxLength={MAX_TAVERN_MEMBER_QUERY_LENGTH + 1}
                      value={username}
                      onChange={(event) => {
                        const nextUsername = event.target.value;
                        setUsername(nextUsername);
                        if (normalizeTavernMemberQuery(nextUsername) !== selectedUsername) setSelectedUsername(null);
                      }}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="@nombre_de_usuario"
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="tavern-member-suggestions"
                      aria-expanded={searchFocused && memberSearchQuery.length >= MIN_TAVERN_MEMBER_QUERY_LENGTH && memberSearchQuery !== selectedUsername}
                    />
                    {searching ? <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ember" size={16} aria-hidden="true" /> : null}
                  </span>
                </label>
                {searchFocused && memberSearchQuery.length >= MIN_TAVERN_MEMBER_QUERY_LENGTH && memberSearchQuery !== selectedUsername ? (
                  <div id="tavern-member-suggestions" role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-walnut/15 bg-white p-1 shadow-xl">
                    {suggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        className="focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-vanilla"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setUsername(candidate.username);
                          setSelectedUsername(candidate.username.toLowerCase());
                        }}
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vanilla text-wood"><UserRound size={17} /></span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm text-wood">{candidate.displayName}</strong>
                          <small className="block truncate font-semibold text-walnut/52">@{candidate.username}</small>
                        </span>
                      </button>
                    ))}
                    {!searching && searchedQuery === memberSearchQuery && suggestions.length === 0 ? (
                      <p className="px-3 py-3 text-sm font-semibold text-walnut/58">No encontramos usuarios disponibles.</p>
                    ) : null}
                    {searching && suggestions.length === 0 ? (
                      <p className="px-3 py-3 text-sm font-semibold text-walnut/58">Buscando usuarios...</p>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-2 text-xs font-semibold text-walnut/50">Escribe al menos {MIN_TAVERN_MEMBER_QUERY_LENGTH} caracteres para ver sugerencias.</p>
              </div>
              <button className="button-primary" disabled={pending} type="submit">{pending ? <Loader2 className="animate-spin" size={17} /> : <MailPlus size={17} />} {pending ? "Enviando..." : "Enviar invitación"}</button>
            </form>
          </section>
        ) : null}

        {isAdmin && invitations.length ? (
          <section className="tavern-card p-5">
            <h2 className="font-display text-xl font-bold text-wood">Pendientes</h2>
            <div className="mt-4 grid gap-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-3 border-b border-walnut/10 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-wood">{invitation.user.displayName}</p><p className="mt-1 truncate text-xs font-semibold text-walnut/50">@{invitation.user.username}</p></div>
                  <button className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ruby/20 text-ruby" disabled={actingId === invitation.id} onClick={() => void revoke(invitation.id)} aria-label={`Cancelar invitación de ${invitation.user.displayName}`}>
                    {actingId === invitation.id ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {feedback ? <p className={`rounded-md border px-4 py-3 text-sm font-bold ${feedback.tone === "success" ? "border-moss/20 bg-moss/8 text-moss" : "border-ruby/20 bg-ruby/8 text-ruby"}`} role={feedback.tone === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
        </aside>
      </div>

      <TavernConfirmDialog
        open={Boolean(actionIntent)}
        title={actionTitle}
        description={actionDescription}
        confirmLabel={actionIntent?.action === "remove" ? "Expulsar miembro" : nextActionRole === "ADMIN" ? "Hacer administrador" : "Hacer miembro"}
        pendingLabel={actionIntent?.action === "remove" ? "Expulsando..." : "Actualizando..."}
        pending={actionPending}
        error={actionError}
        tone={actionIntent?.action === "remove" ? "danger" : "default"}
        onCancel={() => {
          if (actionPending) return;
          setActionIntent(null);
          setActionError("");
        }}
        onConfirm={() => {
          if (actionIntent) void memberAction(actionIntent.member, actionIntent.action);
        }}
      />
    </>
  );
}
