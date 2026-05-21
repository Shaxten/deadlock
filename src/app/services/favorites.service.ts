import { Injectable, signal } from '@angular/core';

export interface FavoritePlayer {
  account_id: number;
  personaname: string;
  avatarmedium: string;
  addedAt: number;
}

const FAVORITES_KEY = 'deadlock_favorites';
const RECENTS_KEY = 'deadlock_recents';
const MAX_RECENTS = 8;

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _favorites = signal<FavoritePlayer[]>(this.loadKey(FAVORITES_KEY));
  private _recents = signal<FavoritePlayer[]>(this.loadKey(RECENTS_KEY));

  readonly favorites = this._favorites.asReadonly();
  readonly recents = this._recents.asReadonly();

  private loadKey(key: string): FavoritePlayer[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveKey(key: string, data: FavoritePlayer[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }

  // ── Favorites ──────────────────────────────────────────────────────────────

  isFavorite(accountId: number): boolean {
    return this._favorites().some(f => f.account_id === accountId);
  }

  add(player: FavoritePlayer): void {
    if (this.isFavorite(player.account_id)) return;
    const updated = [...this._favorites(), { ...player, addedAt: Date.now() }];
    this._favorites.set(updated);
    this.saveKey(FAVORITES_KEY, updated);
  }

  remove(accountId: number): void {
    const updated = this._favorites().filter(f => f.account_id !== accountId);
    this._favorites.set(updated);
    this.saveKey(FAVORITES_KEY, updated);
  }

  toggle(player: FavoritePlayer): void {
    if (this.isFavorite(player.account_id)) {
      this.remove(player.account_id);
    } else {
      this.add(player);
    }
  }

  // ── Recents ────────────────────────────────────────────────────────────────

  addRecent(player: FavoritePlayer): void {
    // Remove if already present (move to front)
    const filtered = this._recents().filter(r => r.account_id !== player.account_id);
    const updated = [{ ...player, addedAt: Date.now() }, ...filtered].slice(0, MAX_RECENTS);
    this._recents.set(updated);
    this.saveKey(RECENTS_KEY, updated);
  }

  removeRecent(accountId: number): void {
    const updated = this._recents().filter(r => r.account_id !== accountId);
    this._recents.set(updated);
    this.saveKey(RECENTS_KEY, updated);
  }

  clearRecents(): void {
    this._recents.set([]);
    this.saveKey(RECENTS_KEY, []);
  }
}
