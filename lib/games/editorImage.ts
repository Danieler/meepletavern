export function getInitialPrimaryImageInput(game: {
  primaryImageId: string | null;
  coverImageUrl: string | null;
  imageUrl: string | null;
}) {
  return game.primaryImageId || game.coverImageUrl || game.imageUrl || "";
}
