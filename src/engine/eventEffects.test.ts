/**
 * Unit tests for Event Effect Resolution System
 *
 * Tests event card effects from the Core Set.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveEventEffect,
    getEventDefinition,
    hasEventDefinition,
    eventRequiresTarget,
    getEventTargetDescription,
    getEventTargets,
} from './eventEffects';
import type { GameState, PlayerCard, Ally, Hero, ActiveEnemy, EncounterCard } from './types';

// ── Test Fixtures ────────────────────────────────────────────────────────────

function makeTestHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: 'test-hero',
        name: 'Test Hero',
        type_code: 'hero',
        quantity: 1,
        threat: 10,
        willpower: 2,
        attack: 2,
        defense: 2,
        health: 5,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 3,
        attachments: [],
        ...overrides,
    };
}

function makeTestAlly(overrides: Partial<Ally> = {}): Ally {
    return {
        code: 'test-ally',
        name: 'Test Ally',
        type_code: 'ally',
        quantity: 1,
        cost: 2,
        willpower: 1,
        attack: 1,
        defense: 1,
        health: 2,
        exhausted: false,
        damage: 0,
        ...overrides,
    };
}

function makeTestEnemy(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: 'test-enemy',
        name: 'Test Enemy',
        type_code: 'enemy',
        quantity: 1,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 4,
        engagement_cost: 30,
        ...overrides,
    };
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'planning',
        round: 1,
        firstPlayerId: 'player1',
        activeLocation: null,
        questProgress: 0,
        currentQuest: null,
        questDeck: [],
        combatState: null,
        questCommitment: [],
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            },
        ],
        stagingArea: [],
        encounterDeck: [],
        encounterDiscard: [],
        ...overrides,
    } as GameState;
}

function makeEventCard(code: string, name: string): PlayerCard {
    return {
        code,
        name,
        type_code: 'event',
        quantity: 1,
        cost: 1,
    };
}

// ── Registry Tests ───────────────────────────────────────────────────────────

describe('Event Registry', () => {
    it('has Ever Vigilant registered', () => {
        expect(hasEventDefinition('01020')).toBe(true);
    });

    it('has Sneak Attack registered', () => {
        expect(hasEventDefinition('01023')).toBe(true);
    });

    it('has Feint registered', () => {
        expect(hasEventDefinition('01034')).toBe(true);
    });

    it('has Swift Strike registered', () => {
        expect(hasEventDefinition('01037')).toBe(true);
    });

    it('has Stand and Fight registered', () => {
        expect(hasEventDefinition('01051')).toBe(true);
    });

    it('returns undefined for unknown events', () => {
        expect(getEventDefinition('unknown-code')).toBeUndefined();
    });
});

// ── Ever Vigilant (01020) Tests ──────────────────────────────────────────────

describe('Ever Vigilant (01020)', () => {
    it('readies an exhausted ally', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [makeTestAlly({ exhausted: true })],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'ally',
            allyIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].allies[0].exhausted).toBe(false);
        expect(result.log.some((m) => m.includes('readied'))).toBe(true);
    });

    it('fails if ally is not exhausted', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [makeTestAlly({ exhausted: false })],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'ally',
            allyIndex: 0,
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not exhausted');
    });

    it('requires an ally target', () => {
        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        expect(eventRequiresTarget(eventCard)).toBe(true);
    });
});

// ── Sneak Attack (01023) Tests ───────────────────────────────────────────────

describe('Sneak Attack (01023)', () => {
    it('puts an ally from hand into play', () => {
        const allyCard = makeTestAlly({ code: 'gandalf', name: 'Gandalf' });
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [allyCard],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01023', 'Sneak Attack');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'ally_in_hand',
            cardIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].allies.length).toBe(1);
        expect(result.state.players[0].allies[0].name).toBe('Gandalf');
        expect(result.state.players[0].allies[0].exhausted).toBe(false);
        expect(result.state.players[0].hand.length).toBe(0);
        expect(result.log.some((m) => m.includes('put into play'))).toBe(true);
    });

    it('returns an end-of-phase effect', () => {
        const allyCard = makeTestAlly({ code: 'gandalf', name: 'Gandalf' });
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [allyCard],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01023', 'Sneak Attack');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'ally_in_hand',
            cardIndex: 0,
        });

        expect(result.endOfPhaseEffect).toBeDefined();
        expect(result.endOfPhaseEffect?.type).toBe('return_ally_to_hand');
        expect(result.endOfPhaseEffect?.allyCode).toBe('gandalf');
    });

    it('cannot play if no allies in hand', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01023');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No allies');
    });
});

// ── Grim Resolve (01025) Tests ───────────────────────────────────────────────

describe('Grim Resolve (01025)', () => {
    it('readies all characters', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ code: 'hero1', exhausted: true }),
                        makeTestHero({ code: 'hero2', exhausted: true }),
                    ],
                    allies: [
                        makeTestAlly({ code: 'ally1', exhausted: true }),
                        makeTestAlly({ code: 'ally2', exhausted: false }),
                    ],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01025', 'Grim Resolve');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes.every((h) => !h.exhausted)).toBe(true);
        expect(result.state.players[0].allies.every((a) => !a.exhausted)).toBe(true);
        expect(result.log.some((m) => m.includes('Readied 3'))).toBe(true);
    });

    it('does not require a target', () => {
        const eventCard = makeEventCard('01025', 'Grim Resolve');
        expect(eventRequiresTarget(eventCard)).toBe(false);
    });
});

// ── Feint (01034) Tests ──────────────────────────────────────────────────────

describe('Feint (01034)', () => {
    it('prevents an enemy from attacking', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy(),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventCard = makeEventCard('01034', 'Feint');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'engaged_enemy',
            enemyIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('cannot attack'))).toBe(true);
    });

    it('can only be played during combat', () => {
        const state = makeTestState({
            phase: 'planning',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01034');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('combat');
    });
});

// ── Quick Strike (01035) Tests ───────────────────────────────────────────────

describe('Quick Strike (01035)', () => {
    it('attacks an enemy immediately', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ defense: 1, health: 4 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ attack: 3, exhausted: false })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventCard = makeEventCard('01035', 'Quick Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(true);
        expect(result.state.players[0].engagedEnemies[0].damage).toBe(2); // 3 attack - 1 defense
        expect(result.log.some((m) => m.includes('attacks'))).toBe(true);
    });

    it('destroys enemy if damage exceeds health', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ defense: 0, health: 2 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ attack: 4, exhausted: false })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventCard = makeEventCard('01035', 'Quick Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.encounterDiscard.length).toBe(1);
        expect(result.log.some((m) => m.includes('destroyed'))).toBe(true);
    });

    it('cannot play if no ready characters', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy(),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ exhausted: true })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventDef = getEventDefinition('01035');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No ready');
    });
});

// ── The Galadhrim's Greeting (01046) Tests ───────────────────────────────────

describe("The Galadhrim's Greeting (01046)", () => {
    it('reduces threat by 6', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 35,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01046', "The Galadhrim's Greeting");
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].threat).toBe(29);
        expect(result.log.some((m) => m.includes('reduced by 6'))).toBe(true);
    });

    it('does not reduce threat below 0', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 3,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01046', "The Galadhrim's Greeting");
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].threat).toBe(0);
    });
});

// ── Stand and Fight (01051) Tests ────────────────────────────────────────────

describe('Stand and Fight (01051)', () => {
    it('puts ally from discard into play', () => {
        const allyInDiscard = makeTestAlly({ code: 'gandalf', name: 'Gandalf' });
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [allyInDiscard],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01051', 'Stand and Fight');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'ally_in_discard',
            playerId: 'player1',
            cardIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].allies.length).toBe(1);
        expect(result.state.players[0].allies[0].name).toBe('Gandalf');
        expect(result.state.players[0].discard.length).toBe(0);
        expect(result.log.some((m) => m.includes('put into play from discard'))).toBe(true);
    });

    it('cannot play if no allies in discard', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01051');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No allies');
    });
});

// ── A Light in the Dark (01052) Tests ────────────────────────────────────────

describe('A Light in the Dark (01052)', () => {
    it('returns enemy to staging area', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ name: 'Forest Spider' }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventCard = makeEventCard('01052', 'A Light in the Dark');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'engaged_enemy',
            enemyIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.stagingArea.length).toBe(1);
        expect(result.log.some((m) => m.includes('returned to staging'))).toBe(true);
    });
});

// ── Dwarven Tomb (01053) Tests ───────────────────────────────────────────────

describe('Dwarven Tomb (01053)', () => {
    it('returns a Spirit card from discard to hand', () => {
        const spiritCard: PlayerCard = {
            code: 'test-spirit',
            name: 'Test Spirit Card',
            type_code: 'event',
            quantity: 1,
            sphere_code: 'spirit',
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [spiritCard],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01053', 'Dwarven Tomb');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'card_in_discard',
            cardIndex: 0,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].hand.length).toBe(1);
        expect(result.state.players[0].hand[0].name).toBe('Test Spirit Card');
        expect(result.state.players[0].discard.length).toBe(0);
        expect(result.log.some((m) => m.includes('returned to hand'))).toBe(true);
    });

    it('cannot play if no Spirit cards in discard', () => {
        const tacticCard: PlayerCard = {
            code: 'test-tactics',
            name: 'Test Tactics Card',
            type_code: 'event',
            quantity: 1,
            sphere_code: 'tactics',
        };

        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [tacticCard],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01053');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No Spirit');
    });
});

// ── Unknown Events ───────────────────────────────────────────────────────────

describe('Unknown Events', () => {
    it('handles unknown events gracefully', () => {
        const state = makeTestState();
        const unknownEvent = makeEventCard('unknown', 'Unknown Event');

        const result = resolveEventEffect(state, unknownEvent, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('not implemented'))).toBe(true);
    });
});

// ── Common Cause (01021) Tests ───────────────────────────────────────────────

describe('Common Cause (01021)', () => {
    it('exhausts one hero to ready another', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ code: 'hero1', name: 'Ready Hero', exhausted: false }),
                        makeTestHero({ code: 'hero2', name: 'Exhausted Hero', exhausted: true }),
                    ],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01021', 'Common Cause');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(true);
        expect(result.state.players[0].heroes[1].exhausted).toBe(false);
        expect(result.log.some((m) => m.includes('Exhausted') && m.includes('ready'))).toBe(true);
    });

    it('cannot play if no ready heroes', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ code: 'hero1', exhausted: true }),
                        makeTestHero({ code: 'hero2', exhausted: true }),
                    ],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01021');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No ready heroes');
    });

    it('cannot play if no exhausted heroes', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ code: 'hero1', exhausted: false }),
                        makeTestHero({ code: 'hero2', exhausted: false }),
                    ],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventDef = getEventDefinition('01021');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No exhausted heroes');
    });
});

// ── Blade Mastery (01032) Tests ──────────────────────────────────────────────

describe('Blade Mastery (01032)', () => {
    it('grants +1 Attack and +1 Defense to a character', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ code: 'aragorn', name: 'Aragorn' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01032', 'Blade Mastery');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'character',
            ref: { type: 'hero', index: 0, code: 'aragorn' },
        });

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('+1 Attack') && m.includes('+1 Defense'))).toBe(true);
    });

    it('defaults to first hero if no target specified', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ code: 'hero1', name: 'First Hero' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01032', 'Blade Mastery');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('First Hero'))).toBe(true);
    });

    it('can target an ally', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [makeTestAlly({ code: 'ally1', name: 'Veteran Axehand' })],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01032', 'Blade Mastery');
        const result = resolveEventEffect(state, eventCard, 'player1', {
            type: 'character',
            ref: { type: 'ally', index: 0, code: '' },
        });

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('Veteran Axehand'))).toBe(true);
    });

    it('requires a target', () => {
        const eventCard = makeEventCard('01032', 'Blade Mastery');
        expect(eventRequiresTarget(eventCard)).toBe(true);
    });
});

// ── Swift Strike (01037) Tests ───────────────────────────────────────────────

describe('Swift Strike (01037)', () => {
    it('deals 2 damage to attacking enemy', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ name: 'Test Enemy', health: 5 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat_defend',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventCard = makeEventCard('01037', 'Swift Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies[0].damage).toBe(2);
        expect(result.log.some((m) => m.includes('2 damage'))).toBe(true);
    });

    it('destroys enemy if damage exceeds health', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ name: 'Weak Enemy', health: 2 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat_defend',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventCard = makeEventCard('01037', 'Swift Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.encounterDiscard.length).toBe(1);
        expect(result.log.some((m) => m.includes('destroyed'))).toBe(true);
    });

    it('cannot play outside of combat defense', () => {
        const state = makeTestState({
            phase: 'planning',
        });

        const eventDef = getEventDefinition('01037');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('defender');
    });

    it('cannot play if no defender selected', () => {
        const state = makeTestState({
            phase: 'combat_defend',
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: null,
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventDef = getEventDefinition('01037');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No defender');
    });
});

// ── Hasty Stroke (01048) Tests ───────────────────────────────────────────────

describe('Hasty Stroke (01048)', () => {
    it('cancels a shadow effect', () => {
        const state = makeTestState({
            phase: 'combat_defend',
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: true,
                enemiesResolved: [],
            },
        });

        const eventCard = makeEventCard('01048', 'Hasty Stroke');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('cancelled'))).toBe(true);
    });

    it('cannot play outside combat defense', () => {
        const state = makeTestState({
            phase: 'planning',
        });

        const eventDef = getEventDefinition('01048');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('combat defense');
    });

    it('cannot play if no shadow effect revealed', () => {
        const state = makeTestState({
            phase: 'combat_defend',
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventDef = getEventDefinition('01048');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('No shadow effect');
    });
});

// ── A Test of Will (01050) Tests ─────────────────────────────────────────────

describe('A Test of Will (01050)', () => {
    it('cancels a When Revealed effect', () => {
        const state = makeTestState({
            phase: 'quest_staging',
        });

        const eventCard = makeEventCard('01050', 'A Test of Will');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('cancelled'))).toBe(true);
    });

    it('cannot play outside staging phase', () => {
        const state = makeTestState({
            phase: 'planning',
        });

        const eventDef = getEventDefinition('01050');
        const canPlay = eventDef?.canPlay?.(state, 'player1');

        expect(canPlay?.canPlay).toBe(false);
        expect(canPlay?.reason).toContain('staging');
    });
});

// ── For Gondor! (01022) Tests ────────────────────────────────────────────────

describe('For Gondor! (01022)', () => {
    it('is registered in event registry', () => {
        // For Gondor is not implemented in this file based on the code
        // This tests that unknown events are handled gracefully
        const state = makeTestState();
        const eventCard = makeEventCard('01022', 'For Gondor!');
        const result = resolveEventEffect(state, eventCard, 'player1');

        // Since it's not implemented, it should succeed with "not implemented" message
        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('not implemented'))).toBe(true);
    });
});

// ── Edge Cases and Error Handling ────────────────────────────────────────────

describe('Edge Cases and Error Handling', () => {
    describe('Ever Vigilant edge cases', () => {
        it('fails with invalid ally index', () => {
            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [makeTestAlly({ exhausted: true })],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01020', 'Ever Vigilant');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'ally',
                allyIndex: 99, // Invalid index
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('fails without target', () => {
            const state = makeTestState();
            const eventCard = makeEventCard('01020', 'Ever Vigilant');
            const result = resolveEventEffect(state, eventCard, 'player1');

            expect(result.success).toBe(false);
            expect(result.error).toContain('No ally target');
        });
    });

    describe('Sneak Attack edge cases', () => {
        it('fails if selected card is not an ally', () => {
            const eventCardInHand: PlayerCard = {
                code: 'test-event',
                name: 'Some Event',
                type_code: 'event',
                quantity: 1,
            };
            const allyInHand: PlayerCard = {
                code: 'test-ally',
                name: 'Test Ally',
                type_code: 'ally',
                quantity: 1,
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [eventCardInHand, allyInHand], // Need an ally for canPlay to pass
                        discard: [],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01023', 'Sneak Attack');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'ally_in_hand',
                cardIndex: 0, // Points to the event card
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not an ally');
        });

        it('fails without target', () => {
            const state = makeTestState();
            const eventCard = makeEventCard('01023', 'Sneak Attack');
            const result = resolveEventEffect(state, eventCard, 'player1');

            expect(result.success).toBe(false);
        });
    });

    describe('Feint edge cases', () => {
        it('fails without target', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy(),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            const state = makeTestState({
                phase: 'combat',
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy],
                    },
                ],
            });

            const eventCard = makeEventCard('01034', 'Feint');
            const result = resolveEventEffect(state, eventCard, 'player1');

            expect(result.success).toBe(false);
            expect(result.error).toContain('No enemy target');
        });

        it('fails with invalid enemy index', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy(),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            const state = makeTestState({
                phase: 'combat',
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy], // Need an enemy for canPlay to pass
                    },
                ],
            });

            const eventCard = makeEventCard('01034', 'Feint');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'engaged_enemy',
                enemyIndex: 99,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('cannot play if no engaged enemies', () => {
            const state = makeTestState({
                phase: 'combat',
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventDef = getEventDefinition('01034');
            const canPlay = eventDef?.canPlay?.(state, 'player1');

            expect(canPlay?.canPlay).toBe(false);
            expect(canPlay?.reason).toContain('No engaged enemies');
        });
    });

    describe('Quick Strike edge cases', () => {
        it('fails if no enemies to attack', () => {
            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero({ exhausted: false })],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventDef = getEventDefinition('01035');
            const canPlay = eventDef?.canPlay?.(state, 'player1');

            expect(canPlay?.canPlay).toBe(false);
            expect(canPlay?.reason).toContain('No enemies');
        });

        it('uses ally if no ready heroes', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy({ defense: 0, health: 3 }),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero({ exhausted: true })],
                        allies: [makeTestAlly({ name: 'Ready Ally', attack: 2, exhausted: false })],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy],
                    },
                ],
            });

            const eventCard = makeEventCard('01035', 'Quick Strike');
            const result = resolveEventEffect(state, eventCard, 'player1');

            expect(result.success).toBe(true);
            expect(result.state.players[0].allies[0].exhausted).toBe(true);
            expect(result.log.some((m) => m.includes('Ready Ally'))).toBe(true);
        });
    });

    describe('A Light in the Dark edge cases', () => {
        it('fails with invalid enemy index', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy(),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy], // Need an enemy for canPlay to pass
                    },
                ],
            });

            const eventCard = makeEventCard('01052', 'A Light in the Dark');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'engaged_enemy',
                enemyIndex: 99,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('cannot play without engaged enemies', () => {
            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventDef = getEventDefinition('01052');
            const canPlay = eventDef?.canPlay?.(state, 'player1');

            expect(canPlay?.canPlay).toBe(false);
            expect(canPlay?.reason).toContain('No engaged enemies');
        });
    });

    describe('Stand and Fight edge cases', () => {
        it('fails if source player not found', () => {
            const allyInDiscard = makeTestAlly({ code: 'test-ally', name: 'Discarded Ally' });

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [allyInDiscard], // Need an ally for canPlay to pass
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01051', 'Stand and Fight');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'ally_in_discard',
                playerId: 'nonexistent',
                cardIndex: 0,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('fails if selected card is not an ally', () => {
            const eventInDiscard: PlayerCard = {
                code: 'test-event',
                name: 'Some Event',
                type_code: 'event',
                quantity: 1,
            };
            const allyInDiscard = makeTestAlly({ code: 'test-ally', name: 'Discarded Ally' });

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [eventInDiscard, allyInDiscard], // Need an ally for canPlay to pass
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01051', 'Stand and Fight');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'ally_in_discard',
                playerId: 'player1',
                cardIndex: 0, // Points to the event card
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not an ally');
        });
    });

    describe('Dwarven Tomb edge cases', () => {
        it('defaults to first Spirit card if no target specified', () => {
            const spiritCard: PlayerCard = {
                code: 'test-spirit',
                name: 'Spirit Card',
                type_code: 'event',
                quantity: 1,
                sphere_code: 'spirit',
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [spiritCard],
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01053', 'Dwarven Tomb');
            const result = resolveEventEffect(state, eventCard, 'player1');

            expect(result.success).toBe(true);
            expect(result.state.players[0].hand.length).toBe(1);
        });

        it('fails if target card is not Spirit sphere', () => {
            const tacticsCard: PlayerCard = {
                code: 'test-tactics',
                name: 'Tactics Card',
                type_code: 'event',
                quantity: 1,
                sphere_code: 'tactics',
            };
            const spiritCard: PlayerCard = {
                code: 'test-spirit',
                name: 'Spirit Card',
                type_code: 'event',
                quantity: 1,
                sphere_code: 'spirit',
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [tacticsCard, spiritCard], // Need a spirit card for canPlay to pass
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01053', 'Dwarven Tomb');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'card_in_discard',
                cardIndex: 0, // Points to the tactics card
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not a Spirit card');
        });

        it('fails if card index is invalid', () => {
            const spiritCard: PlayerCard = {
                code: 'test-spirit',
                name: 'Spirit Card',
                type_code: 'event',
                quantity: 1,
                sphere_code: 'spirit',
            };

            const state = makeTestState({
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [spiritCard], // Need a spirit card for canPlay to pass
                        engagedEnemies: [],
                    },
                ],
            });

            const eventCard = makeEventCard('01053', 'Dwarven Tomb');
            const result = resolveEventEffect(state, eventCard, 'player1', {
                type: 'card_in_discard',
                cardIndex: 99,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('Combat Action timing', () => {
        it('rejects combat actions during planning phase due to canPlay check', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy(),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            const state = makeTestState({
                phase: 'planning',
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy],
                    },
                ],
            });

            // The canPlay check runs first and rejects based on phase
            const eventDef = getEventDefinition('01034');
            const canPlay = eventDef?.canPlay?.(state, 'player1');

            expect(canPlay?.canPlay).toBe(false);
            expect(canPlay?.reason).toContain('combat');
        });

        it('allows combat actions during combat_attack phase', () => {
            const enemy: ActiveEnemy = {
                card: makeTestEnemy(),
                damage: 0,
                shadowCards: [],
                engagedPlayerId: 'player1',
                exhausted: false,
            };

            // For Feint, canPlay requires combat or combat_defend phase
            // Use 'combat' which is in canPlay's allowed phases
            const combatState = makeTestState({
                phase: 'combat',
                players: [
                    {
                        id: 'player1',
                        name: 'Test Player',
                        threat: 28,
                        heroes: [makeTestHero()],
                        allies: [],
                        deck: [],
                        hand: [],
                        discard: [],
                        engagedEnemies: [enemy],
                    },
                ],
            });

            const eventCard = makeEventCard('01034', 'Feint');
            const result = resolveEventEffect(combatState, eventCard, 'player1', {
                type: 'engaged_enemy',
                enemyIndex: 0,
            });

            expect(result.success).toBe(true);
        });
    });

    describe('Player not found handling', () => {
        it('handles invalid player ID gracefully', () => {
            const state = makeTestState();
            const eventCard = makeEventCard('01020', 'Ever Vigilant');
            const result = resolveEventEffect(state, eventCard, 'nonexistent_player', {
                type: 'ally',
                allyIndex: 0,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });
});

// ── Swift Strike Additional Coverage ─────────────────────────────────────────

describe('Swift Strike additional coverage', () => {
    it('handles enemy with pre-existing damage', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ name: 'Wounded Enemy', health: 5 }),
            damage: 2, // Already has 2 damage
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat_defend',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventCard = makeEventCard('01037', 'Swift Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies[0].damage).toBe(4); // 2 + 2
    });

    it('destroys enemy with exactly enough damage', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy({ name: 'Weak Enemy', health: 3 }),
            damage: 1, // 1 damage + 2 from Swift Strike = 3 = health
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat_defend',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
            combatState: {
                currentEnemyIndex: 0,
                phase: 'enemy_attacks',
                selectedDefender: { type: 'hero', code: 'test-hero', index: 0 },
                selectedAttackers: [],
                shadowRevealed: false,
                enemiesResolved: [],
            },
        });

        const eventCard = makeEventCard('01037', 'Swift Strike');
        const result = resolveEventEffect(state, eventCard, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.encounterDiscard.length).toBe(1);
    });
});

// ── getEventTargets Additional Coverage ──────────────────────────────────────

describe('getEventTargets additional coverage', () => {
    it('returns ally_in_hand targets for Sneak Attack', () => {
        const allyCard = makeTestAlly({ code: 'gandalf', name: 'Gandalf' });
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [allyCard],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01023', 'Sneak Attack');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('ally_in_hand');
        expect(targets?.targets.length).toBe(1);
    });

    it('returns ally_in_discard targets for Stand and Fight', () => {
        const allyInDiscard = makeTestAlly({ code: 'gandalf', name: 'Gandalf' });
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [allyInDiscard],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01051', 'Stand and Fight');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('ally_in_discard');
        expect(targets?.targets.length).toBe(1);
    });

    it('returns engaged_enemy targets for Feint', () => {
        const enemy: ActiveEnemy = {
            card: makeTestEnemy(),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            phase: 'combat',
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [enemy],
                },
            ],
        });

        const eventCard = makeEventCard('01034', 'Feint');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('engaged_enemy');
        expect(targets?.targets.length).toBe(1);
    });

    it('returns character targets for Blade Mastery', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [makeTestAlly()],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01032', 'Blade Mastery');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('character');
        expect(targets?.targets.length).toBe(2); // 1 hero + 1 ally
    });

    it('returns hero targets for Common Cause', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ code: 'hero1', exhausted: false }),
                        makeTestHero({ code: 'hero2', exhausted: true }),
                    ],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01021', 'Common Cause');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('hero');
        expect(targets?.targets.length).toBe(2);
    });

    it('returns null for events without targets', () => {
        const state = makeTestState();
        const eventCard = makeEventCard('01025', 'Grim Resolve');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).toBeNull();
    });

    it('returns null for invalid player', () => {
        const state = makeTestState();
        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        const targets = getEventTargets(state, eventCard, 'nonexistent');

        expect(targets).toBeNull();
    });

    it('returns null for unknown events', () => {
        const state = makeTestState();
        const eventCard = makeEventCard('unknown', 'Unknown Event');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).toBeNull();
    });
});

// ── Targeting Utilities ──────────────────────────────────────────────────────

describe('Targeting Utilities', () => {
    it('returns valid ally targets for Ever Vigilant', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero()],
                    allies: [
                        makeTestAlly({ code: 'ally1', exhausted: true }),
                        makeTestAlly({ code: 'ally2', exhausted: false }),
                    ],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        const targets = getEventTargets(state, eventCard, 'player1');

        expect(targets).not.toBeNull();
        expect(targets?.type).toBe('ally');
        // Filter should only return exhausted allies
        expect(targets?.targets.length).toBe(1);
    });

    it('returns target description', () => {
        const eventCard = makeEventCard('01020', 'Ever Vigilant');
        const description = getEventTargetDescription(eventCard);

        expect(description).toBe('Choose an exhausted ally to ready');
    });
});
