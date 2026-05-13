import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MatchMetadata, MatchPlayer, PlayerStatSnapshot, PlayerItemPurchase } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.deadlock-api.com/v1';

  getMatchMetadata(matchId: number): Observable<MatchMetadata> {
    return this.http.get<any>(`${this.apiUrl}/matches/${matchId}/metadata`).pipe(
      map(raw => this.normalizeMetadata(raw))
    );
  }

  private normalizeMetadata(raw: any): MatchMetadata {
    const matchInfo = raw.match_info || {};
    const rawPlayers: any[] = matchInfo.players || raw.players || [];

    const players: MatchPlayer[] = rawPlayers.map((p: any) => {
      const finalStats = p.stats?.length ? p.stats[p.stats.length - 1] : {};

      // Extract stats timeline
      const statsTimeline: PlayerStatSnapshot[] = (p.stats || []).map((s: any) => ({
        time_stamp_s: s.time_stamp_s || 0,
        net_worth: s.net_worth || 0,
        kills: s.kills || 0,
        deaths: s.deaths || 0,
        assists: s.assists || 0
      }));

      // Extract items (only non-sold items or all purchased)
      const itemsPurchased: PlayerItemPurchase[] = (p.items || []).map((i: any) => ({
        game_time_s: i.game_time_s || 0,
        item_id: i.item_id || 0,
        sold_time_s: i.sold_time_s || 0
      }));

      // Extract death times from death_details
      const deathTimes: number[] = (p.death_details || []).map((d: any) => d.game_time_s || 0);

      return {
        account_id: p.account_id || 0,
        player_slot: p.player_slot || 0,
        team: p.team ?? 0,
        hero_id: p.hero_id || 0,
        kills: p.kills ?? finalStats.kills ?? 0,
        deaths: p.deaths ?? finalStats.deaths ?? 0,
        assists: p.assists ?? finalStats.assists ?? 0,
        net_worth: p.net_worth ?? finalStats.net_worth ?? 0,
        last_hits: p.last_hits ?? finalStats.creep_kills ?? 0,
        denies: p.denies ?? finalStats.denies ?? 0,
        player_level: p.level ?? finalStats.level ?? 0,
        gold_player: finalStats.gold_player ?? 0,
        gold_player_orbs: finalStats.gold_player_orbs ?? 0,
        gold_lane_creep_orbs: finalStats.gold_lane_creep_orbs ?? 0,
        gold_neutral_creep_orbs: finalStats.gold_neutral_creep_orbs ?? 0,
        gold_boss: finalStats.gold_boss ?? 0,
        assigned_lane: p.assigned_lane ?? 0,
        player_damage: finalStats.player_damage ?? 0,
        player_healing: finalStats.player_healing ?? 0,
        damage_taken: finalStats.player_damage_taken ?? 0,
        stats_timeline: statsTimeline,
        items_purchased: itemsPurchased,
        death_times: deathTimes
      };
    });

    return {
      match_info: {
        duration_s: matchInfo.duration_s || 0,
        match_mode: matchInfo.match_mode || 0,
        game_mode: matchInfo.game_mode || 0,
        start_time: matchInfo.start_time || 0,
        winning_team: matchInfo.winning_team ?? -1
      },
      players
    };
  }
}
