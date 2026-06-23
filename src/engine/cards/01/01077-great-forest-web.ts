/**
 * Great Forest Web (01077)
 *
 * Attach to a hero. (Counts as a Condition attachment with the text:
 * "Attached hero cannot ready during the refresh phase unless you pay 2
 * resources from that hero's pool.")
 *
 * For now, we attach to the first hero. In a full implementation, the player
 * would choose.
 *
 * Note: 01077 is a location code in the current card data; this handler is
 * preserved from the original treachery registry for parity but is only invoked
 * when a treachery with this code is revealed.
 */

import type { GameState, EncounterCard, AttachedCard } from '../../types';
import { registerTreachery, type TreacheryResult } from '../../treacheryEffects';

export function resolveGreatForestWeb(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    let nextState = { ...state };
    const player = nextState.players[0];

    if (!player || player.heroes.length === 0) {
        logs.push('No heroes to attach Great Forest Web to.');
        return { state, log: logs, discard: true };
    }

    // Attach to first hero (simplified - should be player choice)
    const targetHero = player.heroes[0];
    logs.push(`Great Forest Web attaches to ${targetHero.name}.`);
    logs.push(`${targetHero.name} cannot ready during refresh unless 2 resources are paid.`);

    // Create condition attachment
    const conditionAttachment: AttachedCard = {
        code: card.code,
        name: card.name,
        type_code: 'attachment',
        text: 'Attached hero cannot ready during the refresh phase unless you pay 2 resources from that hero\'s pool.',
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

registerTreachery('01077', resolveGreatForestWeb);
