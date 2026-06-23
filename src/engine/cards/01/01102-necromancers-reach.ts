/**
 * The Necromancer's Reach (01102)
 *
 * When Revealed: Assign 1 damage to each exhausted character.
 */

import type { GameState, EncounterCard } from '../../types';
import { registerTreachery, type TreacheryResult } from '../../treacheryEffects';

export function resolveNecromancersReach(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    let nextState = { ...state };

    // Damage each exhausted character (heroes and allies)
    const updatedPlayers = nextState.players.map((player) => {
        const updatedHeroes = player.heroes.map((hero) => {
            if (hero.exhausted) {
                const newDamage = hero.damage + 1;
                const isDefeated = newDamage >= (hero.health ?? 99);
                logs.push(`${hero.name} takes 1 damage from The Necromancer's Reach (now ${newDamage}/${hero.health}).`);
                if (isDefeated) {
                    logs.push(`${hero.name} is defeated!`);
                }
                return { ...hero, damage: newDamage };
            }
            return hero;
        });

        const updatedAllies = player.allies.map((ally) => {
            if (ally.exhausted) {
                const newDamage = ally.damage + 1;
                const isDestroyed = newDamage >= (ally.health ?? 99);
                logs.push(`${ally.name} takes 1 damage from The Necromancer's Reach (now ${newDamage}/${ally.health}).`);
                if (isDestroyed) {
                    logs.push(`${ally.name} is destroyed!`);
                }
                return { ...ally, damage: newDamage };
            }
            return ally;
        });

        // Remove destroyed allies
        const survivingAllies = updatedAllies.filter((a) => a.damage < (a.health ?? 99));
        const destroyedAllies = updatedAllies.filter((a) => a.damage >= (a.health ?? 99));

        return {
            ...player,
            heroes: updatedHeroes,
            allies: survivingAllies,
            discard: [...player.discard, ...destroyedAllies],
        };
    });

    nextState = { ...nextState, players: updatedPlayers };

    // Check for game over (all heroes defeated)
    const allHeroesDefeated = nextState.players.every((p) =>
        p.heroes.every((h) => h.damage >= (h.health ?? 99))
    );
    if (allHeroesDefeated) {
        logs.push('All heroes are defeated — the players lose!');
        nextState = { ...nextState, phase: 'game_over' };
    }

    return { state: nextState, log: logs, discard: true };
}

registerTreachery('01102', resolveNecromancersReach);
