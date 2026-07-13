import assert from "node:assert/strict";
import test from "node:test";
import { GameStatus, TavernMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createTavernGroup,
  createTavernGroupPlay,
  getMyTavernDashboard,
  getTavernGroupLibrary,
  getTavernGroupMembers,
  getTavernGroupPlays,
  getTavernGroupSummary,
  inviteTavernGroupMember,
  leaveTavernGroup,
  respondToTavernInvitation,
  TavernGroupError,
  updateTavernMemberRole
} from "@/lib/tavernGroups";
import { searchTavernInviteCandidates } from "@/lib/tavernMemberSearch";

const integrationDatabaseUrl = process.env.TAVERN_TEST_DATABASE_URL;

test(
  "private taverns combine owned games and keep group plays separate from personal plays",
  { skip: !integrationDatabaseUrl, timeout: 30_000 },
  async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const authUserIds = [`tavern-admin-${suffix}`, `tavern-member-${suffix}`, `tavern-outsider-${suffix}`];
    let tavernId: string | null = null;
    let gameId: string | null = null;

    try {
      const [admin, member, outsider] = await Promise.all(
        authUserIds.map((authUserId, index) =>
          prisma.user.create({
            data: {
              authUserId,
              email: `${authUserId}@example.test`,
              displayName: ["Ada", "Berta", "Cora"][index],
              profile: {
                create: {
                  username: `${["ada", "berta", "cora"][index]}-${suffix}`,
                  profileVisibility: "PRIVATE",
                  collectionVisibility: "PRIVATE"
                }
              }
            },
            include: { profile: true }
          })
        )
      );

      const game = await prisma.game.create({
        data: {
          name: `Juego de prueba ${suffix}`,
          title: `Juego de prueba ${suffix}`,
          slug: `juego-taberna-${suffix}`,
          status: GameStatus.published
        }
      });
      gameId = game.id;

      await prisma.userLibraryGame.createMany({
        data: [
          { userId: admin.id, gameId: game.id, owned: true },
          { userId: member.id, gameId: game.id, owned: true }
        ]
      });

      const tavern = await createTavernGroup(admin.id, { name: "Dados al Alba" });
      tavernId = tavern.id;
      assert.equal((await searchTavernInviteCandidates(admin.id, tavern.id, "be"))[0]?.id, member.id);
      assert.equal((await searchTavernInviteCandidates(admin.id, tavern.id, "ber"))[0]?.id, member.id);
      const invitation = await inviteTavernGroupMember(admin.id, tavern.id, {
        username: member.profile!.username
      });
      assert.equal((await searchTavernInviteCandidates(admin.id, tavern.id, "ber")).length, 0);

      const memberDashboard = await getMyTavernDashboard(member.id);
      assert.equal(memberDashboard.invitations[0]?.id, invitation.id);
      assert.deepEqual(await respondToTavernInvitation(member.id, invitation.id, "accept"), {
        accepted: true,
        tavernId: tavern.id
      });
      await assert.rejects(
        () => searchTavernInviteCandidates(member.id, tavern.id, "cor"),
        (error: unknown) => error instanceof TavernGroupError && error.status === 403
      );

      const libraryBeforePlay = await getTavernGroupLibrary(admin.id, tavern.id);
      assert.equal(libraryBeforePlay.length, 1);
      assert.equal(libraryBeforePlay[0].copyCount, 2);
      assert.equal(libraryBeforePlay[0].owners.length, 2);

      await createTavernGroupPlay(member.id, tavern.id, {
        gameId: game.id,
        playedAt: new Date().toISOString().slice(0, 10),
        participantUserIds: [admin.id, member.id]
      });

      const [libraryAfterPlay, plays, personalCount, personalLibrary] = await Promise.all([
        getTavernGroupLibrary(admin.id, tavern.id),
        getTavernGroupPlays(admin.id, tavern.id),
        prisma.userGamePlayCount.findUnique({
          where: { userId_gameId: { userId: member.id, gameId: game.id } }
        }),
        prisma.userLibraryGame.findUnique({
          where: { userId_gameId: { userId: member.id, gameId: game.id } }
        })
      ]);
      assert.equal(libraryAfterPlay[0].playCount, 1);
      assert.equal(plays.items[0].participants.length, 2);
      assert.equal(personalCount, null);
      assert.equal(personalLibrary?.played, false);

      await assert.rejects(
        () => getTavernGroupSummary(outsider.id, tavern.id),
        (error: unknown) => error instanceof TavernGroupError && error.status === 404
      );
      await assert.rejects(
        () => leaveTavernGroup(admin.id, tavern.id),
        (error: unknown) => error instanceof TavernGroupError && error.code === "LAST_ADMIN"
      );

      const members = await getTavernGroupMembers(admin.id, tavern.id);
      const memberMembership = members.members.find((entry) => entry.user.id === member.id);
      assert.ok(memberMembership);
      await updateTavernMemberRole(admin.id, tavern.id, memberMembership.id, TavernMemberRole.ADMIN);
      await leaveTavernGroup(admin.id, tavern.id);
      assert.equal((await getTavernGroupSummary(member.id, tavern.id)).role, TavernMemberRole.ADMIN);
    } finally {
      if (tavernId) await prisma.tavernGroup.deleteMany({ where: { id: tavernId } });
      if (gameId) await prisma.game.deleteMany({ where: { id: gameId } });
      await prisma.user.deleteMany({ where: { authUserId: { in: authUserIds } } });
      await prisma.$disconnect();
    }
  }
);
