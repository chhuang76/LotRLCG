/**
 * Unit tests for Forest Spider (01096) — When Engaged: +1 Attack until end of round.
 */

import { describe, it, expect } from 'vitest';
import './01096-forest-spider';
import {
    getEnemyAbilities,
    hasEnemyAbility,
    getEnemyAbilityByType,
    resolveWhenEngaged,
    EnemyAbilityType,
} from '../../enemyAbilities';
import { engageEnemy, stepRefresh } from '../../gameEngine';
import { createEnemy, createPlayer, createActiveEnemy, createGameState } from '../encounterTestUtils';

describe('Forest Spider (01096) - Registry', () => {
    it('is registered', () => {
        const abilities = getEnemyAbilities('01096');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBe('Forest Spider');
    });

    it('has when_engaged ability type', () => {
        expect(hasEnemyAbility('01096', EnemyAbilityType.WhenEngaged)).toBe(true);
    });

    it('is resolvable by type with the expected description', () => {
        const ability = getEnemyAbilityByType('01096', EnemyAbilityType.WhenEngaged);
        expect(ability).toBeDefined();
        expect(ability?.description).toContain('+1 Attack');
    });
});

describe('Forest Spider (01096) - When Engaged', () => {
    it('reports a +1 attack modifier when its effect resolves', () => {
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

    it('gains +1 attack bonus when it engages (via engageEnemy)', () => {
        const enemy = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            attack: 2,
        });

        const state = createGameState({
            players: [createPlayer()],
            stagingArea: [enemy],
        });

        const result = engageEnemy(state, enemy, 0, 'player1');

        expect(result.state.players[0].engagedEnemies[0].attackBonus).toBe(1);
    });

    it('gives each of two engaged Forest Spiders exactly +1 (not stacked)', () => {
        const spiderA = createEnemy({ code: '01096', name: 'Forest Spider', attack: 2, engagement_cost: 25 });
        const spiderB = createEnemy({ code: '01096', name: 'Forest Spider', attack: 2, engagement_cost: 25 });

        let state = createGameState({
            players: [createPlayer({ threat: 30 })],
            stagingArea: [spiderA, spiderB],
        });

        // Engage them one at a time, the way stepEncounter does.
        state = engageEnemy(state, spiderA, 0, 'player1').state;
        state = engageEnemy(state, spiderB, 0, 'player1').state;

        const bonuses = state.players[0].engagedEnemies.map((e) => e.attackBonus ?? 0);
        expect(bonuses).toEqual([1, 1]);
    });

    it('attack bonus expires at the end of the round (via refresh phase)', () => {
        const enemy = createEnemy({
            code: '01096',
            name: 'Forest Spider',
            attack: 2,
        });

        const state = createGameState({
            players: [createPlayer()],
            stagingArea: [enemy],
        });

        // Engage: gains +1 attack for the round.
        const engaged = engageEnemy(state, enemy, 0, 'player1');
        expect(engaged.state.players[0].engagedEnemies[0].attackBonus).toBe(1);

        // Run the actual Refresh phase (end of round) — the bonus must reset.
        const refreshed = stepRefresh(engaged.state);
        expect(refreshed.state.players[0].engagedEnemies[0].attackBonus).toBe(0);
    });
});
