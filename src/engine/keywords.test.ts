/**
 * Unit tests for Keyword Parser and Handler System
 *
 * Tests the Surge and Doomed keyword detection and resolution.
 */

import { describe, it, expect } from 'vitest';
import {
    hasSurge,
    getDoomedValue,
    hasKeywords,
    resolveKeywords,
    parseKeywords,
    formatKeywords,
} from './keywords';
import type { GameState, EncounterCard } from './types';

// ── Test Fixtures ────────────────────────────────────────────────────────────

function makeTestCard(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: 'test-card',
        name: 'Test Card',
        type_code: 'enemy' as const,
        threat: 2,
        attack: 2,
        defense: 1,
        hit_points: 3,
        traits: '',
        text: '',
        engagement_cost: 25,
        ...overrides,
    };
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'quest_staging',
        step: 0,
        round: 1,
        activeLocation: null,
        questProgress: 0,
        currentQuest: {
            name: 'Test Quest',
            sequence: 1,
            questPoints: 10,
        },
        threatCap: 50,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [],
                deck: [],
                hand: [],
                engaged: [],
                resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                willpowerCommitted: 0,
            },
        ],
        stagingArea: [],
        encounterDeck: [],
        encounterDiscard: [],
        ...overrides,
    } as GameState;
}

// ── Surge Detection Tests ────────────────────────────────────────────────────

describe('hasSurge', () => {
    it('returns false for cards without Surge', () => {
        const card = makeTestCard({ text: 'No special keywords here.' });
        expect(hasSurge(card)).toBe(false);
    });

    it('detects Surge in the text field with period', () => {
        const card = makeTestCard({ text: 'Surge. When Revealed: Do something.' });
        expect(hasSurge(card)).toBe(true);
    });

    it('detects Surge in the text field at start', () => {
        const card = makeTestCard({ text: 'Surge' });
        expect(hasSurge(card)).toBe(true);
    });

    it('detects Surge in keywords field', () => {
        const card = makeTestCard() as any;
        card.keywords = 'Surge.';
        expect(hasSurge(card)).toBe(true);
    });

    it('detects Surge in traits field (edge case)', () => {
        const card = makeTestCard({ traits: 'Surge. Orc.' });
        expect(hasSurge(card)).toBe(true);
    });

    it('is case-insensitive', () => {
        const card = makeTestCard({ text: 'SURGE. When Revealed: Test.' });
        expect(hasSurge(card)).toBe(true);
    });

    it('detects surge in lowercase text', () => {
        const card = makeTestCard({ text: 'surge. reveal an additional card.' });
        expect(hasSurge(card)).toBe(true);
    });
});

// ── Doomed Detection Tests ───────────────────────────────────────────────────

describe('getDoomedValue', () => {
    it('returns 0 for cards without Doomed', () => {
        const card = makeTestCard({ text: 'No doom here.' });
        expect(getDoomedValue(card)).toBe(0);
    });

    it('detects Doomed 1 in text', () => {
        const card = makeTestCard({ text: 'Doomed 1. When Revealed: Test.' });
        expect(getDoomedValue(card)).toBe(1);
    });

    it('detects Doomed 2 in text', () => {
        const card = makeTestCard({ text: 'Doomed 2. Each player raises threat.' });
        expect(getDoomedValue(card)).toBe(2);
    });

    it('detects Doomed 3 in text', () => {
        const card = makeTestCard({ text: 'Doomed 3.' });
        expect(getDoomedValue(card)).toBe(3);
    });

    it('detects Doomed in keywords field', () => {
        const card = makeTestCard() as any;
        card.keywords = 'Doomed 2.';
        expect(getDoomedValue(card)).toBe(2);
    });

    it('detects Doomed in traits field (edge case)', () => {
        const card = makeTestCard({ traits: 'Doomed 1. Shadow.' });
        expect(getDoomedValue(card)).toBe(1);
    });

    it('is case-insensitive', () => {
        const card = makeTestCard({ text: 'DOOMED 2. Test effect.' });
        expect(getDoomedValue(card)).toBe(2);
    });

    it('handles doomed with space before number', () => {
        const card = makeTestCard({ text: 'Doomed  2' });
        expect(getDoomedValue(card)).toBe(2);
    });
});

// ── hasKeywords Tests ────────────────────────────────────────────────────────

describe('hasKeywords', () => {
    it('returns false for cards without keywords', () => {
        const card = makeTestCard({ text: 'Regular card text.' });
        expect(hasKeywords(card)).toBe(false);
    });

    it('returns true for cards with Surge', () => {
        const card = makeTestCard({ text: 'Surge.' });
        expect(hasKeywords(card)).toBe(true);
    });

    it('returns true for cards with Doomed', () => {
        const card = makeTestCard({ text: 'Doomed 1.' });
        expect(hasKeywords(card)).toBe(true);
    });

    it('returns true for cards with both Surge and Doomed', () => {
        const card = makeTestCard({ text: 'Surge. Doomed 2.' });
        expect(hasKeywords(card)).toBe(true);
    });
});

// ── resolveKeywords Tests ────────────────────────────────────────────────────

describe('resolveKeywords', () => {
    it('returns unchanged state for cards without keywords', () => {
        const state = makeTestState();
        const card = makeTestCard({ text: 'No keywords.' });

        const result = resolveKeywords(state, card);

        expect(result.state).toEqual(state);
        expect(result.log).toHaveLength(0);
        expect(result.surge).toBe(false);
    });

    it('raises threat for Doomed 1', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 28,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Doomed 1.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(29);
        expect(result.log.some((m) => m.includes('Doomed 1'))).toBe(true);
        expect(result.surge).toBe(false);
    });

    it('raises threat for Doomed 2', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 30,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Doomed 2.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(32);
        expect(result.log.some((m) => m.includes('Doomed 2'))).toBe(true);
    });

    it('raises threat for all players with Doomed', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Player 1',
                    threat: 25,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
                {
                    id: 'player2',
                    name: 'Player 2',
                    threat: 30,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Doomed 3.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(28);
        expect(result.state.players[1].threat).toBe(33);
    });

    it('caps threat at 50', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 48,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Doomed 5.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(50);
    });

    it('triggers threat elimination at 50', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 49,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Doomed 1.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(50);
        expect(result.state.phase).toBe('game_over');
        expect(result.log.some((m) => m.includes('eliminated'))).toBe(true);
    });

    it('returns surge flag for Surge keyword', () => {
        const state = makeTestState();
        const card = makeTestCard({ text: 'Surge.' });

        const result = resolveKeywords(state, card);

        expect(result.surge).toBe(true);
        expect(result.log.some((m) => m.includes('Surge'))).toBe(true);
    });

    it('handles both Doomed and Surge', () => {
        const state = makeTestState({
            players: [
                {
                    id: 'player1',
                    name: 'Test Player',
                    threat: 25,
                    heroes: [],
                    deck: [],
                    hand: [],
                    engaged: [],
                    resources: { leadership: 0, lore: 0, spirit: 0, tactics: 0 },
                    willpowerCommitted: 0,
                },
            ],
        });
        const card = makeTestCard({ text: 'Surge. Doomed 2.' });

        const result = resolveKeywords(state, card);

        expect(result.state.players[0].threat).toBe(27);
        expect(result.surge).toBe(true);
        expect(result.log.some((m) => m.includes('Doomed 2'))).toBe(true);
        expect(result.log.some((m) => m.includes('Surge'))).toBe(true);
    });
});

// ── parseKeywords Tests ──────────────────────────────────────────────────────

describe('parseKeywords', () => {
    it('returns empty array for cards without keywords', () => {
        const card = makeTestCard({ text: 'No keywords.' });
        expect(parseKeywords(card)).toEqual([]);
    });

    it('returns Surge for cards with Surge', () => {
        const card = makeTestCard({ text: 'Surge.' });
        expect(parseKeywords(card)).toEqual(['Surge']);
    });

    it('returns Doomed X for cards with Doomed', () => {
        const card = makeTestCard({ text: 'Doomed 2.' });
        expect(parseKeywords(card)).toEqual(['Doomed 2']);
    });

    it('returns both keywords for cards with both', () => {
        const card = makeTestCard({ text: 'Surge. Doomed 1.' });
        expect(parseKeywords(card)).toEqual(['Surge', 'Doomed 1']);
    });
});

// ── formatKeywords Tests ─────────────────────────────────────────────────────

describe('formatKeywords', () => {
    it('returns empty string for cards without keywords', () => {
        const card = makeTestCard({ text: 'No keywords.' });
        expect(formatKeywords(card)).toBe('');
    });

    it('formats single keyword with period', () => {
        const card = makeTestCard({ text: 'Surge.' });
        expect(formatKeywords(card)).toBe('Surge.');
    });

    it('formats multiple keywords with periods', () => {
        const card = makeTestCard({ text: 'Surge. Doomed 2.' });
        expect(formatKeywords(card)).toBe('Surge. Doomed 2.');
    });
});

// ── Integration with Real Card Data ──────────────────────────────────────────

describe('keyword detection with Mirkwood encounter cards', () => {
    it('detects no keywords on regular enemy', () => {
        const forestSpider = makeTestCard({
            code: 'core-spider',
            name: 'Forest Spider',
            type_code: 'enemy',
            text: 'When Forest Spider damages a character, attach it.',
        });
        expect(hasKeywords(forestSpider)).toBe(false);
    });

    it('detects Surge on Driven by Shadow', () => {
        const drivenByShadow = makeTestCard({
            code: 'core-driven',
            name: 'Driven by Shadow',
            type_code: 'treachery',
            text: 'Surge. Shadow: +1 Attack.',
        });
        expect(hasSurge(drivenByShadow)).toBe(true);
        expect(getDoomedValue(drivenByShadow)).toBe(0);
    });

    it('handles card with Doomed keyword format', () => {
        const doomedCard = makeTestCard({
            code: 'test-doomed',
            name: 'Doomed Card',
            type_code: 'treachery',
            text: 'Doomed 2. When Revealed: Do something.',
        });
        expect(getDoomedValue(doomedCard)).toBe(2);
        expect(hasSurge(doomedCard)).toBe(false);
    });

    it('handles hypothetical card with both Surge and Doomed', () => {
        const bothCard = makeTestCard({
            code: 'test-both',
            name: 'Terrible Treachery',
            type_code: 'treachery',
            text: 'Surge. Doomed 1. When Revealed: Discard a card.',
        });
        expect(hasSurge(bothCard)).toBe(true);
        expect(getDoomedValue(bothCard)).toBe(1);
    });
});
