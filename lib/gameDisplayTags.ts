type GameTagSource = {
  categories: string[];
  mechanics: string[];
  themes: string[];
};

export function getPrimaryGameTags(game: GameTagSource, limit = 2) {
  const mechanics = unique(game.mechanics);
  const categories = unique(game.categories);

  if (mechanics.length) {
    return mechanics.slice(0, limit);
  }

  return categories.slice(0, limit);
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
