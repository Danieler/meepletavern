import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("private tavern links opt out of automatic route prefetching", () => {
  const communityNav = readFileSync("components/taverns/CommunitySectionNav.tsx", "utf8");
  const groupNav = readFileSync("components/taverns/TavernGroupNav.tsx", "utf8");
  const discovery = readFileSync("components/taverns/TavernDiscoveryCard.tsx", "utf8");
  const accountControls = readFileSync("components/PublicAuthControls.tsx", "utf8");

  assert.match(communityNav, /prefetch=\{href === "\/comunidad\/tabernas" \? false : undefined\}/);
  assert.match(groupNav, /prefetch=\{false\}/);
  assert.match(discovery, /href="\/comunidad\/tabernas" prefetch=\{false\}/);
  assert.ok((accountControls.match(/prefetch=\{false\}/g) ?? []).length >= 2);
});

test("opening a tavern exposes progress without prefetching its private payload", () => {
  const dashboard = readFileSync("components/taverns/TavernDashboardClient.tsx", "utf8");
  const library = readFileSync("app/comunidad/tabernas/[tavernId]/page.tsx", "utf8");
  const members = readFileSync("components/taverns/TavernMembersClient.tsx", "utf8");
  const plays = readFileSync("components/taverns/TavernPlaysClient.tsx", "utf8");

  assert.match(dashboard, /const \[openingTavernId, setOpeningTavernId\]/);
  assert.match(dashboard, /aria-busy=\{isOpening\}/);
  assert.match(dashboard, /role="status"/);
  assert.match(dashboard, /prefetch=\{false\}/);
  assert.match(library, /href=\{`\/juegos\/\$\{game\.slug\}`\} prefetch=\{false\}/);
  assert.match(members, /href=\{`\/u\/\$\{member\.user\.username\}`\} prefetch=\{false\}/);
  assert.match(plays, /href=\{`\/juegos\/\$\{play\.slug\}`\} prefetch=\{false\}/);
});

test("declining an invitation updates the dashboard without reloading it", () => {
  const dashboard = readFileSync("components/taverns/TavernDashboardClient.tsx", "utf8");

  assert.match(dashboard, /const \[invitations, setInvitations\] = useState/);
  assert.match(dashboard, /setInvitations\(\(current\) => current\.filter/);
  assert.doesNotMatch(dashboard, /router\.refresh\(\)/);
});

test("member administration avoids full reloads when summary counts do not change", () => {
  const members = readFileSync("components/taverns/TavernMembersClient.tsx", "utf8");

  assert.match(members, /const \[members, setMembers\] = useState\(initialMembers\)/);
  assert.match(members, /const \[invitations, setInvitations\] = useState\(initialInvitations\)/);
  assert.match(members, /setInvitations\(\(current\) => \[payload\.invitation!/);
  assert.match(members, /if \(action === "remove"\) router\.refresh\(\)/);
  assert.equal((members.match(/router\.refresh\(\)/g) ?? []).length, 1);
});

test("leaving or deleting navigates once and keeps refresh only for an in-place save", () => {
  const settings = readFileSync("components/taverns/TavernSettingsClient.tsx", "utf8");

  assert.equal((settings.match(/router\.refresh\(\)/g) ?? []).length, 1);
  assert.match(settings, /router\.push\("\/comunidad\/tabernas"\)/);
});

test("the private dashboard has an accessible reduced-motion loading state", () => {
  const loading = readFileSync("app/comunidad/tabernas/loading.tsx", "utf8");

  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Cargando tus tabernas/);
  assert.match(loading, /motion-reduce:animate-none/);
});

test("each tavern tab has a lightweight route-specific loading state", () => {
  for (const segment of ["partidas", "miembros", "ajustes"]) {
    const loading = readFileSync(`app/comunidad/tabernas/[tavernId]/${segment}/loading.tsx`, "utf8");
    assert.match(loading, /aria-busy="true"/);
    assert.match(loading, /motion-reduce:animate-none/);
  }
});

test("private shell shares auth and skips public onboarding work", () => {
  const shell = readFileSync("components/PublicShell.tsx", "utf8");
  const layout = readFileSync("app/comunidad/tabernas/layout.tsx", "utf8");
  const auth = readFileSync("hooks/useAuth.ts", "utf8");

  assert.match(shell, /<AuthProvider>/);
  assert.match(shell, /mode === "public" \? <PostAuthCoordinator \/>/);
  assert.match(layout, /<PublicShell mode="account">/);
  assert.match(auth, /const sharedAuth = useContext\(AuthContext\)/);
  assert.match(auth, /useAuthState\(sharedAuth === null\)/);
});
