export type MobileTaxonomyItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type MobileTaxonomyFilterItem = MobileTaxonomyItem & {
  gamesCount: number;
};

export type MobileGameListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  rating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  categories: MobileTaxonomyItem[];
  mechanics: MobileTaxonomyItem[];
};

export type MobileGameOffer = {
  source: string;
  price: number | null;
  currency: string;
  url: string;
};

export type MobileGameDetail = MobileGameListItem & {
  age: number | null;
  year: number | null;
  publisher: string | null;
  offers: MobileGameOffer[];
};

export type MobileAppliedFilters = Partial<
  Record<"q" | "category" | "mechanic" | "theme" | "players" | "duration" | "weight" | "age" | "sort", string | string[]>
>;

export type MobileFilterOption = {
  label: string;
  value: string;
};

export type MobileFiltersResponse = {
  players: MobileFilterOption[];
  duration: MobileFilterOption[];
  weight: MobileFilterOption[];
  age: MobileFilterOption[];
  sort: MobileFilterOption[];
};

export type MobileGamesResponse = {
  items: MobileGameListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  appliedFilters: MobileAppliedFilters;
};
