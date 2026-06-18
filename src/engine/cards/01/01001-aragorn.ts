/**
 * Aragorn (01001)
 *
 * Action: Spend 1 resource from Aragorn's pool to ready him. (Limit once per phase.)
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'aragorn-ready',
    cardCode: '01001',
    cardName: 'Aragorn',
    type: AbilityType.Action,
    trigger: AbilityTrigger.Manual,
    cost: {
        resources: 1,
        resourcesFromPool: '01001', // Aragorn's own pool
    },
    effect: {
        type: EffectType.ReadySelf,
    },
    limit: AbilityLimit.OncePerPhase,
    description: 'Spend 1 resource to ready Aragorn.',
});
