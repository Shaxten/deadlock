import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchService } from '../../services/match.service';
import { HeroService } from '../../services/hero.service';
import { PlayerService } from '../../services/player.service';
import { MatchMetadata, MatchPlayer, HeroInfo, SteamProfile } from '../../models/hero.model';

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
  private playerService = inject(PlayerService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  error = signal<string | null>(null);
  matchData = signal<MatchMetadata | null>(null);
  heroes = signal<HeroInfo[]>([]);
  playerProfiles = signal<Map<number, SteamProfile>>(new Map());
  selectedPlayer = signal<MatchPlayer | null>(null);

  heroMap = computed(() => {
    const map = new Map<number, HeroInfo>();
    this.heroes().forEach(h => map.set(h.id, h));
    return map;
  });

  team0 = computed(() => {
    const data = this.matchData();
    if (!data?.players) return [];
    return data.players.filter(p => p.team === 0);
  });

  team1 = computed(() => {
    const data = this.matchData();
    if (!data?.players) return [];
    return data.players.filter(p => p.team === 1);
  });

  winningTeam = computed(() => {
    return this.matchData()?.match_info?.winning_team ?? -1;
  });

  ngOnInit(): void {
    const matchId = Number(this.route.snapshot.paramMap.get('id'));
    const playerParam = this.route.snapshot.queryParamMap.get('player');

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

        // Fetch player names
        const accountIds = match.players
          .map(p => p.account_id)
          .filter(id => id > 0);

        if (accountIds.length > 0) {
          this.playerService.getSteamProfiles(accountIds).subscribe({
            next: (profiles) => {
              const map = new Map<number, SteamProfile>();
              profiles.forEach(p => map.set(p.account_id, p));
              this.playerProfiles.set(map);
            }
          });
        }

        // Auto-select the highlighted player
        if (playerParam) {
          const pid = Number(playerParam);
          const found = match.players.find(p => p.account_id === pid);
          if (found) this.selectedPlayer.set(found);
        }
      },
      error: () => {
        this.error.set('Failed to load match data.');
        this.loading.set(false);
      }
    });
  }

  selectPlayer(player: MatchPlayer): void {
    this.selectedPlayer.set(player);
  }

  getPlayerName(accountId: number): string {
    const profile = this.playerProfiles().get(accountId);
    return profile?.personaname || `Player ${accountId}`;
  }

  getPlayerAvatar(accountId: number): string {
    return this.playerProfiles().get(accountId)?.avatarmedium || '';
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

  isSelected(player: MatchPlayer): boolean {
    return this.selectedPlayer()?.account_id === player.account_id;
  }

  isWinningTeam(team: number): boolean {
    return this.winningTeam() === team;
  }

  selectedPlayerWon(): boolean {
    const p = this.selectedPlayer();
    if (!p) return false;
    return p.team === this.winningTeam();
  }
}
