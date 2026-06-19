/**
 * Enemy Ability System
 *
 * Handles enemy abilities for the Passage Through Mirkwood scenario.
 *
 * Enemy Ability Types:
 * - when_engaged: Forced effect after enemy engages a player
 * - when_revealed: Effect when enemy is revealed from encounter deck
 * - when_attacks: Effect when enemy attacks (deal additional shadow cards)
 * - constant: Passive modifier while enemy is in play
 * - end_of_combat: Effect at end of combat phase (e.g., staging area attacks)
 */

import type { GameState, EncounterCard, ActiveEnemy } from './types';

// ── Enemy Ability Types ──────────────────────────────────────────────────────

export const EnemyAbilityType = {
    WhenEngaged: 'when_engaged',     // Forced: After engages player
    WhenRevealed: 'when_revealed',   // When Revealed from encounter deck
    WhenAttacks: 'when_attacks',     // When enemy attacks (modify shadow cards)
    Constant: 'constant',            // Passive modifier while in play
    EndOfCombat: 'end_of_combat',    // End of combat phase trigger
} as const;
export type EnemyAbilityType = (typeof EnemyAbilityType)[keyof typeof EnemyAbilityType];

export interface EnemyAbilityResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    /** Additional shadow cards to deal (for when_attacks) */
    additionalShadowCards?: number;
    /** Attack modifier for this enemy */
    attackModifier?: number;
}

export interface EnemyAbility {
    code: string;
    name: string;
    type: EnemyAbilityType;
    description: string;
    /** Execute the ability effect */
    execute: (state: GameState, enemy: EncounterCard | ActiveEnemy, playerId: string) => EnemyAbilityResult;
}

// ── Helper Functions ─────────────────────────────────────────────────────────
// (Per-card helpers now live in the individual card modules under
//  `src/engine/cards/01/`.)

// ── Enemy Ability Registry ───────────────────────────────────────────────────

const enemyAbilityRegistry: Map<string, EnemyAbility[]> = new Map();

export function registerEnemyAbility(ability: EnemyAbility): void {
    const existing = enemyAbilityRegistry.get(ability.code) ?? [];
    existing.push(ability);
    enemyAbilityRegistry.set(ability.code, existing);
}

export function getEnemyAbilities(code: string): EnemyAbility[] {
    return enemyAbilityRegistry.get(code) ?? [];
}

export function hasEnemyAbility(code: string, type: EnemyAbilityType): boolean {
    const abilities = getEnemyAbilities(code);
    return abilities.some((a) => a.type === type);
}

export function getEnemyAbilityByType(code: string, type: EnemyAbilityType): EnemyAbility | undefined {
    const abilities = getEnemyAbilities(code);
    return abilities.find((a) => a.type === type);
}

// ── Enemy Ability Definitions ────────────────────────────────────────────────
//
// Enemy card abilities live in standalone per-card modules under
// `src/engine/cards/01/` (e.g. `01074-king-spider.ts`, `01096-forest-spider.ts`),
// registered via `registerEnemyAbility`. The barrel `src/engine/cards/index.ts`
// imports them for their side-effects. This file retains only the shared
// machinery (registry, types, and resolution functions) below.

// ── Main Resolution Functions ────────────────────────────────────────────────

/**
 * Resolve "When Engaged" effect for an enemy.
 * Called after enemy engages a player.
 */
export function resolveWhenEngaged(
    state: GameState,
    enemy: EncounterCard | ActiveEnemy,
    playerId: string
): EnemyAbilityResult {
    const code = 'card' in enemy ? enemy.card.code : enemy.code;
    const ability = getEnemyAbilityByType(code, EnemyAbilityType.WhenEngaged);

    if (!ability) {
        return { state, log: [], success: true };
    }

    return ability.execute(state, enemy, playerId);
}

/**
 * Resolve "When Revealed" effect for an enemy.
 * Called when enemy is revealed from encounter deck during staging.
 */
export function resolveEnemyWhenRevealed(
    state: GameState,
    enemy: EncounterCard,
    playerId: string
): EnemyAbilityResult {
    const ability = getEnemyAbilityByType(enemy.code, EnemyAbilityType.WhenRevealed);

    if (!ability) {
        return { state, log: [], success: true };
    }

    return ability.execute(state, enemy, playerId);
}

/**
 * Get the number of additional shadow cards for an attacking enemy.
 * Used during combat to deal extra shadow cards.
 */
export function getAdditionalShadowCards(_enemy: ActiveEnemy): number {
    // Future: Check for abilities like Ungoliant's Spawn, Dol Guldur Beastmaster
    // that deal additional shadow cards
    return 0;
}

/**
 * Get the attack modifier for an engaged enemy.
 * Includes bonuses from abilities like Forest Spider's +1.
 */
export function getEnemyAttackModifier(enemy: ActiveEnemy): number {
    return enemy.attackBonus ?? 0;
}

/**
 * Get total attack value for an enemy including modifiers.
 */
export function getEnemyTotalAttack(enemy: ActiveEnemy): number {
    const baseAttack = enemy.card.attack ?? 0;
    const modifier = getEnemyAttackModifier(enemy);
    return baseAttack + modifier;
}

/**
 * Resolve end-of-combat effects for enemies.
 * Called at the end of the combat phase.
 */
export function resolveEndOfCombatEffects(state: GameState): EnemyAbilityResult {
    const logs: string[] = [];
    let updatedState = state;

    // Check all enemies for end_of_combat abilities
    // Currently only Chieftain Ufthak has this
    for (const item of state.stagingArea) {
        const code = 'card' in item ? item.card.code : item.code;
        const ability = getEnemyAbilityByType(code, EnemyAbilityType.EndOfCombat);

        if (ability) {
            const result = ability.execute(updatedState, item as EncounterCard, '');
            updatedState = result.state;
            logs.push(...result.log);
        }
    }

    return {
        state: updatedState,
        log: logs,
        success: true,
    };
}

/**
 * Clear round-based attack bonuses from engaged enemies.
 * Called at the end of the round during refresh phase.
 */
export function clearRoundBasedModifiers(state: GameState): GameState {
    return {
        ...state,
        players: state.players.map((p) => ({
            ...p,
            engagedEnemies: p.engagedEnemies.map((e) => ({
                ...e,
                attackBonus: 0,
            })),
        })),
    };
}

/**
 * Check if an enemy has a specific ability type.
 */
export function enemyHasAbility(code: string, type: EnemyAbilityType): boolean {
    return hasEnemyAbility(code, type);
}

/**
 * Get all enemies in staging area with end_of_combat abilities.
 */
export function getEnemiesWithEndOfCombatAbility(state: GameState): EncounterCard[] {
    return state.stagingArea
        .filter((item) => {
            const code = 'card' in item ? item.card.code : item.code;
            return hasEnemyAbility(code, EnemyAbilityType.EndOfCombat);
        })
        .map((item) => ('card' in item ? item.card : item) as EncounterCard);
}
