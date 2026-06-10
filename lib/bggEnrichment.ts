import { GameStatus, Prisma, type Game } from "@prisma/client";
import { normalizeGamePlayers } from "@/lib/editorialMappers";
import type { BggGameDetails } from "@/lib/bgg";

export function buildBggGameUpdateInput(
  game: Game,
  details: BggGameDetails,
  options: { overwriteManualFields?: boolean } = {}
): Prisma.GameUpdateInput {
  const overwrite = options.overwriteManualFields === true;
  const shouldFillYear = overwrite || !game.year;
  const shouldFillPlayers = overwrite || !game.minPlayers || !game.maxPlayers;
  const shouldFillPlaytime = overwrite || !game.playtime;
  const shouldFillAge = overwrite || !game.minAge || !game.age;

  const minPlayers = details.minPlayers ?? game.minPlayers;
  const maxPlayers = details.maxPlayers ?? game.maxPlayers;

  return {
    ...(details.bggId ? { bggId: details.bggId } : {}),
    bggUrl: details.bggUrl,
    bggDescriptionRaw: details.description,
    bggAverageRating: details.averageRating,
    bggBayesAverageRating: details.bayesAverageRating,
    bggUsersRated: details.usersRated,
    bggRank: details.rank,
    bggWeight: details.weight,
    bggWeightVotes: details.weightVotes,
    bggYearPublished: details.yearPublished,
    bggMinPlayers: details.minPlayers,
    bggMaxPlayers: details.maxPlayers,
    bggPlayingTime: details.playingTime,
    bggMinAge: details.minAge,
    bggDesigners: details.designers,
    bggArtists: details.artists,
    bggPublishers: details.publishers,
    bggCategories: details.categories,
    bggMechanics: details.mechanics,
    bggFamilies: details.families,
    bggLastSyncedAt: new Date(),
    ...(shouldFillYear && details.yearPublished ? { year: details.yearPublished } : {}),
    ...(shouldFillPlayers
      ? {
          players: normalizeGamePlayers({
            min: minPlayers,
            max: maxPlayers,
            label: formatPlayersLabel(minPlayers, maxPlayers)
          }) as unknown as Prisma.InputJsonValue,
          minPlayers,
          maxPlayers
        }
      : {}),
    ...(shouldFillPlaytime && details.playingTime ? { playtime: `${details.playingTime} min` } : {}),
    ...(shouldFillAge && details.minAge ? { age: `${details.minAge}+`, minAge: details.minAge } : {})
  };
}

function formatPlayersLabel(minPlayers: number | null, maxPlayers: number | null) {
  if (!minPlayers && !maxPlayers) {
    return null;
  }

  if (minPlayers && maxPlayers && minPlayers !== maxPlayers) {
    return `${minPlayers}-${maxPlayers}`;
  }

  return String(minPlayers || maxPlayers || "");
}
