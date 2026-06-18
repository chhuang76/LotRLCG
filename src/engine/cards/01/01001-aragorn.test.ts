/**
 * Unit tests for Aragorn (01001) — Response: ready after committing to a quest.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01001-aragorn';
import {
    getAbilities,
    getAbilityById,
    activateAbility,
    getTriggeredAbilities,
    resetRoundAbilities,
    AbilityType,
    AbilityTrigger,
} from '../../cardAbilities';
import type { CharacterRef } from '../../types';
import { makeTestHero, makeTestState } from '../testUtils';

const aragornCommitted: CharacterRef[] = [{ type: 'hero', code: '01001', index: 0 }];

function stateWithAragorn(overrides: { exhausted?: boolean; resources?: number } = {}) {
    const aragorn = makeTestHero({
        code: '01001',
        name: 'Aragorn',
        exhausted: overrides.exhausted ?? true,
        resources: overrides.resources ?? 2,
    });
    return makeTestState({
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
}

describe('Aragorn (01001) - Registry', () => {
    it('is registered as a quest-commit Response', () => {
        const abilities = getAbilities('01001');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('aragorn-ready');
        expect(abilities[0].type).toBe(AbilityType.Response);
        expect(abilities[0].trigger).toBe(AbilityTrigger.AfterCommitToQuest);
    });

    it('is resolvable by id', () => {
        const ability = getAbilityById('aragorn-ready');
        expect(ability).not.toBeUndefined();
        expect(ability?.cardCode).toBe('01001');
    });
});

describe('Aragorn (01001) - Response trigger', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('triggers after Aragorn commits to a quest (committed and exhausted)', () => {
        const state = stateWithAragorn({ exhausted: true });

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterCommitToQuest, {
            committedCharacters: aragornCommitted,
        });

        expect(triggered.length).toBe(1);
        expect(triggered[0].id).toBe('aragorn-ready');
    });

    it('does not trigger when Aragorn did not commit to the quest', () => {
        const state = stateWithAragorn({ exhausted: true });

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterCommitToQuest, {
            committedCharacters: [], // Aragorn not committed
        });

        expect(triggered.find((a) => a.id === 'aragorn-ready')).toBeUndefined();
    });

    it('does not trigger when Aragorn is already ready (not exhausted)', () => {
        const state = stateWithAragorn({ exhausted: false });

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterCommitToQuest, {
            committedCharacters: aragornCommitted,
        });

        expect(triggered.find((a) => a.id === 'aragorn-ready')).toBeUndefined();
    });
});

describe('Aragorn (01001) - Ready effect', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('readies Aragorn and spends 1 resource when activated', () => {
        const state = stateWithAragorn({ exhausted: true, resources: 2 });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(false);
        expect(result.state.players[0].heroes[0].resources).toBe(1);
        expect(result.log.some((m) => m.includes('readied'))).toBe(true);
    });

    it('fails if Aragorn has no resources', () => {
        const state = stateWithAragorn({ exhausted: true, resources: 0 });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough resources');
    });
});
