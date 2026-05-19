import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { HeroService } from '../../services/hero.service';
import { SteamProfile, PlayerHeroStats, PlayerMatch, HeroInfo, PlayerRank } from '../../models/hero.model';

const STEAM_ID_64_BASE = BigInt('76561197960265728');

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './player.html',
  styleUrl: './player.scss'
})
export class Player implements OnInit {
  private playerService = inject(PlayerService);
  private heroService = inject(HeroService);
  private route = inject(ActivatedRoute);

  searchInput = '';
  loading = signal(false);
  searching = signal(false);
  error = signal<string | null>(null);
  searchResults = signal<SteamProfile[]>([]);
  profile = signal<SteamProfile | null>(null);
  heroStats = signal<PlayerHeroStats[]>([]);
  matchHistory = signal<PlayerMatch[]>([]);
  heroes = signal<HeroInfo[]>([]);
  currentRank = signal<PlayerRank | null>(null);

  heroMap = computed(() => {
    const map = new Map<number, HeroInfo>();
    this.heroes().forEach(h => map.set(h.id, h));
    return map;
  });

  sortedHeroStats = computed(() => {
    return [...this.heroStats()].sort((a, b) => b.matches_played - a.matches_played);
  });

  // Performance Insights
  avgSoulsPerMin = computed(() => {
    const matches = this.matchHistory();
    if (matches.length === 0) return 0;
    const total = matches.reduce((sum, m) => sum + (m.net_worth / Math.max(m.match_duration_s / 60, 1)), 0);
    return total / matches.length;
  });

  avgKills = computed(() => {
    const matches = this.matchHistory();
    if (matches.length === 0) return 0;
    return matches.reduce((sum, m) => sum + m.player_kills, 0) / matches.length;
  });

  avgDeaths = computed(() => {
    const matches = this.matchHistory();
    if (matches.length === 0) return 0;
    return matches.reduce((sum, m) => sum + m.player_deaths, 0) / matches.length;
  });

  avgAssists = computed(() => {
    const matches = this.matchHistory();
    if (matches.length === 0) return 0;
    return matches.reduce((sum, m) => sum + m.player_assists, 0) / matches.length;
  });

  lowPerformanceMatches = computed(() => {
    const matches = this.matchHistory();
    const avgSpm = this.avgSoulsPerMin();
    const avgD = this.avgDeaths();
    if (matches.length === 0 || avgSpm === 0) return [];

    return matches
      .map(m => {
        const soulsPerMin = m.net_worth / Math.max(m.match_duration_s / 60, 1);
        const isBelowAvgSpm = soulsPerMin < avgSpm * 0.75;
        const isHighDeaths = m.player_deaths > avgD * 1.5;
        return {
          match: m,
          soulsPerMin,
          isBelowAvgSpm,
          isHighDeaths,
          flagged: isBelowAvgSpm || isHighDeaths
        };
      })
      .filter(entry => entry.flagged);
  });

  ngOnInit(): void {
    this.heroService.getHeroes().subscribe(heroes => this.heroes.set(heroes));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.searchInput = idParam;
      this.search();
    }
  }

  search(): void {
    const input = this.searchInput.trim();
    if (!input) return;

    this.error.set(null);
    this.searchResults.set([]);
    this.profile.set(null);
    this.heroStats.set([]);
    this.matchHistory.set([]);

    // Try to parse as a direct ID or profile URL first
    const directId = this.parseDirectId(input);
    if (directId !== null) {
      this.loading.set(true);
      this.loadPlayerData(directId);
      return;
    }

    // Otherwise search by name — show results list
    this.searching.set(true);
    const vanityMatch = input.match(/steamcommunity\.com\/id\/([^/?\s]+)/);
    const query = vanityMatch ? vanityMatch[1] : input;

    this.playerService.resolveVanityUrl(query).subscribe({
      next: (results) => {
        this.searching.set(false);
        if (results && results.length > 0) {
          this.searchResults.set(results);
        } else {
          this.error.set('No players found. Try a Steam ID or profile URL instead.');
        }
      },
      error: () => {
        this.searching.set(false);
        this.error.set('Search failed. Try pasting a Steam profile URL or ID directly.');
      }
    });
  }

  selectProfile(profile: SteamProfile): void {
    this.searchResults.set([]);
    this.loading.set(true);
    this.loadPlayerData(profile.account_id);
  }

  private parseDirectId(input: string): number | null {
    // steamcommunity.com/profiles/STEAMID64
    const profileMatch = input.match(/steamcommunity\.com\/profiles\/(\d+)/);
    if (profileMatch) {
      try {
        const steamId64 = BigInt(profileMatch[1]);
        const accountId = Number(steamId64 - STEAM_ID_64_BASE);
        if (accountId > 0) return accountId;
      } catch {
        return null;
      }
    }

    // Pure number input
    if (/^\d+$/.test(input)) {
      try {
        const num = BigInt(input);
        if (num >= STEAM_ID_64_BASE) {
          return Number(num - STEAM_ID_64_BASE);
        }
        const small = Number(num);
        if (small > 0 && small < 2000000000) {
          return small;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private loadPlayerData(accountId: number): void {
    forkJoin({
      profile: this.playerService.getSteamProfile(accountId),
      heroStats: this.playerService.getPlayerHeroStats(accountId),
      matchHistory: this.playerService.getPlayerMatchHistory(accountId),
      mmr: this.playerService.getMmrHistory(accountId)
    }).subscribe({
      next: ({ profile, heroStats, matchHistory, mmr }) => {
        this.profile.set(profile?.length ? profile[0] : null);
        this.heroStats.set(heroStats || []);
        this.matchHistory.set((matchHistory || []).slice(0, 20));
        // Get the most recent rank entry
        if (mmr && mmr.length > 0) {
          const sorted = [...mmr].sort((a, b) => b.start_time - a.start_time);
          this.currentRank.set(sorted[0]);
        } else {
          this.currentRank.set(null);
        }
        this.loading.set(false);

        if (!profile?.length) {
          this.error.set('Player not found. They may not have played Deadlock.');
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
    return match.player_team === match.match_result;
  }

  getRankName(): string {
    const r = this.currentRank();
    if (!r) return '';
    return this.playerService.getRankName(r.division);
  }

  getRankImage(): string {
    const r = this.currentRank();
    if (!r) return '';
    return this.playerService.getRankImageUrl(r.division, r.division_tier);
  }

  getRankLabel(): string {
    const r = this.currentRank();
    if (!r) return '';
    return `${this.playerService.getRankName(r.division)} ${r.division_tier}`;
  }
}
