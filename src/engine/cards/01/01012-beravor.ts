/**
 * Beravor (01012)
 *
 * Action: Exhaust Beravor to choose a player. That player draws 2 cards.
 * (Limit once per round.)
 *
 * Self-contained: the exhaust cost lives in the `canPay`/`payCost` hooks and the
 * draw is implemented in `resolve`.
 *
 * NOTE: Single-player implementation draws for the acting player. The
 * "choose a player" targeting is a multiplayer concern (deferred).
 */

import {
    registerAbility,
    AbilityType,
    AbilityTrigger,
    AbilityLimit,
    drawCards,
    heroIsReady,
    exhaustHero,
} from '../../cardAbilities';

const CARD_CODE = '01012';
const CARD_NAME = 'Beravor';
const DRAW_COUNT = 2;

registerAbility({
    id: 'beravor-draw',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Action,
    trigger: AbilityTrigger.Manual,
    limit: AbilityLimit.OncePerRound,
    description: 'Exhaust Beravor: a player draws 2 cards.',
    canPay: (state, playerId) =>
        heroIsReady(state, playerId, CARD_CODE)
            ? { canPay: true }
            : { canPay: false, reason: `${CARD_NAME} is already exhausted.` },
    payCost: (state, playerId) => exhaustHero(state, playerId, CARD_CODE),
    resolve: (state, playerId) => {
        const { state: nextState, log } = drawCards(state, playerId, DRAW_COUNT, CARD_NAME);
        return { state: nextState, log, success: true };
    },
});
