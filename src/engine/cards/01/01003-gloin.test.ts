/**
 * Unit tests for Glóin (01003) — Response: gain resources equal to damage suffered.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01003-gloin';
import {
    getAbilities,
    getTriggeredAbilities,
    activateAbility,
    resetRoundAbilities,
    AbilityType,
    AbilityTrigger,
} from '../../cardAbilities';
import { makeTestHero, makeTestState } from '../testUtils';

function stateWithGloin(resources = 0) {
    const gloin = makeTestHero({ code: '01003', name: 'Glóin', resources, health: 4 });
    return makeTestState({
        players: [{
            id: 'player1',
            name: 'Test Player',
            threat: 28,
            heroes: [gloin],
            allies: [],
            deck: [],
            hand: [],
            discard: [],
            engagedEnemies: [],
        }],
    });
}

describe('Glóin (01003) - Registry', () => {
    it('is registered as an after-damage Response', () => {
        const abilities = getAbilities('01003');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('gloin-resources');
        expect(abilities[0].type).toBe(AbilityType.Response);
        expect(abilities[0].trigger).toBe(AbilityTrigger.AfterDamageTaken);
    });
});

describe('Glóin (01003) - Response trigger', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('triggers after Glóin suffers damage', () => {
        const state = stateWithGloin();

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterDamageTaken, {
            damagedHeroCode: '01003',
            damageTaken: 2,
        });

        expect(triggered.length).toBe(1);
        expect(triggered[0].id).toBe('gloin-resources');
    });

    it('does not trigger when a different hero suffers damage', () => {
        const state = stateWithGloin();

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterDamageTaken, {
            damagedHeroCode: '01999',
            damageTaken: 2,
        });

        expect(triggered.find((a) => a.id === 'gloin-resources')).toBeUndefined();
    });

    it('does not trigger when no damage was suffered', () => {
        const state = stateWithGloin();

        const triggered = getTriggeredAbilities(state, 'player1', AbilityTrigger.AfterDamageTaken, {
            damagedHeroCode: '01003',
            damageTaken: 0,
        });

        expect(triggered.find((a) => a.id === 'gloin-resources')).toBeUndefined();
    });
});

describe('Glóin (01003) - Resource gain', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('adds 1 resource per point of damage suffered', () => {
        const state = stateWithGloin(0);

        const result = activateAbility(state, 'player1', 'gloin-resources', '01003', {
            damagedHeroCode: '01003',
            damageTaken: 3,
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].resources).toBe(3);
        expect(result.log.some((m) => m.includes('gains 3 resources'))).toBe(true);
    });
});
