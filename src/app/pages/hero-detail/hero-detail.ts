import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HeroService } from '../../services/hero.service';
import { HeroInfo, HeroStats, TierHero, ItemStats, ItemInfo, HeroCounterStats, HeroBuild } from '../../models/hero.model';

@Component({
  selector: 'app-hero-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './hero-detail.html',
  styleUrl: './hero-detail.scss'
})
export class HeroDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private heroService = inject(HeroService);

  hero = signal<TierHero | null>(null);
  items = signal<Array<ItemStats & { info?: ItemInfo }>>([]);
  counters = signal<Array<HeroCounterStats & { enemyInfo?: HeroInfo }>>([]);
  builds = signal<HeroBuild[]>([]);
  allHeroes = signal<HeroInfo[]>([]);
  allItems = signal<Map<number, ItemInfo>>(new Map());

  loading = signal(true);
  error = signal('');

  topItems = computed(() =>
    this.items()
      .filter(i => i.info)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 10)
  );

  strongAgainst = computed(() =>
    this.counters()
      .filter(c => c.hero_id === this.hero()?.info.id)
      .map(c => ({ ...c, winRate: (c.wins / c.matches_played) * 100 }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 6)
  );

  weakAgainst = computed(() =>
    this.counters()
      .filter(c => c.hero_id === this.hero()?.info.id)
      .map(c => ({ ...c, winRate: (c.wins / c.matches_played) * 100 }))
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 6)
  );

  ngOnInit(): void {
    const heroId = Number(this.route.snapshot.paramMap.get('id'));
    if (!heroId) {
      this.error.set('Hero not found.');
      this.loading.set(false);
      return;
    }
    this.loadHeroData(heroId);
  }

  private loadHeroData(heroId: number): void {
    forkJoin([
      this.heroService.getHeroStats(),
      this.heroService.getHeroes(),
      this.heroService.getItemStats(heroId),
      this.heroService.getItems(),
      this.heroService.getHeroCounters(heroId),
      this.heroService.getHeroBuilds(heroId)
    ]).subscribe({
      next: ([stats, heroes, itemStats, itemInfos, counterStats, builds]) => {
        this.allHeroes.set(heroes);

        const heroInfo = heroes.find(h => h.id === heroId);
        const heroStats = stats.find(s => s.hero_id === heroId);

        if (!heroInfo || !heroStats) {
          this.error.set('Hero not found.');
          this.loading.set(false);
          return;
        }

        const totalMatches = stats.reduce((sum, s) => sum + s.matches, 0);
        const winRate = (heroStats.wins / heroStats.matches) * 100;
        const pickRate = (heroStats.matches / (totalMatches / stats.length)) * 100;
        const avgKills = heroStats.total_kills / heroStats.matches;
        const avgDeaths = heroStats.total_deaths / heroStats.matches;
        const avgAssists = heroStats.total_assists / heroStats.matches;

        this.hero.set({ info: heroInfo, stats: heroStats, winRate, pickRate, avgKills, avgDeaths, avgAssists });

        // Map item stats with item info
        const itemMap = new Map<number, ItemInfo>();
        itemInfos.forEach(i => itemMap.set(i.id, i));
        this.allItems.set(itemMap);
        this.items.set(itemStats.map(is => ({ ...is, info: itemMap.get(is.item_id) })));

        // Map counter stats with hero info
        const heroMap = new Map<number, HeroInfo>();
        heroes.forEach(h => heroMap.set(h.id, h));
        this.counters.set(counterStats.map(cs => ({ ...cs, enemyInfo: heroMap.get(cs.enemy_hero_id) })));

        this.builds.set(builds);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load hero data.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  getHeroImage(hero: HeroInfo): string {
    return this.heroService.getHeroImageUrl(hero);
  }

  getEnemyHeroInfo(enemyHeroId: number): HeroInfo | undefined {
    return this.allHeroes().find(h => h.id === enemyHeroId);
  }

  formatBuyTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }

  getItemWinRate(item: ItemStats): number {
    if (!item.matches || item.matches === 0) return 0;
    return (item.wins / item.matches) * 100;
  }

  expandedBuilds = signal<Set<number>>(new Set());

  toggleBuild(buildId: number): void {
    const current = new Set(this.expandedBuilds());
    if (current.has(buildId)) {
      current.delete(buildId);
    } else {
      current.add(buildId);
    }
    this.expandedBuilds.set(current);
  }

  isBuildExpanded(buildId: number): boolean {
    return this.expandedBuilds().has(buildId);
  }

  getBuildCategories(build: HeroBuild): { name: string; items: ItemInfo[]; abilities: ItemInfo[] }[] {
    const itemMap = this.allItems();
    return build.hero_build.details.mod_categories
      .filter(cat => cat.mods && cat.mods.length > 0)
      .map(cat => {
        const items: ItemInfo[] = [];
        const abilities: ItemInfo[] = [];
        for (const mod of cat.mods || []) {
          const info = itemMap.get(mod.ability_id);
          if (!info) continue;
          if (info.type === 'upgrade') {
            items.push(info);
          } else if (info.type === 'ability') {
            abilities.push(info);
          }
        }
        return { name: cat.name, items, abilities };
      })
      .filter(cat => cat.items.length > 0 || cat.abilities.length > 0);
  }

  getBuildItems(build: HeroBuild): ItemInfo[] {
    const itemMap = this.allItems();
    const items: ItemInfo[] = [];
    for (const category of build.hero_build.details.mod_categories) {
      if (category.mods) {
        for (const mod of category.mods) {
          const info = itemMap.get(mod.ability_id);
          if (info && info.type === 'upgrade') {
            items.push(info);
          }
          if (items.length >= 6) break;
        }
      }
      if (items.length >= 6) break;
    }
    return items;
  }
}
