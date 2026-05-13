import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatchMetadata } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.deadlock-api.com/v1';

  getMatchMetadata(matchId: number): Observable<MatchMetadata> {
    return this.http.get<MatchMetadata>(`${this.apiUrl}/matches/${matchId}/metadata`);
  }
}
