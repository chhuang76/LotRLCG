/**
 * Aragorn (01001)
 *
 * Response: After Aragorn commits to a quest, spend 1 resource from his
 * resource pool to ready him.
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'aragorn-ready',
    cardCode: '01001',
    cardName: 'Aragorn',
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterCommitToQuest,
    cost: {
        resources: 1,
        resourcesFromPool: '01001', // Aragorn's own pool
    },
    effect: {
        type: EffectType.ReadySelf,
    },
    limit: AbilityLimit.Unlimited,
    description: 'After committing to a quest, spend 1 resource to ready Aragorn.',
    // Triggers only after Aragorn commits to a quest (and is therefore exhausted).
    condition: (state, playerId, context) => {
        const committed = context?.committedCharacters ?? [];
        const isCommitted = committed.some((c) => c.type === 'hero' && c.code === '01001');
        if (!isCommitted) return false;

        const player = state.players.find((p) => p.id === playerId);
        const aragorn = player?.heroes.find((h) => h.code === '01001');
        return !!aragorn?.exhausted;
    },
});
