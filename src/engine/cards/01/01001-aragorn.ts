/**
 * Aragorn (01001)
 *
 * Response: After Aragorn commits to a quest, spend 1 resource from his
 * resource pool to ready him.
 *
 * Self-contained: behavior lives here via `resolve` + cost hooks composed from
 * the engine's reusable helpers — no edits to the engine switch required.
 */

import {
    registerAbility,
    AbilityType,
    AbilityTrigger,
    AbilityLimit,
    readyHero,
    heroHasResources,
    spendResources,
} from '../../cardAbilities';

const CARD_CODE = '01001';
const CARD_NAME = 'Aragorn';
const RESOURCE_COST = 1;

registerAbility({
    id: 'aragorn-ready',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterCommitToQuest,
    limit: AbilityLimit.Unlimited,
    description: 'After committing to a quest, spend 1 resource to ready Aragorn.',
    canPay: (state, playerId) =>
        heroHasResources(state, playerId, CARD_CODE, RESOURCE_COST)
            ? { canPay: true }
            : { canPay: false, reason: `Not enough resources (need ${RESOURCE_COST}).` },
    payCost: (state, playerId) => spendResources(state, playerId, CARD_CODE, RESOURCE_COST),
    resolve: (state, playerId) => {
        const { state: nextState, log } = readyHero(state, playerId, CARD_CODE, CARD_NAME);
        return { state: nextState, log, success: true };
    },
    // Triggers only after Aragorn commits to a quest (and is therefore exhausted).
    condition: (state, playerId, context) => {
        const committed = context?.committedCharacters ?? [];
        const isCommitted = committed.some((c) => c.type === 'hero' && c.code === CARD_CODE);
        if (!isCommitted) return false;

        const player = state.players.find((p) => p.id === playerId);
        const aragorn = player?.heroes.find((h) => h.code === CARD_CODE);
        return !!aragorn?.exhausted;
    },
});
