/**
 * Unit tests for Legolas (01005) — Progress on enemy kill (Response).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01005-legolas';
import {
    getAbilities,
    activateAbility,
    getTriggeredAbilities,
    resetRoundAbilities,
} from '../../cardAbilities';
import { makeTestHero, makeTestEnemy, makeTestState } from '../testUtils';

describe('Legolas (01005) - Registry', () => {
    it('is registered', () => {
        const abilities = getAbilities('01005');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('legolas-progress');
    });
});

describe('Legolas (01005) - Progress on Enemy Kill', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('triggers when Legolas destroys an enemy', () => {
        const legolas = makeTestHero({
            code: '01005',
            name: 'Legolas',
        });

        const state = makeTestState({
            questProgress: 0,
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [legolas],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const triggered = getTriggeredAbilities(state, 'player1', 'after_enemy_destroyed', {
            attackingCharacter: { type: 'hero', code: '01005', index: 0 },
            destroyedEnemy: makeTestEnemy(),
        });

        expect(triggered.length).toBe(1);
        expect(triggered[0].id).toBe('legolas-progress');
    });

    it('does not trigger when another hero destroys an enemy', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
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

        const triggered = getTriggeredAbilities(state, 'player1', 'after_enemy_destroyed', {
            attackingCharacter: { type: 'hero', code: '01001', index: 0 },
            destroyedEnemy: makeTestEnemy(),
        });

        // Legolas ability should not trigger for Aragorn's kill
        const legolasAbility = triggered.find((a) => a.id === 'legolas-progress');
        expect(legolasAbility).toBeUndefined();
    });

    it('places 2 progress when activated', () => {
        const legolas = makeTestHero({
            code: '01005',
            name: 'Legolas',
        });

        const state = makeTestState({
            questProgress: 3,
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [legolas],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'legolas-progress', '01005', {
            attackingCharacter: { type: 'hero', code: '01005', index: 0 },
        });

        expect(result.success).toBe(true);
        expect(result.state.questProgress).toBe(5);
        expect(result.log.some((m) => m.includes('2 progress'))).toBe(true);
    });
});
