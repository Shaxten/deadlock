import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SteamProfile, PlayerHeroStats, PlayerMatch, PlayerRank } from '../models/hero.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBase + '/v1';
  private bucketBase = environment.bucketBase;

  // Rank names indexed by division (0-11)
  readonly rankNames = [
    'Obscurus', 'Initiate', 'Seeker', 'Alchemist', 'Arcanist',
    'Ritualist', 'Emissary', 'Archon', 'Oracle', 'Phantom',
    'Ascendant', 'Eternus'
  ];

  getRankImageUrl(division: number, subrank?: number): string {
    const tier = Math.max(0, Math.min(division, 11));
    if (subrank && subrank >= 1 && subrank <= 6) {
      return `${this.bucketBase}/assets-api-res/images/ranks/rank${tier}/badge_sm_subrank${subrank}.webp`;
    }
    return `${this.bucketBase}/assets-api-res/images/ranks/rank${tier}/badge_sm.webp`;
  }

  getRankName(division: number): string {
    return this.rankNames[Math.max(0, Math.min(division, 11))] || 'Unknown';
  }

  getMmrHistory(accountId: number): Observable<PlayerRank[]> {
    return this.http.get<PlayerRank[]>(`${this.apiUrl}/players/${accountId}/mmr-history`);
  }

  getBatchMmr(accountIds: number[]): Observable<PlayerRank[]> {
    return this.http.get<PlayerRank[]>(`${this.apiUrl}/players/mmr`, {
      params: { account_ids: accountIds.join(',') }
    });
  }

  getSteamProfile(accountId: number): Observable<SteamProfile[]> {
    return this.http.get<SteamProfile[]>(`${this.apiUrl}/players/steam`, {
      params: { account_ids: accountId.toString() }
    });
  }

  getSteamProfiles(accountIds: number[]): Observable<SteamProfile[]> {
    return this.http.get<SteamProfile[]>(`${this.apiUrl}/players/steam`, {
      params: { account_ids: accountIds.join(',') }
    });
  }

  getPlayerHeroStats(accountId: number): Observable<PlayerHeroStats[]> {
    return this.http.get<PlayerHeroStats[]>(`${this.apiUrl}/players/hero-stats`, {
      params: { account_ids: accountId.toString() }
    });
  }

  getPlayerMatchHistory(accountId: number): Observable<PlayerMatch[]> {
    return this.http.get<PlayerMatch[]>(`${this.apiUrl}/players/${accountId}/match-history`);
  }

  resolveVanityUrl(vanityName: string): Observable<SteamProfile[]> {
    return this.http.get<SteamProfile[]>(`${this.apiUrl}/players/steam-search`, {
      params: { search_query: vanityName }
    });
  }
}
