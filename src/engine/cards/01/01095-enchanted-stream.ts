/**
 * Enchanted Stream (01095)
 *
 * While Active: While Enchanted Stream is the active location, each character
 * gets −1 Willpower.
 *
 * Note: This is a constant effect; the actual willpower reduction is computed
 * when needed (see `getActiveLocationWillpowerModifier` in locationAbilities).
 */

import { registerLocationAbility, LocationAbilityType } from '../../locationAbilities';

registerLocationAbility({
    code: '01095',
    name: 'Enchanted Stream',
    type: LocationAbilityType.WhileActive,
    description: 'Each character gets -1 willpower.',
    execute: (state, _location, _playerId) => {
        // This is a passive effect - just log it
        return {
            state,
            log: ['Enchanted Stream: All characters get -1 Willpower while active.'],
            success: true,
        };
    },
});
