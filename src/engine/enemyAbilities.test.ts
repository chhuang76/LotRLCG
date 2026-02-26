/**
 * Unit tests for Enemy Ability System
 *
 * Tests:
 * 1. Enemy ability registry
 * 2. When Engaged effects (Forest Spider, Hummerhorns)
 * 3. When Revealed effects (King Spider, Ungoliant's Spawn)
 * 4. End of Combat effects (Chieftain Ufthak)
 * 5. Attack modifiers and clearing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, EncounterCard, ActiveEnemy, PlayerState, Hero } from './types';
import {
    getEnemyAbilities,
    hasEnemyAbility,
    getEnemyAbilityByType,
    resolveWhenEngaged,
    resolveEnemyWhenRevealed,
    resolveEndOfCombatEffects,
    clearRoundBasedModifiers,
    getEnemyAttackModifier,
    getEnemyTotalAttack,
} from './enemyAbilities';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function createHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: '01001',
        name: 'Test Hero',
        type_code: 'hero',
        quantity: 1,
        willpower: 2,
        attack: 3,
        defense: 2,
        health: 5,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 1,
        attachments: [],
        ...overrides,
    };
}

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
    return {
        id: 'player1',
        name: 'Test Player',
        threat: 25,
        hand: [],
        deck: [],
        discard: [],
        heroes: [createHero()],
        allies: [],
        engagedEnemies: [],
        ...overrides,
    };
}

function createEnemy(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: '01000',
        name: 'Test Enemy',
        type_code: 'enemy',
        quantity: 1,
        engagement_cost: 30,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 4,
        ...overrides,
    };
}

function createActiveEnemy(overrides: Partial<ActiveEnemy> = {}): ActiveEnemy {
    return {
        card: createEnemy(),
        damage: 0,
        shadowCards: [],
        engagedPlayerId: 'player1',
        exhausted: false,
        ...overrides,
    };
}

function createGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'encounter',
        round: 1,
        players: [createPlayer()],
        encounterDeck: [],
        encounterDiscard: [],
        stagingArea: [],
        activeLocation: null,
        questDeck: [],
        currentQuest: null,
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
        ...overrides,
    };
}

// ── Test: Enemy Ability Registry ─────────────────────────────────────────────

describe('Enemy Ability Registry', () => {
    it('has Forest Spider registered', () => {
        const abilities = getEnemyAbilities('01096');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Forest Spider');
    });

    it('has King Spider registered', () => {
        const abilities = getEnemyAbilities('01074');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('King Spider');
    });

    it('has Hummerhorns registered', () => {
        const abilities = getEnemyAbilities('01075');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Hummerhorns');
    });

    it("has Ungoliant's Spawn registered", () => {
        const abilities = getEnemyAbilities('01076');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe("Ungoliant's Spawn");
    });

    it('has Chieftain Ufthak registered', () => {
        const abilities = getEnemyAbilities('01098');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Chieftain Ufthak');
    });

    it('returns empty array for unknown enemies', () => {
        const abilities = getEnemyAbilities('unknown');
        expect(abilities).toEqual([]);
    });

    it('can check for ability type', () => {
        expect(hasEnemyAbility('01096', 'when_engaged')).toBe(true);
        expect(hasEnemyAbility('01074', 'when_revealed')).toBe(true);
        expect(hasEnemyAbility('01098', 'end_of_combat')).toBe(true);
    });

    it('can get ability by type', () => {
        const ability = getEnemyAbilityByType('01096', 'when_engaged');
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('+1 Attack');
    });
});

// ── Test: Forest Spider (01096) ──────────────────────────────────────────────

describe('Forest Spider (01096)', () => {
    it('has when_engaged ability type', () => {
        expect(hasEnemyAbility('01096', 'when_engaged')).toBe(true);
    });

    it('gains +1 attack when engaged', () => {
        const enemy = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            attack: 2,
        });
        const activeEnemy = createActiveEnemy({ card: enemy });

        const state = createGameState({
            players: [createPlayer({
                engagedEnemies: [activeEnemy],
            })],
        });

        const result = resolveWhenEngaged(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('+1 Attack'))).toBe(true);
        expect(result.attackModifier).toBe(1);
    });

    it('tracks attack bonus on ActiveEnemy', () => {
        const enemy = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            attack: 2,
        });
        const activeEnemy = createActiveEnemy({ card: enemy });

        const state = createGameState({
            players: [createPlayer({
                engagedEnemies: [activeEnemy],
            })],
        });

        const result = resolveWhenEngaged(state, enemy, 'player1');

        const updatedEnemy = result.state.players[0].engagedEnemies[0];
        expect(updatedEnemy.attackBonus).toBe(1);
    });
});

// ── Test: Hummerhorns (01075) ────────────────────────────────────────────────

describe('Hummerhorns (01075)', () => {
    it('has when_engaged ability type', () => {
        expect(hasEnemyAbility('01075', 'when_engaged')).toBe(true);
    });

    it('deals 5 damage to a hero when engaged', () => {
        const enemy = createEnemy({
            code: '01075',
            name: 'Hummerhorns',
        });

        const hero = createHero({ damage: 0, health: 10 });
        const state = createGameState({
            players: [createPlayer({ heroes: [hero] })],
        });

        const result = resolveWhenEngaged(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('5 damage'))).toBe(true);
        expect(result.state.players[0].heroes[0].damage).toBe(5);
    });

    it('defeats hero if damage exceeds health', () => {
        const enemy = createEnemy({
            code: '01075',
            name: 'Hummerhorns',
        });

        const hero = createHero({ damage: 0, health: 4 });
        const state = createGameState({
            players: [createPlayer({ heroes: [hero] })],
        });

        const result = resolveWhenEngaged(state, enemy, 'player1');

        expect(result.log.some((l) => l.includes('defeated'))).toBe(true);
        expect(result.state.players[0].heroes[0].damage).toBe(5);
    });

    it('succeeds with no heroes (edge case)', () => {
        const enemy = createEnemy({
            code: '01075',
            name: 'Hummerhorns',
        });

        const state = createGameState({
            players: [createPlayer({ heroes: [] })],
        });

        const result = resolveWhenEngaged(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('No heroes'))).toBe(true);
    });
});

// ── Test: King Spider (01074) ────────────────────────────────────────────────

describe('King Spider (01074)', () => {
    it('has when_revealed ability type', () => {
        expect(hasEnemyAbility('01074', 'when_revealed')).toBe(true);
    });

    it('exhausts one character per player', () => {
        const enemy = createEnemy({
            code: '01074',
            name: 'King Spider',
        });

        const hero = createHero({ exhausted: false });
        const state = createGameState({
            players: [createPlayer({ heroes: [hero] })],
        });

        const result = resolveEnemyWhenRevealed(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('exhaust'))).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(true);
    });

    it('exhausts ally if all heroes exhausted', () => {
        const enemy = createEnemy({
            code: '01074',
            name: 'King Spider',
        });

        const hero = createHero({ exhausted: true });
        const ally = {
            code: '01073',
            name: 'Test Ally',
            type_code: 'ally' as const,
            quantity: 1,
            exhausted: false,
            damage: 0,
        };

        const state = createGameState({
            players: [createPlayer({ heroes: [hero], allies: [ally] })],
        });

        const result = resolveEnemyWhenRevealed(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].allies[0].exhausted).toBe(true);
    });

    it('logs when player has no ready characters', () => {
        const enemy = createEnemy({
            code: '01074',
            name: 'King Spider',
        });

        const hero = createHero({ exhausted: true });
        const state = createGameState({
            players: [createPlayer({ heroes: [hero], allies: [] })],
        });

        const result = resolveEnemyWhenRevealed(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('no ready characters'))).toBe(true);
    });
});

// ── Test: Ungoliant's Spawn (01076) ──────────────────────────────────────────

describe("Ungoliant's Spawn (01076)", () => {
    it('has when_revealed ability type', () => {
        expect(hasEnemyAbility('01076', 'when_revealed')).toBe(true);
    });

    it('raises threat by 4 per spider in play', () => {
        const spawn = createEnemy({
            code: '01076',
            name: "Ungoliant's Spawn",
            traits: 'Creature. Spider.',
        });

        // Add another spider to staging area
        const forestSpider = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            traits: 'Creature. Spider.',
        });

        const state = createGameState({
            players: [createPlayer({ threat: 20 })],
            stagingArea: [forestSpider], // 1 spider + Ungoliant's Spawn being revealed = 2
        });

        const result = resolveEnemyWhenRevealed(state, spawn, 'player1');

        expect(result.success).toBe(true);
        // 1 spider in staging (Forest Spider) + 0 engaged = 1 spider
        // Note: Ungoliant's Spawn itself is not yet in play when When Revealed triggers
        expect(result.state.players[0].threat).toBe(24); // 20 + (4 * 1)
    });

    it('causes threat elimination at 50', () => {
        const spawn = createEnemy({
            code: '01076',
            name: "Ungoliant's Spawn",
            traits: 'Creature. Spider.',
        });

        // Multiple spiders in play
        const spider1 = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            traits: 'Creature. Spider.',
        });
        const spider2 = createEnemy({
            code: '01074',
            name: 'King Spider',
            traits: 'Creature. Spider.',
        });

        const state = createGameState({
            players: [createPlayer({ threat: 45 })],
            stagingArea: [spider1, spider2], // 2 spiders = 8 threat raise
        });

        const result = resolveEnemyWhenRevealed(state, spawn, 'player1');

        expect(result.state.players[0].threat).toBe(53); // 45 + (4 * 2) = 53
        expect(result.log.some((l) => l.includes('eliminated'))).toBe(true);
    });

    it('counts engaged spiders', () => {
        const spawn = createEnemy({
            code: '01076',
            name: "Ungoliant's Spawn",
            traits: 'Creature. Spider.',
        });

        const engagedSpider = createActiveEnemy({
            card: createEnemy({
                code: '01096',
                name: 'Forest Spider',
                traits: 'Creature. Spider.',
            }),
        });

        const state = createGameState({
            players: [createPlayer({
                threat: 20,
                engagedEnemies: [engagedSpider],
            })],
            stagingArea: [],
        });

        const result = resolveEnemyWhenRevealed(state, spawn, 'player1');

        expect(result.state.players[0].threat).toBe(24); // 20 + (4 * 1)
    });

    it('causes game over when all players eliminated', () => {
        const spawn = createEnemy({
            code: '01076',
            name: "Ungoliant's Spawn",
            traits: 'Creature. Spider.',
        });

        const spider1 = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            traits: 'Creature. Spider.',
        });

        const state = createGameState({
            players: [createPlayer({ threat: 48 })],
            stagingArea: [spider1], // 1 spider = 4 threat raise
        });

        const result = resolveEnemyWhenRevealed(state, spawn, 'player1');

        expect(result.state.phase).toBe('game_over');
        expect(result.log.some((l) => l.includes('GAME OVER'))).toBe(true);
    });
});

// ── Test: Chieftain Ufthak (01098) ───────────────────────────────────────────

describe('Chieftain Ufthak (01098)', () => {
    it('has end_of_combat ability type', () => {
        expect(hasEnemyAbility('01098', 'end_of_combat')).toBe(true);
    });

    it('attacks from staging area at end of combat', () => {
        const ufthak = createEnemy({
            code: '01098',
            name: 'Chieftain Ufthak',
        });

        const state = createGameState({
            players: [createPlayer({ threat: 30, name: 'Player One' })],
            stagingArea: [ufthak],
        });

        const result = resolveEndOfCombatEffects(state);

        expect(result.success).toBe(true);
        expect(result.log.some((l) => l.includes('attacks'))).toBe(true);
        expect(result.log.some((l) => l.includes('Player One'))).toBe(true);
    });

    it('does nothing if not in staging area', () => {
        const state = createGameState({
            players: [createPlayer()],
            stagingArea: [],
        });

        const result = resolveEndOfCombatEffects(state);

        expect(result.success).toBe(true);
        expect(result.log.length).toBe(0);
    });

    it('attacks player with highest threat', () => {
        const ufthak = createEnemy({
            code: '01098',
            name: 'Chieftain Ufthak',
        });

        const state = createGameState({
            players: [
                createPlayer({ id: 'player1', name: 'Low Threat', threat: 20 }),
                createPlayer({ id: 'player2', name: 'High Threat', threat: 35 }),
            ],
            stagingArea: [ufthak],
        });

        const result = resolveEndOfCombatEffects(state);

        expect(result.log.some((l) => l.includes('High Threat'))).toBe(true);
    });
});

// ── Test: Attack Modifier Helpers ────────────────────────────────────────────

describe('Attack Modifier Helpers', () => {
    it('returns 0 for enemies without attack bonus', () => {
        const enemy = createActiveEnemy();
        expect(getEnemyAttackModifier(enemy)).toBe(0);
    });

    it('returns attack bonus for enemies with modifier', () => {
        const enemy = createActiveEnemy({ attackBonus: 2 });
        expect(getEnemyAttackModifier(enemy)).toBe(2);
    });

    it('calculates total attack including modifier', () => {
        const enemy = createActiveEnemy({
            card: createEnemy({ attack: 3 }),
            attackBonus: 1,
        });
        expect(getEnemyTotalAttack(enemy)).toBe(4);
    });
});

// ── Test: Clear Round-Based Modifiers ────────────────────────────────────────

describe('clearRoundBasedModifiers', () => {
    it('clears attack bonus from all engaged enemies', () => {
        const enemy1 = createActiveEnemy({ attackBonus: 1 });
        const enemy2 = createActiveEnemy({ attackBonus: 2 });

        const state = createGameState({
            players: [createPlayer({
                engagedEnemies: [enemy1, enemy2],
            })],
        });

        const result = clearRoundBasedModifiers(state);

        expect(result.players[0].engagedEnemies[0].attackBonus).toBe(0);
        expect(result.players[0].engagedEnemies[1].attackBonus).toBe(0);
    });

    it('handles multiple players', () => {
        const enemy1 = createActiveEnemy({ attackBonus: 1 });
        const enemy2 = createActiveEnemy({ attackBonus: 3 });

        const state = createGameState({
            players: [
                createPlayer({ id: 'player1', engagedEnemies: [enemy1] }),
                createPlayer({ id: 'player2', engagedEnemies: [enemy2] }),
            ],
        });

        const result = clearRoundBasedModifiers(state);

        expect(result.players[0].engagedEnemies[0].attackBonus).toBe(0);
        expect(result.players[1].engagedEnemies[0].attackBonus).toBe(0);
    });
});

// ── Test: Enemies Without Abilities ──────────────────────────────────────────

describe('Enemies Without Abilities', () => {
    it('returns empty result for when_engaged on unknown enemy', () => {
        const enemy = createEnemy({ code: 'unknown' });
        const state = createGameState();

        const result = resolveWhenEngaged(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.length).toBe(0);
    });

    it('returns empty result for when_revealed on unknown enemy', () => {
        const enemy = createEnemy({ code: 'unknown' });
        const state = createGameState();

        const result = resolveEnemyWhenRevealed(state, enemy, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.length).toBe(0);
    });
});
