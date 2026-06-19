/**
 * Steward of Gondor (01026)
 *
 * Action: Exhaust Steward of Gondor to add 2 resources to attached hero's pool.
 *
 * Declarative attachment ability: the exhaust-self cost and the
 * `GainResources` effect are resolved by the engine's declarative cost/effect
 * machinery (no card-specific engine code).
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'steward-resources',
    cardCode: '01026',
    cardName: 'Steward of Gondor',
    type: AbilityType.Action,
    trigger: AbilityTrigger.Manual,
    cost: {
        exhaustSelf: true, // Exhaust the attachment
    },
    effect: {
        type: EffectType.GainResources,
        amount: 2,
        target: 'attached_hero',
    },
    limit: AbilityLimit.Unlimited, // Can use every round once readied
    description: 'Exhaust to add 2 resources to attached hero.',
});
