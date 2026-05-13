import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MatchMetadata, MatchPlayer } from '../models/hero.model';

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
    // The API may return players at different levels depending on version
    let players: MatchPlayer[] = [];

    if (Array.isArray(raw.players)) {
      players = raw.players;
    } else if (raw.match_players && Array.isArray(raw.match_players)) {
      players = raw.match_players;
    } else {
      // Try to find players in nested structures
      // Some responses have teams[0].players and teams[1].players
      if (raw.teams && Array.isArray(raw.teams)) {
        for (const team of raw.teams) {
          if (team.players && Array.isArray(team.players)) {
            players.push(...team.players.map((p: any) => ({ ...p, team: team.team_id ?? team.team ?? 0 })));
          }
        }
      }
    }

    const matchInfo = raw.match_info || {
      duration_s: raw.duration_s || raw.match_duration_s || 0,
      match_mode: raw.match_mode || 0,
      game_mode: raw.game_mode || 0,
      start_time: raw.start_time || 0,
      winning_team: raw.winning_team ?? raw.match_info?.winning_team ?? -1
    };

    return {
      match_info: matchInfo,
      players
    };
  }
}
