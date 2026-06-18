/**
 * Unit tests for Aragorn (01001) — Ready ability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01001-aragorn';
import {
    getAbilities,
    getAbilityById,
    activateAbility,
    resetPhaseAbilities,
    resetRoundAbilities,
} from '../../cardAbilities';
import { makeTestHero, makeTestState } from '../testUtils';

describe('Aragorn (01001) - Registry', () => {
    it('is registered', () => {
        const abilities = getAbilities('01001');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('aragorn-ready');
    });

    it('is resolvable by id', () => {
        const ability = getAbilityById('aragorn-ready');
        expect(ability).not.toBeUndefined();
        expect(ability?.cardCode).toBe('01001');
    });
});

describe('Aragorn (01001) - Ready Ability', () => {
    beforeEach(() => {
        resetPhaseAbilities();
        resetRoundAbilities();
    });

    it('readies Aragorn when activated with sufficient resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 2,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(false);
        expect(result.state.players[0].heroes[0].resources).toBe(1);
        expect(result.log.some((m) => m.includes('readied'))).toBe(true);
    });

    it('fails if Aragorn has no resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 0,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough resources');
    });

    it('can only be used once per phase', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // First activation
        const result1 = activateAbility(state, 'player1', 'aragorn-ready', '01001');
        expect(result1.success).toBe(true);

        // Exhaust Aragorn again for second attempt
        const state2 = {
            ...result1.state,
            players: result1.state.players.map((p) => ({
                ...p,
                heroes: p.heroes.map((h) => ({ ...h, exhausted: true })),
            })),
        };

        // Second activation should fail (once per phase)
        const result2 = activateAbility(state2, 'player1', 'aragorn-ready', '01001');
        expect(result2.success).toBe(false);
        expect(result2.error).toContain('Already used this phase');
    });

    it('can be used again after phase reset', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // First activation
        const result1 = activateAbility(state, 'player1', 'aragorn-ready', '01001');
        expect(result1.success).toBe(true);

        // Reset phase abilities
        resetPhaseAbilities();

        // Exhaust Aragorn again
        const state2 = {
            ...result1.state,
            players: result1.state.players.map((p) => ({
                ...p,
                heroes: p.heroes.map((h) => ({ ...h, exhausted: true })),
            })),
        };

        // Second activation should work after phase reset
        const result2 = activateAbility(state2, 'player1', 'aragorn-ready', '01001');
        expect(result2.success).toBe(true);
    });
});
