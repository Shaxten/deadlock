import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../services/hero.service';
import { Tier, TierHero, RankFilter } from '../../models/hero.model';

@Component({
  selector: 'app-tierlist',
  imports: [CommonModule, RouterLink],
  templateUrl: './tierlist.html',
  styleUrl: './tierlist.scss'
})
export class Tierlist implements OnInit {
  private heroService = inject(HeroService);

  tiers: Tier[] = [];
  loading = true;
  error = '';

  rankFilters: RankFilter[] = this.heroService.rankFilters;
  selectedRank: RankFilter = this.rankFilters[0];

  ngOnInit(): void {
    this.loadTierList();
  }

  selectRank(rank: RankFilter): void {
    this.selectedRank = rank;
    this.loading = true;
    this.error = '';
    this.loadTierList();
  }

  private loadTierList(): void {
    const min = this.selectedRank.minBadge === 0 ? undefined : this.selectedRank.minBadge;
    const max = this.selectedRank.maxBadge === 116 && this.selectedRank.minBadge === 0 ? undefined : this.selectedRank.maxBadge;

    this.heroService.getTierList(min, max).subscribe({
      next: (tiers) => {
        this.tiers = tiers;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Impossible de charger les données. Réessayez plus tard.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  getHeroImage(hero: TierHero): string {
    return this.heroService.getHeroImageUrl(hero.info);
  }

  trackByTier(_: number, tier: Tier): string {
    return tier.label;
  }

  trackByHero(_: number, hero: TierHero): number {
    return hero.info.id;
  }
}
