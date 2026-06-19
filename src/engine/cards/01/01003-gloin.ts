/**
 * Glóin (01003)
 *
 * Response: After Glóin suffers damage, add 1 resource to his resource pool for
 * each point of damage he just suffered.
 *
 * Self-contained: the resource gain (derived from `context.damageTaken`) is
 * implemented in the `resolve` hook, so no engine switch case is needed.
 */

import {
    registerAbility,
    AbilityType,
    AbilityTrigger,
    AbilityLimit,
    addResources,
} from '../../cardAbilities';

const CARD_CODE = '01003';
const CARD_NAME = 'Glóin';

registerAbility({
    id: 'gloin-resources',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterDamageTaken,
    limit: AbilityLimit.Unlimited,
    description: 'After Glóin suffers damage, add 1 resource per point of damage suffered.',
    resolve: (state, playerId, context) => {
        const amount = context?.damageTaken ?? 0;
        const { state: nextState, log } = addResources(state, playerId, CARD_CODE, amount, CARD_NAME);
        return { state: nextState, log, success: true };
    },
    // Triggers only when the hero that just suffered damage is Glóin.
    condition: (_state, _playerId, context) =>
        context?.damagedHeroCode === CARD_CODE && (context?.damageTaken ?? 0) > 0,
});
