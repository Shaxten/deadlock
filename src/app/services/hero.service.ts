import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { HeroStats, HeroInfo, TierHero, Tier, RankInfo, RankFilter, ItemStats, ItemInfo, HeroCounterStats, HeroBuild } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class HeroService {
  private http = inject(HttpClient);
  private statsUrl = 'https://api.deadlock-api.com/v1/analytics/hero-stats';
  private assetsUrl = 'https://assets.deadlock-api.com/v2/heroes';
  private ranksUrl = 'https://assets.deadlock-api.com/v2/ranks';

  readonly rankFilters: RankFilter[] = [
    { label: 'All', minBadge: 0, maxBadge: 116 },
    { label: 'Initiate', minBadge: 10, maxBadge: 16 },
    { label: 'Seeker', minBadge: 20, maxBadge: 26 },
    { label: 'Alchemist', minBadge: 30, maxBadge: 36 },
    { label: 'Arcanist', minBadge: 40, maxBadge: 46 },
    { label: 'Ritualist', minBadge: 50, maxBadge: 56 },
    { label: 'Emissary', minBadge: 60, maxBadge: 66 },
    { label: 'Archon', minBadge: 70, maxBadge: 76 },
    { label: 'Oracle', minBadge: 80, maxBadge: 86 },
    { label: 'Phantom', minBadge: 90, maxBadge: 96 },
    { label: 'Ascendant', minBadge: 100, maxBadge: 106 },
    { label: 'Eternus', minBadge: 110, maxBadge: 116 }
  ];

  getHeroStats(minBadge?: number, maxBadge?: number): Observable<HeroStats[]> {
    let params = new HttpParams();
    if (minBadge !== undefined && minBadge > 0) {
      params = params.set('min_average_badge', minBadge.toString());
    }
    if (maxBadge !== undefined && maxBadge < 116) {
      params = params.set('max_average_badge', maxBadge.toString());
    }
    return this.http.get<HeroStats[]>(this.statsUrl, { params });
  }

  getHeroes(): Observable<HeroInfo[]> {
    return this.http.get<HeroInfo[]>(this.assetsUrl, {
      params: { only_active: 'true' }
    });
  }

  getRanks(): Observable<RankInfo[]> {
    return this.http.get<RankInfo[]>(this.ranksUrl);
  }

  getTierList(minBadge?: number, maxBadge?: number): Observable<Tier[]> {
    return forkJoin([this.getHeroStats(minBadge, maxBadge), this.getHeroes()]).pipe(
      map(([stats, heroes]) => this.buildTierList(stats, heroes))
    );
  }

  private buildTierList(stats: HeroStats[], heroes: HeroInfo[]): Tier[] {
    const heroMap = new Map<number, HeroInfo>();
    heroes.forEach(h => heroMap.set(h.id, h));

    const totalMatches = stats.reduce((sum, s) => sum + s.matches, 0);

    const tierHeroes: TierHero[] = stats
      .filter(s => heroMap.has(s.hero_id) && s.matches > 0)
      .map(s => {
        const info = heroMap.get(s.hero_id)!;
        const winRate = (s.wins / s.matches) * 100;
        const pickRate = (s.matches / (totalMatches / stats.length)) * 100;
        const avgKills = s.total_kills / s.matches;
        const avgDeaths = s.total_deaths / s.matches;
        const avgAssists = s.total_assists / s.matches;
        return { info, stats: s, winRate, pickRate, avgKills, avgDeaths, avgAssists };
      })
      .sort((a, b) => b.winRate - a.winRate);

    const tiers: Tier[] = [
      { label: 'S', color: '#ff4655', heroes: [] },
      { label: 'A', color: '#00d4aa', heroes: [] },
      { label: 'B', color: '#4a9eff', heroes: [] },
      { label: 'C', color: '#ffa726', heroes: [] },
      { label: 'D', color: '#9e9e9e', heroes: [] }
    ];

    const count = tierHeroes.length;
    const tierSizes = [
      Math.ceil(count * 0.12),
      Math.ceil(count * 0.22),
      Math.ceil(count * 0.32),
      Math.ceil(count * 0.22),
    ];

    let idx = 0;
    for (let t = 0; t < 4; t++) {
      const end = Math.min(idx + tierSizes[t], count);
      tiers[t].heroes = tierHeroes.slice(idx, end);
      idx = end;
    }
    tiers[4].heroes = tierHeroes.slice(idx);

    return tiers;
  }

  getHeroImageUrl(hero: HeroInfo): string {
    return hero.images?.icon_hero_card_webp
      || hero.images?.icon_hero_card
      || hero.images?.small_image
      || '';
  }

  getItemStats(heroId: number): Observable<ItemStats[]> {
    return this.http.get<ItemStats[]>('https://api.deadlock-api.com/v1/analytics/item-stats', {
      params: { hero_id: heroId.toString() }
    });
  }

  getItems(): Observable<ItemInfo[]> {
    return this.http.get<ItemInfo[]>('https://assets.deadlock-api.com/v2/items');
  }

  getHeroCounters(heroId: number): Observable<HeroCounterStats[]> {
    return this.http.get<HeroCounterStats[]>('https://api.deadlock-api.com/v1/analytics/hero-counter-stats', {
      params: { include_hero_ids: heroId.toString() }
    });
  }

  getHeroBuilds(heroId: number, language?: string): Observable<HeroBuild[]> {
    const params: any = {
      hero_id: heroId.toString(),
      sort_by: 'weekly_favorites',
      limit: '5',
      only_latest: 'true'
    };
    if (language) params.build_language = language;
    return this.http.get<HeroBuild[]>('https://api.deadlock-api.com/v1/builds', { params });
  }
}
