/**
 * Unit tests for Éowyn (01007) — Action: discard a card for +1 Willpower.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01007-eowyn';
import {
    getAbilities,
    activateAbility,
    canUseAbility,
    getAbilityById,
    getEffectiveWillpower,
    clearStatModifiers,
    resetRoundAbilities,
    AbilityType,
    AbilityTrigger,
} from '../../cardAbilities';
import { makeTestHero, makeTestAttachment, makeTestState } from '../testUtils';

function stateWithEowyn(handSize: number) {
    const eowyn = makeTestHero({ code: '01007', name: 'Éowyn', willpower: 4 });
    const hand = Array.from({ length: handSize }, (_, i) =>
        makeTestAttachment({ code: `hand-${i}`, name: `Hand Card ${i}` })
    );
    return makeTestState({
        players: [{
            id: 'player1',
            name: 'Test Player',
            threat: 28,
            heroes: [eowyn],
            allies: [],
            deck: [],
            hand,
            discard: [],
            engagedEnemies: [],
        }],
    });
}

describe('Éowyn (01007) - Registry', () => {
    it('is registered as a manual Action', () => {
        const abilities = getAbilities('01007');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('eowyn-willpower');
        expect(abilities[0].type).toBe(AbilityType.Action);
        expect(abilities[0].trigger).toBe(AbilityTrigger.Manual);
    });
});

describe('Éowyn (01007) - Willpower boost', () => {
    beforeEach(() => {
        resetRoundAbilities();
        clearStatModifiers('01007');
    });

    it('discards 1 card and grants +1 Willpower', () => {
        const state = stateWithEowyn(2);

        const result = activateAbility(state, 'player1', 'eowyn-willpower', '01007');

        expect(result.success).toBe(true);
        expect(result.state.players[0].hand.length).toBe(1);
        expect(result.state.players[0].discard.length).toBe(1);
        expect(getEffectiveWillpower(result.state, 'player1', '01007')).toBe(5); // 4 + 1
    });

    it('fails when there are no cards to discard', () => {
        const state = stateWithEowyn(0);

        const result = activateAbility(state, 'player1', 'eowyn-willpower', '01007');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough cards to discard');
    });

    it('can only be used once per round', () => {
        const state = stateWithEowyn(2);

        const first = activateAbility(state, 'player1', 'eowyn-willpower', '01007');
        expect(first.success).toBe(true);

        const ability = getAbilityById('eowyn-willpower')!;
        expect(canUseAbility('player1', ability).canUse).toBe(false);
    });
});
