import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchService } from '../../services/match.service';
import { HeroService } from '../../services/hero.service';
import { PlayerService } from '../../services/player.service';
import { MatchMetadata, MatchPlayer, HeroInfo, SteamProfile, ItemInfo } from '../../models/hero.model';

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
  allItems = signal<Map<number, ItemInfo>>(new Map());
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
      heroes: this.heroService.getHeroes(),
      items: this.heroService.getItems()
    }).subscribe({
      next: ({ match, heroes, items }) => {
        this.matchData.set(match);
        this.heroes.set(heroes);

        const itemMap = new Map<number, ItemInfo>();
        items.forEach(i => itemMap.set(i.id, i));
        this.allItems.set(itemMap);

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

  // Get items still owned at end of match (not sold)
  getPlayerItems(player: MatchPlayer): ItemInfo[] {
    const itemMap = this.allItems();
    return player.items_purchased
      .filter(i => i.sold_time_s === 0 && i.item_id > 0)
      .map(i => itemMap.get(i.item_id))
      .filter((i): i is ItemInfo => !!i && i.type === 'upgrade')
      .slice(0, 10);
  }

  getItemSlotClass(item: ItemInfo): string {
    if (item.item_slot_type === 'weapon') return 'slot-weapon';
    if (item.item_slot_type === 'spirit') return 'slot-spirit';
    if (item.item_slot_type === 'vitality') return 'slot-vitality';
    return '';
  }

  // Death timing analysis
  getDeathAnalysis(player: MatchPlayer): { time: string; period: string; isClustered: boolean }[] {
    return player.death_times.map((t, i, arr) => {
      const mins = Math.floor(t / 60);
      const secs = t % 60;
      const time = `${mins}:${secs.toString().padStart(2, '0')}`;
      let period = 'Mid Game';
      if (t < 600) period = 'Early Game';
      else if (t > 1500) period = 'Late Game';

      // Check if deaths are clustered (within 120s of another death)
      const isClustered = arr.some((other, j) => j !== i && Math.abs(other - t) < 120);
      return { time, period, isClustered };
    });
  }

  // Soul progression analysis - find weak periods
  getSoulAnalysis(player: MatchPlayer): { period: string; soulsPerMin: number; barWidth: number; isWeak: boolean }[] {
    const timeline = player.stats_timeline;
    if (timeline.length < 2) return [];

    const segments: { period: string; soulsPerMin: number; barWidth: number; isWeak: boolean }[] = [];
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1];
      const curr = timeline[i];
      const timeDiffMin = (curr.time_stamp_s - prev.time_stamp_s) / 60;
      const soulGain = curr.net_worth - prev.net_worth;
      const soulsPerMin = timeDiffMin > 0 ? soulGain / timeDiffMin : 0;

      const startMin = Math.floor(prev.time_stamp_s / 60);
      const endMin = Math.floor(curr.time_stamp_s / 60);
      const period = `${startMin}:00 - ${endMin}:00`;

      segments.push({ period, soulsPerMin, barWidth: 0, isWeak: false });
    }

    // Calculate average and flag weak periods
    const avgSpm = segments.reduce((s, seg) => s + seg.soulsPerMin, 0) / segments.length;
    const maxSpm = Math.max(...segments.map(s => s.soulsPerMin), 1);
    segments.forEach(seg => {
      seg.isWeak = seg.soulsPerMin < avgSpm * 0.6;
      seg.barWidth = Math.min((seg.soulsPerMin / maxSpm) * 100, 100);
    });

    return segments;
  }
}
