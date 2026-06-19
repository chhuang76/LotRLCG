/**
 * Éowyn (01007)
 *
 * Action: Discard 1 card from your hand to give Éowyn +1 Willpower until the end
 * of the phase. This effect may be triggered by each player once each round.
 *
 * Self-contained: the discard cost lives in the `canPay`/`payCost` hooks and the
 * +1 Willpower is granted in `resolve` via the stat-modifier helper.
 *
 * NOTE: The "until end of phase" expiry is not yet modeled (a general limitation
 * of ability-granted stat modifiers); the once-per-round limit bounds repeated use.
 */

import {
    registerAbility,
    AbilityType,
    AbilityTrigger,
    AbilityLimit,
    grantStatModifier,
    handSize,
    discardFromHand,
} from '../../cardAbilities';

const CARD_CODE = '01007';
const CARD_NAME = 'Éowyn';
const DISCARD_COST = 1;

registerAbility({
    id: 'eowyn-willpower',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Action,
    trigger: AbilityTrigger.Manual,
    limit: AbilityLimit.OncePerRound,
    description: 'Discard 1 card to give Éowyn +1 Willpower until end of phase.',
    canPay: (state, playerId) =>
        handSize(state, playerId) >= DISCARD_COST
            ? { canPay: true }
            : { canPay: false, reason: `Not enough cards to discard (need ${DISCARD_COST}).` },
    payCost: (state, playerId) => discardFromHand(state, playerId, DISCARD_COST),
    resolve: (state, playerId) => {
        const { state: nextState, log } = grantStatModifier(
            state,
            playerId,
            CARD_CODE,
            'willpower',
            1,
            CARD_CODE,
            CARD_NAME
        );
        return { state: nextState, log, success: true };
    },
});
