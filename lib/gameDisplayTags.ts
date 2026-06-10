type GameTagSource = {
  categories: string[];
  mechanics: string[];
  themes: string[];
};

export function getPrimaryGameTags(game: GameTagSource, limit = 2) {
  const mechanics = unique(game.mechanics);
  const themes = unique(game.themes);
  const categories = unique(game.categories);

  if (mechanics.length || themes.length) {
    return interleave(mechanics, themes).slice(0, limit);
  }

  return categories.slice(0, limit);
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function interleave(first: string[], second: string[]) {
  const combined: string[] = [];
  const max = Math.max(first.length, second.length);

  for (let index = 0; index < max; index += 1) {
    if (first[index]) {
      combined.push(first[index]);
    }
    if (second[index]) {
      combined.push(second[index]);
    }
  }

  return combined;
}
