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

import type { GameState, EncounterCard, PlayerState, ActiveEnemy } from './types';

// ── Enemy Ability Types ──────────────────────────────────────────────────────

export type EnemyAbilityType =
    | 'when_engaged'    // Forced: After engages player
    | 'when_revealed'   // When Revealed from encounter deck
    | 'when_attacks'    // When enemy attacks (modify shadow cards)
    | 'constant'        // Passive modifier while in play
    | 'end_of_combat';  // End of combat phase trigger

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

function getPlayer(state: GameState, playerId: string): PlayerState | undefined {
    return state.players.find((p) => p.id === playerId);
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p
        ),
    };
}

function getPlayerWithHighestThreat(state: GameState): PlayerState | undefined {
    if (state.players.length === 0) return undefined;
    return state.players.reduce((highest, player) =>
        player.threat > highest.threat ? player : highest
    );
}

function countSpidersInPlay(state: GameState): number {
    let count = 0;

    // Count spiders in staging area
    for (const item of state.stagingArea) {
        if ('card' in item) {
            // ActiveEnemy
            if (item.card.traits?.toLowerCase().includes('spider')) count++;
        } else {
            // EncounterCard
            if (item.traits?.toLowerCase().includes('spider')) count++;
        }
    }

    // Count engaged spiders
    for (const player of state.players) {
        for (const enemy of player.engagedEnemies) {
            if (enemy.card.traits?.toLowerCase().includes('spider')) count++;
        }
    }

    return count;
}

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

/**
 * Forest Spider (01096)
 * Forced: After Forest Spider engages a player, it gets +1 Attack until end of round.
 */
registerEnemyAbility({
    code: '01096',
    name: 'Forest Spider',
    type: 'when_engaged',
    description: 'Gets +1 Attack until end of round.',
    execute: (state, enemy, playerId) => {
        const enemyName = 'card' in enemy ? enemy.card.name : enemy.name;
        const logs: string[] = [
            `Forced: ${enemyName} engages ${playerId} - gets +1 Attack until end of round.`
        ];

        // Track the attack bonus on the ActiveEnemy
        // We'll mark this by adding to a round-based modifier tracking
        // For now, we track engaged enemies with attack boost
        const updatedPlayers = state.players.map((p) => {
            if (p.id !== playerId) return p;

            return {
                ...p,
                engagedEnemies: p.engagedEnemies.map((e) => {
                    const code = 'card' in enemy ? enemy.card.code : enemy.code;
                    if (e.card.code === code) {
                        return {
                            ...e,
                            attackBonus: (e.attackBonus ?? 0) + 1,
                        };
                    }
                    return e;
                }),
            };
        });

        return {
            state: { ...state, players: updatedPlayers },
            log: logs,
            success: true,
            attackModifier: 1,
        };
    },
});

/**
 * King Spider (01074)
 * When Revealed: Each player must choose and exhaust 1 character he controls.
 */
registerEnemyAbility({
    code: '01074',
    name: 'King Spider',
    type: 'when_revealed',
    description: 'Each player must choose and exhaust 1 character he controls.',
    execute: (state, enemy, _playerId) => {
        const logs: string[] = [`When Revealed: King Spider - Each player must exhaust 1 character.`];

        let updatedState = state;

        // For each player, exhaust first ready character (hero first, then ally)
        for (const player of state.players) {
            // Find first ready hero
            const readyHeroIndex = player.heroes.findIndex((h) => !h.exhausted);
            if (readyHeroIndex !== -1) {
                const hero = player.heroes[readyHeroIndex];
                logs.push(`${player.name} exhausts ${hero.name}.`);
                updatedState = updatePlayer(updatedState, player.id, {
                    heroes: player.heroes.map((h, i) =>
                        i === readyHeroIndex ? { ...h, exhausted: true } : h
                    ),
                });
                continue;
            }

            // Find first ready ally
            const readyAllyIndex = player.allies.findIndex((a) => !a.exhausted);
            if (readyAllyIndex !== -1) {
                const ally = player.allies[readyAllyIndex];
                logs.push(`${player.name} exhausts ${ally.name}.`);
                updatedState = updatePlayer(updatedState, player.id, {
                    allies: player.allies.map((a, i) =>
                        i === readyAllyIndex ? { ...a, exhausted: true } : a
                    ),
                });
                continue;
            }

            logs.push(`${player.name} has no ready characters to exhaust.`);
        }

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});

/**
 * Hummerhorns (01075)
 * Forced: After Hummerhorns engages a player, deal 5 damage to a hero.
 */
registerEnemyAbility({
    code: '01075',
    name: 'Hummerhorns',
    type: 'when_engaged',
    description: 'Deal 5 damage to a single hero controlled by that player.',
    execute: (state, enemy, playerId) => {
        const logs: string[] = [`Forced: Hummerhorns engages ${playerId} - deal 5 damage to a hero.`];

        const player = getPlayer(state, playerId);
        if (!player || player.heroes.length === 0) {
            return {
                state,
                log: [...logs, 'No heroes to damage.'],
                success: true,
            };
        }

        // Deal 5 damage to first hero (should be player choice in full implementation)
        const targetHero = player.heroes[0];
        const newDamage = targetHero.damage + 5;
        const isDefeated = newDamage >= (targetHero.health ?? 99);

        logs.push(`${targetHero.name} takes 5 damage (now ${newDamage}/${targetHero.health}).`);
        if (isDefeated) {
            logs.push(`${targetHero.name} is defeated!`);
        }

        const updatedState = updatePlayer(state, playerId, {
            heroes: player.heroes.map((h) =>
                h.code === targetHero.code ? { ...h, damage: newDamage } : h
            ),
        });

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});

/**
 * Ungoliant's Spawn (01076)
 * When Revealed: Each player must raise his threat by 4 for each Spider card in play.
 */
registerEnemyAbility({
    code: '01076',
    name: "Ungoliant's Spawn",
    type: 'when_revealed',
    description: 'Each player raises threat by 4 for each Spider in play.',
    execute: (state, enemy, _playerId) => {
        const spiderCount = countSpidersInPlay(state);
        const threatIncrease = 4 * spiderCount;

        const logs: string[] = [
            `When Revealed: Ungoliant's Spawn - ${spiderCount} Spider(s) in play.`,
            `Each player raises threat by ${threatIncrease}.`
        ];

        let updatedState = state;

        for (const player of state.players) {
            const newThreat = player.threat + threatIncrease;
            logs.push(`${player.name}: threat ${player.threat} → ${newThreat}`);

            updatedState = updatePlayer(updatedState, player.id, {
                threat: newThreat,
            });

            // Check for threat elimination
            if (newThreat >= 50) {
                logs.push(`${player.name} has been eliminated (threat ≥ 50)!`);
            }
        }

        // Check if all players eliminated
        const allEliminated = updatedState.players.every((p) => p.threat >= 50);
        if (allEliminated) {
            updatedState = { ...updatedState, phase: 'game_over' };
            logs.push('All players eliminated by threat! GAME OVER.');
        }

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});

/**
 * Chieftain Ufthak (01098)
 * Forced: At the end of the combat phase, if Chieftain Ufthak is in the staging area,
 * he makes an immediate attack against the player with the highest threat.
 *
 * Note: This is an end_of_combat trigger, handled separately.
 */
registerEnemyAbility({
    code: '01098',
    name: 'Chieftain Ufthak',
    type: 'end_of_combat',
    description: 'If in staging area at end of combat, attacks highest threat player.',
    execute: (state, enemy, _playerId) => {
        const logs: string[] = [];

        // Check if Chieftain Ufthak is in staging area
        const inStaging = state.stagingArea.some((item) => {
            if ('card' in item) return item.card.code === '01098';
            return item.code === '01098';
        });

        if (!inStaging) {
            return {
                state,
                log: [],
                success: true,
            };
        }

        const highestThreatPlayer = getPlayerWithHighestThreat(state);
        if (!highestThreatPlayer) {
            return {
                state,
                log: ['Chieftain Ufthak: No players to attack.'],
                success: true,
            };
        }

        logs.push(`Forced: Chieftain Ufthak attacks ${highestThreatPlayer.name} from staging area!`);
        logs.push(`⚠️ Chieftain Ufthak's attack must be resolved manually (not fully automated).`);

        // In a full implementation, this would initiate an attack sequence
        // For now, we log it as a warning for the player to handle

        return {
            state,
            log: logs,
            success: true,
        };
    },
});

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
    const ability = getEnemyAbilityByType(code, 'when_engaged');

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
    const ability = getEnemyAbilityByType(enemy.code, 'when_revealed');

    if (!ability) {
        return { state, log: [], success: true };
    }

    return ability.execute(state, enemy, playerId);
}

/**
 * Get the number of additional shadow cards for an attacking enemy.
 * Used during combat to deal extra shadow cards.
 */
export function getAdditionalShadowCards(enemy: ActiveEnemy): number {
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
        const ability = getEnemyAbilityByType(code, 'end_of_combat');

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
            return hasEnemyAbility(code, 'end_of_combat');
        })
        .map((item) => ('card' in item ? item.card : item) as EncounterCard);
}
