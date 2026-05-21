import { Injectable, signal } from '@angular/core';

export interface FavoritePlayer {
  account_id: number;
  personaname: string;
  avatarmedium: string;
  addedAt: number;
}

const STORAGE_KEY = 'deadlock_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _favorites = signal<FavoritePlayer[]>(this.load());

  readonly favorites = this._favorites.asReadonly();

  private load(): FavoritePlayer[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(favs: FavoritePlayer[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
    } catch {}
  }

  isFavorite(accountId: number): boolean {
    return this._favorites().some(f => f.account_id === accountId);
  }

  add(player: FavoritePlayer): void {
    if (this.isFavorite(player.account_id)) return;
    const updated = [...this._favorites(), { ...player, addedAt: Date.now() }];
    this._favorites.set(updated);
    this.save(updated);
  }

  remove(accountId: number): void {
    const updated = this._favorites().filter(f => f.account_id !== accountId);
    this._favorites.set(updated);
    this.save(updated);
  }

  toggle(player: FavoritePlayer): void {
    if (this.isFavorite(player.account_id)) {
      this.remove(player.account_id);
    } else {
      this.add(player);
    }
  }
}
