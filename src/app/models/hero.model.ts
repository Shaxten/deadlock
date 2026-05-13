export interface HeroStats {
  hero_id: number;
  bucket: number;
  wins: number;
  losses: number;
  matches: number;
  matches_per_bucket: number;
  players: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_net_worth: number;
  total_last_hits: number;
  total_denies: number;
  total_player_damage: number;
  total_player_damage_taken: number;
  total_boss_damage: number;
  total_creep_damage: number;
  total_neutral_damage: number;
  total_max_health: number;
  total_shots_hit: number;
  total_shots_missed: number;
}

export interface HeroInfo {
  id: number;
  class_name: string;
  name: string;
  images: {
    icon_hero_card?: string;
    icon_hero_card_webp?: string;
    minimap_image?: string;
    top_bar_image?: string;
    small_image?: string;
    [key: string]: string | undefined;
  };
}

export interface TierHero {
  info: HeroInfo;
  stats: HeroStats;
  winRate: number;
  pickRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}

export type TierLabel = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Tier {
  label: TierLabel;
  color: string;
  heroes: TierHero[];
}
