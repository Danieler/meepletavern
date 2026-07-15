import assert from "node:assert/strict";
import test from "node:test";
import { GameStatus, TavernMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createTavernGroup,
  createTavernGroupPlay,
  getMyTavernDashboard,
  getTavernGroupLibrary,
  getTavernGroupLibraryPageForMember,
  getTavernGroupMembers,
  getTavernGroupMembersPageData,
  getTavernGroupPlayFormOptionsForMember,
  getTavernGroupPlayHistoryForMember,
  getTavernGroupPlaysPageData,
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
      assert.equal((await searchTavernInviteCandidates(admin.id, tavern.id, "be")).length, 0);
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
      const outsiderInvitation = await inviteTavernGroupMember(admin.id, tavern.id, {
        username: outsider.profile!.username
      });
      const [adminMembersPage, memberMembersPage] = await Promise.all([
        getTavernGroupMembersPageData(admin.id, tavern.id),
        getTavernGroupMembersPageData(member.id, tavern.id)
      ]);
      assert.equal(adminMembersPage.currentRole, TavernMemberRole.ADMIN);
      assert.equal(adminMembersPage.members.length, 2);
      assert.equal(adminMembersPage.invitations[0]?.id, outsiderInvitation.id);
      assert.equal(memberMembersPage.currentRole, TavernMemberRole.MEMBER);
      assert.equal(memberMembersPage.members.length, 2);
      assert.equal(memberMembersPage.invitations.length, 0);
      await assert.rejects(
        () => getTavernGroupMembersPageData(outsider.id, tavern.id),
        (error: unknown) => error instanceof TavernGroupError && error.status === 404
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

      const [libraryAfterPlay, libraryPage, plays, playHistory, playOptions, personalCount, personalLibrary] = await Promise.all([
        getTavernGroupLibrary(admin.id, tavern.id),
        getTavernGroupLibraryPageForMember(tavern.id),
        getTavernGroupPlays(admin.id, tavern.id),
        getTavernGroupPlayHistoryForMember(admin.id, tavern.id, TavernMemberRole.ADMIN),
        getTavernGroupPlayFormOptionsForMember(tavern.id),
        prisma.userGamePlayCount.findUnique({
          where: { userId_gameId: { userId: member.id, gameId: game.id } }
        }),
        prisma.userLibraryGame.findUnique({
          where: { userId_gameId: { userId: member.id, gameId: game.id } }
        })
      ]);
      assert.equal(libraryAfterPlay[0].playCount, 1);
      assert.equal(libraryPage.items[0].playCount, 1);
      assert.equal(libraryPage.hasNext, false);
      assert.equal(plays.items[0].participants.length, 2);
      assert.equal(playHistory.items[0].participants.length, 2);
      assert.equal(playHistory.hasNext, false);
      assert.equal(playOptions.games[0].gameId, game.id);
      assert.equal(playOptions.members.length, 2);
      assert.equal(personalCount, null);
      assert.equal(personalLibrary?.played, false);

      await createTavernGroupPlay(admin.id, tavern.id, {
        gameId: game.id,
        playedAt: new Date().toISOString().slice(0, 10),
        participantUserIds: [admin.id, member.id]
      });
      const [adminPlaysPage, memberPlaysPage] = await Promise.all([
        getTavernGroupPlaysPageData(admin.id, tavern.id),
        getTavernGroupPlaysPageData(member.id, tavern.id)
      ]);
      assert.equal(adminPlaysPage.currentRole, TavernMemberRole.ADMIN);
      assert.equal(adminPlaysPage.games[0]?.gameId, game.id);
      assert.equal(adminPlaysPage.members.length, 2);
      assert.equal(adminPlaysPage.items.length, 2);
      assert.ok(adminPlaysPage.items.every((play) => play.canDelete));
      const memberViewOfAdminPlay = memberPlaysPage.items.find((play) => play.recordedBy?.id === admin.id);
      const memberViewOfOwnPlay = memberPlaysPage.items.find((play) => play.recordedBy?.id === member.id);
      assert.equal(memberViewOfAdminPlay?.canDelete, false);
      assert.equal(memberViewOfOwnPlay?.canDelete, true);
      assert.equal(memberViewOfOwnPlay?.participants.length, 2);
      await assert.rejects(
        () => getTavernGroupPlaysPageData(outsider.id, tavern.id),
        (error: unknown) => error instanceof TavernGroupError && error.status === 404
      );

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
