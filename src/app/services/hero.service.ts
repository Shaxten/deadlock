import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { HeroStats, HeroInfo, TierHero, Tier } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class HeroService {
  private http = inject(HttpClient);
  private statsUrl = 'https://api.deadlock-api.com/v1/analytics/hero-stats';
  private assetsUrl = 'https://assets.deadlock-api.com/v2/heroes';

  getHeroStats(): Observable<HeroStats[]> {
    return this.http.get<HeroStats[]>(this.statsUrl);
  }

  getHeroes(): Observable<HeroInfo[]> {
    return this.http.get<HeroInfo[]>(this.assetsUrl, {
      params: { only_active: 'true' }
    });
  }

  getTierList(): Observable<Tier[]> {
    return forkJoin([this.getHeroStats(), this.getHeroes()]).pipe(
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
}
