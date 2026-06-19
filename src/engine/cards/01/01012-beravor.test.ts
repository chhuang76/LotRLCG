/**
 * Unit tests for Beravor (01012) — Action: exhaust to draw 2 cards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import './01012-beravor';
import {
    getAbilities,
    activateAbility,
    canUseAbility,
    getAbilityById,
    resetRoundAbilities,
    AbilityType,
    AbilityTrigger,
} from '../../cardAbilities';
import { makeTestHero, makeTestAttachment, makeTestState } from '../testUtils';

function stateWithBeravor(opts: { exhausted?: boolean; deckSize?: number } = {}) {
    const beravor = makeTestHero({ code: '01012', name: 'Beravor', exhausted: opts.exhausted ?? false });
    const deck = Array.from({ length: opts.deckSize ?? 3 }, (_, i) =>
        makeTestAttachment({ code: `deck-${i}`, name: `Deck Card ${i}` })
    );
    return makeTestState({
        players: [{
            id: 'player1',
            name: 'Test Player',
            threat: 28,
            heroes: [beravor],
            allies: [],
            deck,
            hand: [],
            discard: [],
            engagedEnemies: [],
        }],
    });
}

describe('Beravor (01012) - Registry', () => {
    it('is registered as a manual Action', () => {
        const abilities = getAbilities('01012');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('beravor-draw');
        expect(abilities[0].type).toBe(AbilityType.Action);
        expect(abilities[0].trigger).toBe(AbilityTrigger.Manual);
    });
});

describe('Beravor (01012) - Draw ability', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('exhausts Beravor and draws 2 cards', () => {
        const state = stateWithBeravor({ deckSize: 3 });

        const result = activateAbility(state, 'player1', 'beravor-draw', '01012');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(true);
        expect(result.state.players[0].hand.length).toBe(2);
        expect(result.state.players[0].deck.length).toBe(1);
    });

    it('fails when Beravor is already exhausted', () => {
        const state = stateWithBeravor({ exhausted: true });

        const result = activateAbility(state, 'player1', 'beravor-draw', '01012');

        expect(result.success).toBe(false);
        expect(result.error).toContain('already exhausted');
    });

    it('can only be used once per round', () => {
        const state = stateWithBeravor({ deckSize: 4 });

        const first = activateAbility(state, 'player1', 'beravor-draw', '01012');
        expect(first.success).toBe(true);

        const ability = getAbilityById('beravor-draw')!;
        expect(canUseAbility('player1', ability).canUse).toBe(false);
    });
});
