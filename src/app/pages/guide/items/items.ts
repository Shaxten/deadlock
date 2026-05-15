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

    // Only show real purchasable upgrades — exclude internal/disabled items
    items = items.filter(i =>
      i.type === 'upgrade' &&
      i.cost && i.cost > 0 &&
      (i.item_tier ?? 0) < 5 &&
      !!(i.shop_image_webp || i.shop_image) &&  // must have a shop icon
      !i.class_name.startsWith('upgrade_imbued') &&
      !i.class_name.startsWith('item_projectile') &&
      !i.class_name.startsWith('armor_upgrade') &&
      !i.class_name.startsWith('weapon_upgrade') &&
      !i.class_name.startsWith('tech_upgrade')
    );

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
    const raw = d.desc || d.passive || d.active || '';
    // Strip all HTML tags (spans, SVGs, etc.) and clean up whitespace
    return raw
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')  // remove SVG blocks entirely
      .replace(/<[^>]+>/g, '')               // remove remaining HTML tags
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')                  // collapse whitespace
      .trim();
  }

  getKeyProperties(item: ItemInfo): { name: string; value: string; icon?: string }[] {
    if (!item.properties) return [];

    // Skip these internal/technical properties that aren't meaningful to display
    const skipKeys = new Set([
      'AbilityPostCastDuration', 'AbilityResourceCost', 'AbilityUnitTargetLimit',
      'ChannelMoveSpeed', 'AbilityCastDelay', 'TickRate', 'BounceGrace',
      'BounceLinger', 'NextTargetDuration', 'PriorityBounceRadius',
      'ClimbHeight', 'PostExplosionDuration', 'PreExplosionDuration',
      'BuffDelay', 'ExplosionInterval', 'MeleeHalfAngle', 'ExtraSweepRadius'
    ]);

    return Object.entries(item.properties)
      .filter(([key, prop]: [string, any]) => {
        if (skipKeys.has(key)) return false;
        const val = prop?.value;
        if (val == null || val === '' || val === '0' || val === 0) return false;
        // Skip disable_value matches
        if (prop.disable_value != null && String(val) === String(prop.disable_value)) return false;
        // Must have a label to be meaningful
        if (!prop.label) return false;
        return true;
      })
      .map(([key, prop]: [string, any]) => {
        const prefix = prop.prefix ? prop.prefix.replace('{s:sign}', '+') : '';
        const postfix = prop.postfix || '';
        const value = `${prefix}${prop.value}${postfix}`;
        return {
          name: prop.label || this.formatPropertyName(key),
          value,
          icon: prop.icon
        };
      });
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
