/**
 * Despair (01104)
 *
 * When Revealed: Raise each player's threat by 3.
 */

import type { GameState, EncounterCard } from '../../types';
import { registerTreachery, type TreacheryResult } from '../../treacheryEffects';

export function resolveDespair(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    let nextState = { ...state };

    const updatedPlayers = nextState.players.map((player) => {
        const newThreat = Math.min(50, player.threat + 3);
        logs.push(`${player.name}'s threat raised by 3 (now ${newThreat}).`);
        return { ...player, threat: newThreat };
    });

    nextState = { ...nextState, players: updatedPlayers };

    // Check for threat elimination
    const eliminated = nextState.players.filter((p) => p.threat >= 50);
    if (eliminated.length > 0) {
        logs.push(`${eliminated.map((p) => p.name).join(', ')} eliminated by threat!`);
        nextState = { ...nextState, phase: 'game_over' };
    }

    return { state: nextState, log: logs, discard: true };
}

registerTreachery('01104', resolveDespair);
