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

export interface RankInfo {
  tier: number;
  name: string;
  images: {
    small_webp?: string;
    small?: string;
    large_webp?: string;
    large?: string;
    [key: string]: string | undefined;
  };
  color: string;
}

export interface RankFilter {
  label: string;
  minBadge: number;
  maxBadge: number;
}

export interface ItemStats {
  item_id: number;
  bucket: number;
  wins: number;
  losses: number;
  matches: number;
  players: number;
  avg_buy_time_s: number;
  avg_sell_time_s: number;
  avg_buy_time_relative: number;
  avg_sell_time_relative: number;
}

export interface ItemInfo {
  id: number;
  class_name: string;
  name: string;
  image: string;
  image_webp: string;
  type: string;
  item_slot_type?: 'weapon' | 'spirit' | 'vitality';
}

export interface HeroCounterStats {
  hero_id: number;
  enemy_hero_id: number;
  wins: number;
  matches_played: number;
  kills: number;
  enemy_kills: number;
  deaths: number;
  enemy_deaths: number;
  assists: number;
  enemy_assists: number;
}

export interface HeroBuild {
  hero_build: {
    hero_id: number;
    hero_build_id: number;
    name: string;
    author_account_id: number;
    language: string;
    version: number;
    details: {
      mod_categories: Array<{
        name: string;
        mods?: Array<{ ability_id: number }>;
      }>;
    };
  };
  num_favorites: number;
  num_weekly_favorites: number;
}

export interface SteamProfile {
  account_id: number;
  personaname: string;
  avatar: string;
  avatarfull: string;
  avatarmedium: string;
  profileurl: string;
}

export interface PlayerHeroStats {
  account_id: number;
  hero_id: number;
  matches_played: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  last_played: number;
}

export interface PlayerMatch {
  account_id: number;
  match_id: number;
  hero_id: number;
  start_time: number;
  match_duration_s: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  net_worth: number;
  match_result: number;
  player_team: number;
  hero_level: number;
}
