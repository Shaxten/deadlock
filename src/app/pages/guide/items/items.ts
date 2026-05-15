import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../services/hero.service';
import { ItemInfo } from '../../../models/hero.model';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './items.html',
  styleUrl: './items.scss'
})
export class Items implements OnInit {
  private heroService = inject(HeroService);

  allItems = signal<ItemInfo[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedSlot = signal<string>('all');
  selectedTier = signal<number>(0);

  filteredItems = computed(() => {
    let items = this.allItems();
    const query = this.searchQuery().toLowerCase().trim();
    const slot = this.selectedSlot();
    const tier = this.selectedTier();

    // Only show purchasable upgrades (exclude T5 special items)
    items = items.filter(i => i.type === 'upgrade' && i.cost && i.cost > 0 && (i.item_tier ?? 0) < 5);

    if (slot !== 'all') {
      items = items.filter(i => i.item_slot_type === slot);
    }

    if (tier > 0) {
      items = items.filter(i => i.item_tier === tier);
    }

    if (query) {
      items = items.filter(i => {
        if (i.name.toLowerCase().includes(query)) return true;
        if (i.item_slot_type?.toLowerCase().includes(query)) return true;
        // Search in properties
        if (i.properties) {
          const propsStr = JSON.stringify(i.properties).toLowerCase();
          if (propsStr.includes(query)) return true;
          // Also search readable property names
          for (const key of Object.keys(i.properties)) {
            if (this.formatPropertyName(key).toLowerCase().includes(query)) return true;
          }
        }
        // Search in description
        const desc = this.getDescription(i);
        if (desc.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    // Sort by tier then name
    return items.sort((a, b) => {
      if (a.item_tier !== b.item_tier) return (a.item_tier || 0) - (b.item_tier || 0);
      return a.name.localeCompare(b.name);
    });
  });

  ngOnInit(): void {
    this.heroService.getItems().subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setSlot(slot: string): void { this.selectedSlot.set(slot); }
  setTier(tier: number): void { this.selectedTier.set(tier); }

  getItemImage(item: ItemInfo): string {
    return item.shop_image_webp || item.shop_image || item.image_webp || item.image || '';
  }

  getDescription(item: ItemInfo): string {
    const d = (item as any).description;
    if (!d) return '';
    return d.desc || d.passive || d.active || '';
  }

  getKeyProperties(item: ItemInfo): { name: string; value: string }[] {
    if (!item.properties) return [];
    return Object.entries(item.properties)
      .filter(([, prop]: [string, any]) => prop?.value != null && prop.value !== 0 && prop.value !== '')
      .slice(0, 4)
      .map(([key, prop]: [string, any]) => ({
        name: this.formatPropertyName(key),
        value: String(prop.value)
      }));
  }

  formatPropertyName(key: string): string {
    if (key.includes('TechPower') || key.includes('tech_power')) return 'Spirit Power';
    if (key.includes('BulletDamage') || key.includes('bullet_damage')) return 'Bullet Damage';
    if (key.includes('MaxHealth') || key.includes('max_health')) return 'Max Health';
    if (key.includes('BulletArmorDamageReduction')) return 'Bullet Armor';
    if (key.includes('TechArmorDamageReduction')) return 'Spirit Armor';
    if (key.includes('FireRate') || key.includes('fire_rate')) return 'Fire Rate';
    if (key.includes('ClipSize') || key.includes('clip_size')) return 'Clip Size';
    if (key.includes('ReloadTime') || key.includes('reload')) return 'Reload Speed';
    if (key.includes('MoveSpeed') || key.includes('move_speed')) return 'Move Speed';
    if (key.includes('CooldownReduction') || key.includes('cooldown')) return 'Cooldown';
    if (key.includes('Lifesteal') || key.includes('lifesteal')) return 'Lifesteal';
    if (key.includes('HealingOutput') || key.includes('healing')) return 'Healing';
    if (key.includes('Stamina') || key.includes('stamina')) return 'Stamina';
    if (key.includes('AbilityCharges') || key.includes('ability_charges')) return 'Ability Charges';
    if (key.includes('AbilityDuration') || key.includes('ability_duration')) return 'Ability Duration';
    if (key.includes('AbilityRange') || key.includes('ability_range')) return 'Ability Range';
    // Convert PascalCase/camelCase to readable
    const clean = key.replace(/^EAbilityAttribute_/, '').replace(/^m_/, '');
    return clean.replace(/([A-Z])/g, ' $1').trim();
  }

  getTierLabel(tier: number): string {
    return `T${tier}`;
  }

  getSlotColor(slot: string | undefined): string {
    if (slot === 'weapon') return '#f59e0b';
    if (slot === 'spirit') return '#a855f7';
    if (slot === 'vitality') return '#22c55e';
    return '#6b7280';
  }
}
