/**
 * Mountains of Mirkwood (01078)
 *
 * Travel: Reveal the top card of the encounter deck and add it to the staging
 * area to travel here.
 *
 * Note: The "while active" text was from an older interpretation. The actual
 * card has a travel cost and an after-exploring response.
 */

import { registerLocationAbility, LocationAbilityType } from '../../locationAbilities';

registerLocationAbility({
    code: '01078',
    name: 'Mountains of Mirkwood',
    type: LocationAbilityType.TravelCost,
    description: 'Reveal the top card of the encounter deck and add it to the staging area.',
    execute: (state, _location, _playerId) => {
        // Reveal top card of encounter deck
        if (state.encounterDeck.length === 0) {
            return {
                state,
                log: ['Mountains of Mirkwood: No cards in encounter deck to reveal.'],
                success: true,
            };
        }

        const [revealedCard, ...remainingDeck] = state.encounterDeck;
        const newState = {
            ...state,
            encounterDeck: remainingDeck,
            stagingArea: [...state.stagingArea, { card: revealedCard, damage: 0, progress: 0 }],
        };

        return {
            state: newState,
            log: [`Mountains of Mirkwood Travel Cost: Revealed ${revealedCard.name} to staging area.`],
            success: true,
        };
    },
});
