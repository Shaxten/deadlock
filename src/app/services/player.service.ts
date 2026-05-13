import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SteamProfile, PlayerHeroStats, PlayerMatch } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.deadlock-api.com/v1';

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
