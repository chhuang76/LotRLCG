/**
 * Unit tests for Location Ability System
 *
 * Tests location abilities for Passage Through Mirkwood scenario.
 */

import { describe, it, expect } from 'vitest';
import {
    getLocationAbilities,
    hasLocationAbility,
    getLocationAbilityByType,
    canPayTravelCost,
    resolveTravelCost,
    resolveAfterTraveling,
    resolveAfterExploring,
    hasWhileActiveEffect,
    getWhileActiveEffectDescription,
    isEnchantedStreamActive,
    isMountainsOfMirkwoodActive,
    getActiveLocationWillpowerModifier,
    canCardEffectsPlaceQuestProgress,
} from './locationAbilities';
import type { GameState, EncounterCard, Hero, Ally } from './types';

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

function makeTestLocation(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: 'test-location',
        name: 'Test Location',
        type_code: 'location',
        quantity: 1,
        threat: 2,
        quest_points: 3,
        ...overrides,
    };
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'travel',
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

// ── Registry Tests ───────────────────────────────────────────────────────────

describe('Location Ability Registry', () => {
    it('has Old Forest Road registered', () => {
        const abilities = getLocationAbilities('01099');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Old Forest Road');
    });

    it('has Forest Gate registered', () => {
        const abilities = getLocationAbilities('01100');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Forest Gate');
    });

    it('has Mountains of Mirkwood registered', () => {
        const abilities = getLocationAbilities('01101');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Mountains of Mirkwood');
    });

    it('has Enchanted Stream registered', () => {
        const abilities = getLocationAbilities('01095');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Enchanted Stream');
    });

    it('returns empty array for unknown locations', () => {
        const abilities = getLocationAbilities('unknown-code');
        expect(abilities).toEqual([]);
    });

    it('can check for ability type', () => {
        expect(hasLocationAbility('01100', 'travel_cost')).toBe(true);
        expect(hasLocationAbility('01099', 'after_traveling')).toBe(true);
        expect(hasLocationAbility('01095', 'while_active')).toBe(true);
        expect(hasLocationAbility('01101', 'while_active')).toBe(true);
    });
});

// ── Old Forest Road (01099) Tests ────────────────────────────────────────────

describe('Old Forest Road (01099)', () => {
    it('has after_traveling ability type', () => {
        const ability = getLocationAbilityByType('01099', 'after_traveling');
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('ready 1 character');
    });

    it('readies an exhausted hero after traveling', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ exhausted: true, name: 'Aragorn' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const location = makeTestLocation({ code: '01099', name: 'Old Forest Road' });
        const result = resolveAfterTraveling(state, location, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(false);
        expect(result.log.some((m) => m.includes('Aragorn') && m.includes('readied'))).toBe(true);
    });

    it('readies an exhausted ally if no exhausted heroes', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ exhausted: false })],
                    allies: [makeTestAlly({ exhausted: true, name: 'Gandalf' })],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const location = makeTestLocation({ code: '01099', name: 'Old Forest Road' });
        const result = resolveAfterTraveling(state, location, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].allies[0].exhausted).toBe(false);
        expect(result.log.some((m) => m.includes('Gandalf') && m.includes('readied'))).toBe(true);
    });

    it('succeeds with no exhausted characters (optional effect)', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ exhausted: false })],
                    allies: [makeTestAlly({ exhausted: false })],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const location = makeTestLocation({ code: '01099', name: 'Old Forest Road' });
        const result = resolveAfterTraveling(state, location, 'player1');

        expect(result.success).toBe(true);
        expect(result.log.some((m) => m.includes('No exhausted characters'))).toBe(true);
    });
});

// ── Forest Gate (01100) Tests ────────────────────────────────────────────────

describe('Forest Gate (01100)', () => {
    it('has travel_cost ability type', () => {
        const ability = getLocationAbilityByType('01100', 'travel_cost');
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('exhaust 1 hero');
    });

    it('can pay travel cost with ready hero', () => {
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

        const location = makeTestLocation({ code: '01100', name: 'Forest Gate' });
        const canPay = canPayTravelCost(state, location, 'player1');

        expect(canPay.canPay).toBe(true);
    });

    it('cannot pay travel cost if all heroes exhausted', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [
                        makeTestHero({ exhausted: true }),
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

        const location = makeTestLocation({ code: '01100', name: 'Forest Gate' });
        const canPay = canPayTravelCost(state, location, 'player1');

        expect(canPay.canPay).toBe(false);
        expect(canPay.reason).toContain('no ready heroes');
    });

    it('exhausts a hero when resolving travel cost', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [makeTestHero({ exhausted: false, name: 'Aragorn' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const location = makeTestLocation({ code: '01100', name: 'Forest Gate' });
        const result = resolveTravelCost(state, location, 'player1');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(true);
        expect(result.log.some((m) => m.includes('Forest Gate') && m.includes('exhausted') && m.includes('Aragorn'))).toBe(true);
    });

    it('chooses player with highest threat in multiplayer', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Player 1',
                    threat: 25,
                    heroes: [makeTestHero({ exhausted: false, name: 'Gimli' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
                {
                    id: 'player2',
                    name: 'Player 2',
                    threat: 30,
                    heroes: [makeTestHero({ code: 'hero2', exhausted: false, name: 'Legolas' })],
                    allies: [],
                    deck: [],
                    hand: [],
                    discard: [],
                    engagedEnemies: [],
                },
            ],
        });

        const location = makeTestLocation({ code: '01100', name: 'Forest Gate' });
        const result = resolveTravelCost(state, location, 'player1');

        expect(result.success).toBe(true);
        // Player 2 has higher threat, so Legolas should be exhausted
        expect(result.state.players[1].heroes[0].exhausted).toBe(true);
        expect(result.log.some((m) => m.includes('Legolas'))).toBe(true);
    });
});

// ── Mountains of Mirkwood (01101) Tests ──────────────────────────────────────

describe('Mountains of Mirkwood (01101)', () => {
    it('has while_active ability type', () => {
        const ability = getLocationAbilityByType('01101', 'while_active');
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('cannot use card effects');
    });

    it('is detected as active', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01101', name: 'Mountains of Mirkwood' }),
                progress: 0,
            },
        });

        expect(isMountainsOfMirkwoodActive(state)).toBe(true);
    });

    it('is not detected when different location is active', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01099', name: 'Old Forest Road' }),
                progress: 0,
            },
        });

        expect(isMountainsOfMirkwoodActive(state)).toBe(false);
    });

    it('blocks card effects from placing quest progress', () => {
        const stateWithMountains = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01101', name: 'Mountains of Mirkwood' }),
                progress: 0,
            },
        });

        const stateWithoutMountains = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01099', name: 'Old Forest Road' }),
                progress: 0,
            },
        });

        expect(canCardEffectsPlaceQuestProgress(stateWithMountains)).toBe(false);
        expect(canCardEffectsPlaceQuestProgress(stateWithoutMountains)).toBe(true);
    });
});

// ── Enchanted Stream (01095) Tests ───────────────────────────────────────────

describe('Enchanted Stream (01095)', () => {
    it('has while_active ability type', () => {
        const ability = getLocationAbilityByType('01095', 'while_active');
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('-1 willpower');
    });

    it('is detected as active', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01095', name: 'Enchanted Stream' }),
                progress: 0,
            },
        });

        expect(isEnchantedStreamActive(state)).toBe(true);
    });

    it('applies -1 willpower modifier when active', () => {
        const stateWithStream = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01095', name: 'Enchanted Stream' }),
                progress: 0,
            },
        });

        const stateWithoutStream = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01099', name: 'Old Forest Road' }),
                progress: 0,
            },
        });

        expect(getActiveLocationWillpowerModifier(stateWithStream)).toBe(-1);
        expect(getActiveLocationWillpowerModifier(stateWithoutStream)).toBe(0);
    });

    it('returns no modifier when no active location', () => {
        const state = makeTestState({ activeLocation: null });
        expect(getActiveLocationWillpowerModifier(state)).toBe(0);
    });
});

// ── While Active Effect Helpers ──────────────────────────────────────────────

describe('While Active Effect Helpers', () => {
    it('detects while active effect on Mountains of Mirkwood', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01101', name: 'Mountains of Mirkwood' }),
                progress: 0,
            },
        });

        expect(hasWhileActiveEffect(state)).toBe(true);
        expect(getWhileActiveEffectDescription(state)).toContain('cannot use card effects');
    });

    it('detects while active effect on Enchanted Stream', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01095', name: 'Enchanted Stream' }),
                progress: 0,
            },
        });

        expect(hasWhileActiveEffect(state)).toBe(true);
        expect(getWhileActiveEffectDescription(state)).toContain('-1 willpower');
    });

    it('returns false for locations without while active effect', () => {
        const state = makeTestState({
            activeLocation: {
                card: makeTestLocation({ code: '01099', name: 'Old Forest Road' }),
                progress: 0,
            },
        });

        expect(hasWhileActiveEffect(state)).toBe(false);
        expect(getWhileActiveEffectDescription(state)).toBeNull();
    });

    it('returns false when no active location', () => {
        const state = makeTestState({ activeLocation: null });

        expect(hasWhileActiveEffect(state)).toBe(false);
        expect(getWhileActiveEffectDescription(state)).toBeNull();
    });
});

// ── Locations Without Abilities ──────────────────────────────────────────────

describe('Locations Without Abilities', () => {
    it('can travel to location without abilities', () => {
        const state = makeTestState();
        const location = makeTestLocation({ code: 'generic-location', name: 'Generic Location' });

        const canPay = canPayTravelCost(state, location, 'player1');
        expect(canPay.canPay).toBe(true);
    });

    it('returns empty result for travel cost on location without cost', () => {
        const state = makeTestState();
        const location = makeTestLocation({ code: 'generic-location', name: 'Generic Location' });

        const result = resolveTravelCost(state, location, 'player1');
        expect(result.success).toBe(true);
        expect(result.log).toEqual([]);
    });

    it('returns empty result for after traveling on location without response', () => {
        const state = makeTestState();
        const location = makeTestLocation({ code: 'generic-location', name: 'Generic Location' });

        const result = resolveAfterTraveling(state, location, 'player1');
        expect(result.success).toBe(true);
        expect(result.log).toEqual([]);
    });

    it('returns empty result for after exploring on location without response', () => {
        const state = makeTestState();
        const location = makeTestLocation({ code: 'generic-location', name: 'Generic Location' });

        const result = resolveAfterExploring(state, location, 'player1');
        expect(result.success).toBe(true);
        expect(result.log).toEqual([]);
    });
});
