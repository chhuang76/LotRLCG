/**
 * Unit tests for treachery effect resolution
 */

import { describe, it, expect } from 'vitest';
import {
    resolveTreachery,
    resolveNecromancersReach,
    resolveDrivenByShadow,
    resolveDespair,
    resolveGreatForestWeb,
    resolveCaughtInAWeb,
    isTreacheryCard,
} from './treacheryEffects';
import type { GameState, Hero, Ally, EncounterCard, PlayerCard } from './types';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function createTestHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: 'test-hero-1',
        name: 'Test Hero',
        type_code: 'hero',
        sphere_code: 'leadership',
        willpower: 2,
        attack: 3,
        defense: 2,
        health: 5,
        threat: 10,
        quantity: 1,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 0,
        attachments: [],
        ...overrides,
    };
}

function createTestAlly(overrides: Partial<Ally> = {}): Ally {
    return {
        code: 'test-ally-1',
        name: 'Test Ally',
        type_code: 'ally',
        sphere_code: 'tactics',
        willpower: 1,
        attack: 2,
        defense: 1,
        health: 2,
        cost: 2,
        quantity: 1,
        exhausted: false,
        damage: 0,
        ...overrides,
    };
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'quest_staging',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                hand: [],
                deck: [],
                discard: [],
                heroes: [createTestHero()],
                allies: [],
                engagedEnemies: [],
            },
        ],
        encounterDeck: [],
        encounterDiscard: [],
        stagingArea: [],
        activeLocation: null,
        questDeck: [],
        currentQuest: {
            code: 'quest1',
            name: 'Test Quest',
            type_code: 'quest',
            quest_points: 10,
            quantity: 1,
        },
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
        ...overrides,
    };
}

function createTreacheryCard(code: string, name: string): EncounterCard {
    return {
        code,
        name,
        type_code: 'treachery',
        quantity: 1,
    };
}

// ── Test: The Necromancer's Reach (01102) ────────────────────────────────────

describe('resolveNecromancersReach', () => {
    const necromancersReach = createTreacheryCard('01102', "The Necromancer's Reach");

    it('should damage exhausted heroes', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero({ exhausted: true, damage: 0 })];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].heroes[0].damage).toBe(1);
        expect(result.log.some((msg) => msg.includes('takes 1 damage'))).toBe(true);
        expect(result.discard).toBe(true);
    });

    it('should not damage ready (non-exhausted) heroes', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero({ exhausted: false, damage: 0 })];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].heroes[0].damage).toBe(0);
    });

    it('should damage exhausted allies', () => {
        const state = createTestGameState();
        state.players[0].allies = [createTestAlly({ exhausted: true, damage: 0 })];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].allies[0].damage).toBe(1);
        expect(result.log.some((msg) => msg.includes('takes 1 damage'))).toBe(true);
    });

    it('should destroy allies when damage equals health', () => {
        const state = createTestGameState();
        // Ally with 2 health and 1 damage already - 1 more damage destroys it
        state.players[0].allies = [createTestAlly({ exhausted: true, damage: 1, health: 2 })];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].allies.length).toBe(0);
        expect(result.state.players[0].discard.length).toBe(1);
        expect(result.log.some((msg) => msg.includes('is destroyed'))).toBe(true);
    });

    it('should trigger game over when all heroes are defeated', () => {
        const state = createTestGameState();
        // Hero with 1 health left - 1 damage defeats it
        state.players[0].heroes = [createTestHero({ exhausted: true, damage: 4, health: 5 })];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].heroes[0].damage).toBe(5);
        expect(result.log.some((msg) => msg.includes('is defeated'))).toBe(true);
        expect(result.log.some((msg) => msg.includes('players lose'))).toBe(true);
        expect(result.state.phase).toBe('game_over');
    });

    it('should damage multiple exhausted characters', () => {
        const state = createTestGameState();
        state.players[0].heroes = [
            createTestHero({ code: 'hero1', name: 'Hero 1', exhausted: true }),
            createTestHero({ code: 'hero2', name: 'Hero 2', exhausted: false }),
        ];
        state.players[0].allies = [
            createTestAlly({ code: 'ally1', name: 'Ally 1', exhausted: true }),
            createTestAlly({ code: 'ally2', name: 'Ally 2', exhausted: true }),
        ];

        const result = resolveNecromancersReach(state, necromancersReach);

        expect(result.state.players[0].heroes[0].damage).toBe(1); // exhausted
        expect(result.state.players[0].heroes[1].damage).toBe(0); // ready
        expect(result.state.players[0].allies[0].damage).toBe(1);
        expect(result.state.players[0].allies[1].damage).toBe(1);
    });
});

// ── Test: Driven by Shadow (01103) ───────────────────────────────────────────

describe('resolveDrivenByShadow', () => {
    const drivenByShadow = createTreacheryCard('01103', 'Driven by Shadow');

    it('should place progress equal to staging area count', () => {
        const state = createTestGameState();
        state.stagingArea = [
            createTreacheryCard('enemy1', 'Enemy') as any,
            createTreacheryCard('enemy2', 'Enemy 2') as any,
            createTreacheryCard('location1', 'Location') as any,
        ];
        state.questProgress = 0;

        const result = resolveDrivenByShadow(state, drivenByShadow);

        expect(result.state.questProgress).toBe(3);
        expect(result.log.some((msg) => msg.includes('3 progress'))).toBe(true);
        expect(result.discard).toBe(true);
    });

    it('should place no progress when staging area is empty', () => {
        const state = createTestGameState();
        state.stagingArea = [];
        state.questProgress = 0;

        const result = resolveDrivenByShadow(state, drivenByShadow);

        expect(result.state.questProgress).toBe(0);
        expect(result.log.some((msg) => msg.includes('No cards in staging area'))).toBe(true);
    });

    it('should complete quest stage when progress meets quest points', () => {
        const state = createTestGameState();
        state.stagingArea = [
            createTreacheryCard('enemy1', 'Enemy') as any,
            createTreacheryCard('enemy2', 'Enemy 2') as any,
        ];
        state.questProgress = 9; // 9 + 2 = 11 >= 10 quest points
        state.currentQuest = {
            code: 'quest1',
            name: 'Quest Stage 1',
            type_code: 'quest',
            quest_points: 10,
            quantity: 1,
        };
        state.questDeck = [
            {
                code: 'quest2',
                name: 'Quest Stage 2',
                type_code: 'quest',
                quest_points: 15,
                quantity: 1,
            },
        ];

        const result = resolveDrivenByShadow(state, drivenByShadow);

        expect(result.state.currentQuest?.name).toBe('Quest Stage 2');
        expect(result.state.questProgress).toBe(0);
        expect(result.log.some((msg) => msg.includes('Quest stage complete'))).toBe(true);
    });

    it('should trigger victory when all quest stages are complete', () => {
        const state = createTestGameState();
        state.stagingArea = [createTreacheryCard('enemy1', 'Enemy') as any];
        state.questProgress = 9; // 9 + 1 = 10 = quest points
        state.currentQuest = {
            code: 'quest1',
            name: 'Final Quest',
            type_code: 'quest',
            quest_points: 10,
            quantity: 1,
        };
        state.questDeck = []; // No more quest stages

        const result = resolveDrivenByShadow(state, drivenByShadow);

        expect(result.log.some((msg) => msg.includes('players win'))).toBe(true);
    });
});

// ── Test: Despair (01104) ────────────────────────────────────────────────────

describe('resolveDespair', () => {
    const despair = createTreacheryCard('01104', 'Despair');

    it('should raise threat by 3 for each player', () => {
        const state = createTestGameState();
        state.players[0].threat = 28;

        const result = resolveDespair(state, despair);

        expect(result.state.players[0].threat).toBe(31);
        expect(result.log.some((msg) => msg.includes('threat raised by 3'))).toBe(true);
        expect(result.discard).toBe(true);
    });

    it('should cap threat at 50', () => {
        const state = createTestGameState();
        state.players[0].threat = 48;

        const result = resolveDespair(state, despair);

        expect(result.state.players[0].threat).toBe(50);
    });

    it('should trigger elimination at threat 50', () => {
        const state = createTestGameState();
        state.players[0].threat = 48;

        const result = resolveDespair(state, despair);

        expect(result.state.phase).toBe('game_over');
        expect(result.log.some((msg) => msg.includes('eliminated by threat'))).toBe(true);
    });

    it('should raise threat for multiple players', () => {
        const state = createTestGameState();
        state.players = [
            { ...state.players[0], id: 'player1', name: 'Player 1', threat: 20 },
            {
                id: 'player2',
                name: 'Player 2',
                threat: 25,
                hand: [],
                deck: [],
                discard: [],
                heroes: [createTestHero()],
                allies: [],
                engagedEnemies: [],
            },
        ];

        const result = resolveDespair(state, despair);

        expect(result.state.players[0].threat).toBe(23);
        expect(result.state.players[1].threat).toBe(28);
    });
});

// ── Test: Great Forest Web (01077) ───────────────────────────────────────────

describe('resolveGreatForestWeb', () => {
    const greatForestWeb = createTreacheryCard('01077', 'Great Forest Web');

    it('should attach to hero as condition', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero({ name: 'Aragorn' })];

        const result = resolveGreatForestWeb(state, greatForestWeb);

        expect(result.state.players[0].heroes[0].attachments.length).toBe(1);
        expect(result.state.players[0].heroes[0].attachments[0].name).toBe('Great Forest Web');
        expect(result.log.some((msg) => msg.includes('attaches to Aragorn'))).toBe(true);
        expect(result.discard).toBe(false); // Stays attached, not discarded
    });

    it('should include correct condition text', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero()];

        const result = resolveGreatForestWeb(state, greatForestWeb);

        const attachment = result.state.players[0].heroes[0].attachments[0];
        expect(attachment.text).toContain('cannot ready during the refresh phase');
        expect(attachment.text).toContain('2 resources');
    });

    it('should discard when no heroes exist', () => {
        const state = createTestGameState();
        state.players[0].heroes = [];

        const result = resolveGreatForestWeb(state, greatForestWeb);

        expect(result.log.some((msg) => msg.includes('No heroes'))).toBe(true);
        expect(result.discard).toBe(true);
    });

    it('should attach to first hero only', () => {
        const state = createTestGameState();
        state.players[0].heroes = [
            createTestHero({ code: 'hero1', name: 'First Hero' }),
            createTestHero({ code: 'hero2', name: 'Second Hero' }),
        ];

        const result = resolveGreatForestWeb(state, greatForestWeb);

        expect(result.state.players[0].heroes[0].attachments.length).toBe(1);
        expect(result.state.players[0].heroes[1].attachments.length).toBe(0);
    });
});

// ── Test: Caught in a Web (01078) ────────────────────────────────────────────

describe('resolveCaughtInAWeb', () => {
    const caughtInAWeb = createTreacheryCard('01078', 'Caught in a Web');

    it('should attach to hero as condition', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero({ name: 'Legolas' })];

        const result = resolveCaughtInAWeb(state, caughtInAWeb);

        expect(result.state.players[0].heroes[0].attachments.length).toBe(1);
        expect(result.state.players[0].heroes[0].attachments[0].name).toBe('Caught in a Web');
        expect(result.log.some((msg) => msg.includes('attaches to Legolas'))).toBe(true);
        expect(result.discard).toBe(false); // Stays attached, not discarded
    });

    it('should include correct condition text', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero()];

        const result = resolveCaughtInAWeb(state, caughtInAWeb);

        const attachment = result.state.players[0].heroes[0].attachments[0];
        expect(attachment.text).toContain('cannot collect resources during the resource phase');
    });

    it('should discard when no heroes exist', () => {
        const state = createTestGameState();
        state.players[0].heroes = [];

        const result = resolveCaughtInAWeb(state, caughtInAWeb);

        expect(result.log.some((msg) => msg.includes('No heroes'))).toBe(true);
        expect(result.discard).toBe(true);
    });
});

// ── Test: Main Resolution Function ───────────────────────────────────────────

describe('resolveTreachery', () => {
    it('should route to correct handler by card code', () => {
        const state = createTestGameState();
        state.players[0].heroes = [createTestHero({ exhausted: true })];

        const necromancersReach = createTreacheryCard('01102', "The Necromancer's Reach");
        const result = resolveTreachery(state, necromancersReach);

        // Should have damaged the exhausted hero
        expect(result.state.players[0].heroes[0].damage).toBe(1);
    });

    it('should handle unknown treachery cards gracefully', () => {
        const state = createTestGameState();
        const unknownTreachery = createTreacheryCard('99999', 'Unknown Treachery');

        const result = resolveTreachery(state, unknownTreachery);

        expect(result.log.some((msg) => msg.includes('not implemented'))).toBe(true);
        expect(result.discard).toBe(true);
        expect(result.state).toBe(state); // State unchanged
    });
});

// ── Test: Helper Functions ───────────────────────────────────────────────────

describe('isTreacheryCard', () => {
    it('should return true for treachery cards', () => {
        const treachery: EncounterCard = {
            code: '01102',
            name: 'Test Treachery',
            type_code: 'treachery',
            quantity: 1,
        };

        expect(isTreacheryCard(treachery)).toBe(true);
    });

    it('should return false for non-treachery cards', () => {
        const enemy: EncounterCard = {
            code: '01101',
            name: 'Test Enemy',
            type_code: 'enemy',
            quantity: 1,
        };

        const location: EncounterCard = {
            code: '01103',
            name: 'Test Location',
            type_code: 'location',
            quantity: 1,
        };

        expect(isTreacheryCard(enemy)).toBe(false);
        expect(isTreacheryCard(location)).toBe(false);
    });
});
