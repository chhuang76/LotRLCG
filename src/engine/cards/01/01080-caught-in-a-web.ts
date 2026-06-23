/**
 * Caught in a Web (01080)
 *
 * When Revealed: The player with the highest threat level attaches this card to
 * one of his heroes. (Counts as a Condition attachment with the text: "Attached
 * hero cannot collect resources during the resource phase.")
 *
 * For now, we attach to the first hero. In a full implementation, the player
 * would choose.
 */

import type { GameState, EncounterCard, AttachedCard } from '../../types';
import { registerTreachery, type TreacheryResult } from '../../treacheryEffects';

export function resolveCaughtInAWeb(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    let nextState = { ...state };
    const player = nextState.players[0];

    if (!player || player.heroes.length === 0) {
        logs.push('No heroes to attach Caught in a Web to.');
        return { state, log: logs, discard: true };
    }

    // Attach to first hero (simplified - should be player choice)
    const targetHero = player.heroes[0];
    logs.push(`Caught in a Web attaches to ${targetHero.name}.`);
    logs.push(`${targetHero.name} cannot collect resources during the resource phase.`);

    // Create condition attachment
    const conditionAttachment: AttachedCard = {
        code: card.code,
        name: card.name,
        type_code: 'attachment',
        text: 'Attached hero cannot collect resources during the resource phase.',
        traits: 'Condition.',
        quantity: 1,
        exhausted: false,
    };

    const updatedHeroes = player.heroes.map((h) =>
        h.code === targetHero.code
            ? { ...h, attachments: [...h.attachments, conditionAttachment] }
            : h
    );

    nextState = {
        ...nextState,
        players: nextState.players.map((p) =>
            p.id === player.id ? { ...p, heroes: updatedHeroes } : p
        ),
    };

    // Do NOT discard - it's attached as a condition
    return { state: nextState, log: logs, discard: false };
}

registerTreachery('01080', resolveCaughtInAWeb);
