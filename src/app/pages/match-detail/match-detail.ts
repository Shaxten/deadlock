import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchService } from '../../services/match.service';
import { HeroService } from '../../services/hero.service';
import { MatchMetadata, MatchPlayer, HeroInfo } from '../../models/hero.model';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-detail.html',
  styleUrl: './match-detail.scss'
})
export class MatchDetail implements OnInit {
  private matchService = inject(MatchService);
  private heroService = inject(HeroService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  matchData = signal<MatchMetadata | null>(null);
  heroes = signal<HeroInfo[]>([]);
  highlightedPlayer = signal<number | null>(null);

  heroMap = computed(() => {
    const map = new Map<number, HeroInfo>();
    this.heroes().forEach(h => map.set(h.id, h));
    return map;
  });

  team0 = computed(() => {
    const data = this.matchData();
    if (!data) return [];
    return data.players.filter(p => p.team === 0);
  });

  team1 = computed(() => {
    const data = this.matchData();
    if (!data) return [];
    return data.players.filter(p => p.team === 1);
  });

  winningTeam = computed(() => {
    return this.matchData()?.match_info.winning_team ?? -1;
  });

  ngOnInit(): void {
    const matchId = Number(this.route.snapshot.paramMap.get('id'));
    const playerParam = this.route.snapshot.queryParamMap.get('player');
    if (playerParam) {
      this.highlightedPlayer.set(Number(playerParam));
    }

    if (!matchId || isNaN(matchId)) {
      this.error.set('Invalid match ID.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      match: this.matchService.getMatchMetadata(matchId),
      heroes: this.heroService.getHeroes()
    }).subscribe({
      next: ({ match, heroes }) => {
        this.matchData.set(match);
        this.heroes.set(heroes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load match data. The match may not exist or the API may be unavailable.');
        this.loading.set(false);
      }
    });
  }

  getHeroName(heroId: number): string {
    return this.heroMap().get(heroId)?.name || `Hero ${heroId}`;
  }

  getHeroImage(heroId: number): string {
    const hero = this.heroMap().get(heroId);
    if (!hero) return '';
    return this.heroService.getHeroImageUrl(hero);
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isHighlighted(player: MatchPlayer): boolean {
    return this.highlightedPlayer() === player.account_id;
  }

  isWinningTeam(team: number): boolean {
    return this.winningTeam() === team;
  }
}
