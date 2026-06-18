/**
 * Unit tests for Gimli (01004) — Damage-based attack bonus.
 */

import { describe, it, expect } from 'vitest';
import './01004-gimli';
import { getGimliAttackBonus } from './01004-gimli';
import { getAbilities, getEffectiveAttack } from '../../cardAbilities';
import { makeTestHero, makeTestState } from '../testUtils';

describe('Gimli (01004) - Registry', () => {
    it('is registered', () => {
        const abilities = getAbilities('01004');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('gimli-damage-attack');
    });
});

describe('Gimli (01004) - Damage Attack Bonus', () => {
    it('calculates attack bonus based on damage', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const bonus = getGimliAttackBonus(state, 'player1');
        expect(bonus).toBe(3);
    });

    it('returns 0 bonus when Gimli has no damage', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 0,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const bonus = getGimliAttackBonus(state, 'player1');
        expect(bonus).toBe(0);
    });

    it('getEffectiveAttack includes damage bonus', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 4,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const effectiveAttack = getEffectiveAttack(state, 'player1', '01004');
        expect(effectiveAttack).toBe(6); // 2 base + 4 damage
    });
});
