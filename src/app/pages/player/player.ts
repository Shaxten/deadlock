import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { HeroService } from '../../services/hero.service';
import { SteamProfile, PlayerHeroStats, PlayerMatch, HeroInfo } from '../../models/hero.model';

const STEAM_ID_64_BASE = 76561197960265728;

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player.html',
  styleUrl: './player.scss'
})
export class Player implements OnInit {
  private playerService = inject(PlayerService);
  private heroService = inject(HeroService);
  private route = inject(ActivatedRoute);

  searchInput = '';
  loading = signal(false);
  error = signal<string | null>(null);
  profile = signal<SteamProfile | null>(null);
  heroStats = signal<PlayerHeroStats[]>([]);
  matchHistory = signal<PlayerMatch[]>([]);
  heroes = signal<HeroInfo[]>([]);

  heroMap = computed(() => {
    const map = new Map<number, HeroInfo>();
    this.heroes().forEach(h => map.set(h.id, h));
    return map;
  });

  sortedHeroStats = computed(() => {
    return [...this.heroStats()].sort((a, b) => b.matches_played - a.matches_played);
  });

  ngOnInit(): void {
    this.heroService.getHeroes().subscribe(heroes => this.heroes.set(heroes));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.searchInput = idParam;
      this.search();
    }
  }

  async search(): Promise<void> {
    const input = this.searchInput.trim();
    if (!input) return;

    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);
    this.heroStats.set([]);
    this.matchHistory.set([]);

    try {
      const accountId = await this.resolveAccountId(input);
      if (accountId === null) {
        this.error.set('Could not resolve Steam ID. Please check your input.');
        this.loading.set(false);
        return;
      }
      this.loadPlayerData(accountId);
    } catch {
      this.error.set('Failed to resolve Steam ID.');
      this.loading.set(false);
    }
  }

  private resolveAccountId(input: string): Promise<number | null> {
    // Check for steamcommunity.com/id/ vanity URL
    const vanityMatch = input.match(/steamcommunity\.com\/id\/([^/?\s]+)/);
    if (vanityMatch) {
      return new Promise((resolve) => {
        this.playerService.resolveVanityUrl(vanityMatch[1]).subscribe({
          next: (results) => {
            if (results && results.length > 0) {
              resolve(results[0].account_id);
            } else {
              resolve(null);
            }
          },
          error: () => resolve(null)
        });
      });
    }

    // Check for steamcommunity.com/profiles/ URL
    const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d+)/);
    if (profileMatch) {
      const steamId64 = parseInt(profileMatch[1], 10);
      return Promise.resolve(steamId64 - STEAM_ID_64_BASE);
    }

    // Check if it's a number
    const num = parseInt(input, 10);
    if (!isNaN(num)) {
      if (num >= STEAM_ID_64_BASE) {
        // SteamID64
        return Promise.resolve(num - STEAM_ID_64_BASE);
      } else if (num < 1000000000) {
        // SteamID3 account_id
        return Promise.resolve(num);
      }
    }

    // Try as vanity name directly
    return new Promise((resolve) => {
      this.playerService.resolveVanityUrl(input).subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            resolve(results[0].account_id);
          } else {
            resolve(null);
          }
        },
        error: () => resolve(null)
      });
    });
  }

  private loadPlayerData(accountId: number): void {
    forkJoin({
      profile: this.playerService.getSteamProfile(accountId),
      heroStats: this.playerService.getPlayerHeroStats(accountId),
      matchHistory: this.playerService.getPlayerMatchHistory(accountId)
    }).subscribe({
      next: ({ profile, heroStats, matchHistory }) => {
        this.profile.set(profile?.length ? profile[0] : null);
        this.heroStats.set(heroStats || []);
        this.matchHistory.set((matchHistory || []).slice(0, 20));
        this.loading.set(false);

        if (!profile?.length) {
          this.error.set('Player not found.');
        }
      },
      error: () => {
        this.error.set('Failed to load player data. The player may not exist or the API may be unavailable.');
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

  getWinRate(stat: PlayerHeroStats): number {
    if (stat.matches_played === 0) return 0;
    return (stat.wins / stat.matches_played) * 100;
  }

  getKda(stat: PlayerHeroStats): string {
    const avg = (val: number) => (val / Math.max(stat.matches_played, 1)).toFixed(1);
    return `${avg(stat.kills)} / ${avg(stat.deaths)} / ${avg(stat.assists)}`;
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
      year: 'numeric'
    });
  }

  isWin(match: PlayerMatch): boolean {
    return match.match_result === 1;
  }
}
