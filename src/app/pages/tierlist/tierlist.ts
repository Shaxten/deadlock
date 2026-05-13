import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../services/hero.service';
import { Tier, TierHero } from '../../models/hero.model';

@Component({
  selector: 'app-tierlist',
  imports: [CommonModule],
  templateUrl: './tierlist.html',
  styleUrl: './tierlist.scss'
})
export class Tierlist implements OnInit {
  private heroService = inject(HeroService);

  tiers: Tier[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.heroService.getTierList().subscribe({
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
