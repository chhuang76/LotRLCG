/**
 * Treachery Effect Resolution System
 *
 * Handles "When Revealed" effects for treachery cards in the encounter deck.
 * Each treachery card has a specific handler function that modifies game state.
 */

import type { GameState, EncounterCard, Hero, Ally, PlayerCard } from './types';

// ── Effect Result ─────────────────────────────────────────────────────────────

export interface TreacheryResult {
    state: GameState;
    log: string[];
    /** If true, the treachery should be discarded after resolution */
    discard: boolean;
}

// ── Individual Treachery Handlers ─────────────────────────────────────────────

/**
 * The Necromancer's Reach (01102)
 * "When Revealed: Assign 1 damage to each exhausted character."
 */
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

/**
 * Driven by Shadow (01103)
 * "When Revealed: Place 1 progress token on the current quest for each card in the staging area."
 *
 * Note: This is actually a beneficial effect for the players!
 */
export function resolveDrivenByShadow(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    const stagingCount = state.stagingArea.length;

    if (stagingCount === 0) {
        logs.push('No cards in staging area. No progress placed.');
        return { state, log: logs, discard: true };
    }

    let nextState = { ...state };
    let newProgress = nextState.questProgress + stagingCount;

    logs.push(`Placing ${stagingCount} progress on the current quest (staging area has ${stagingCount} cards).`);

    // Check for quest completion
    const questPoints = nextState.currentQuest?.quest_points ?? 999;
    if (newProgress >= questPoints) {
        logs.push(`Quest stage complete!`);
        if (nextState.questDeck.length > 0) {
            const [nextQuest, ...restQuests] = nextState.questDeck;
            nextState = {
                ...nextState,
                currentQuest: nextQuest,
                questDeck: restQuests,
                questProgress: 0,
            };
            logs.push(`Advancing to next quest stage: ${nextQuest.name}`);
        } else {
            logs.push('🎉 All quest stages complete — the players win!');
        }
    } else {
        nextState = { ...nextState, questProgress: newProgress };
        logs.push(`Quest progress: ${newProgress}/${questPoints}`);
    }

    return { state: nextState, log: logs, discard: true };
}

/**
 * Despair (01104)
 * "When Revealed: Raise each player's threat by 3."
 */
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

/**
 * Great Forest Web (01077)
 * "When Revealed: Attach to a hero. (Counts as a Condition attachment with the text:
 * 'Attached hero cannot ready during the refresh phase unless you pay 2 resources from that hero's pool.')"
 *
 * For now, we attach to the first hero. In a full implementation, the player would choose.
 */
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
    const conditionAttachment: PlayerCard = {
        code: card.code,
        name: card.name,
        type_code: 'attachment',
        text: 'Attached hero cannot ready during the refresh phase unless you pay 2 resources from that hero\'s pool.',
        traits: 'Condition.',
        quantity: 1,
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

/**
 * Caught in a Web (01078)
 * "When Revealed: Each player must choose 1 hero he controls. Attach this card to that hero.
 * (Counts as a Condition attachment with the text: 'Attached hero cannot collect resources during the resource phase.')"
 *
 * For now, we attach to the first hero. In a full implementation, the player would choose.
 */
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
    const conditionAttachment: PlayerCard = {
        code: card.code,
        name: card.name,
        type_code: 'attachment',
        text: 'Attached hero cannot collect resources during the resource phase.',
        traits: 'Condition.',
        quantity: 1,
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

// ── Treachery Handler Registry ────────────────────────────────────────────────

type TreacheryHandler = (state: GameState, card: EncounterCard) => TreacheryResult;

const TREACHERY_HANDLERS: Record<string, TreacheryHandler> = {
    '01102': resolveNecromancersReach,  // The Necromancer's Reach
    '01103': resolveDrivenByShadow,     // Driven by Shadow
    '01104': resolveDespair,            // Despair
    '01077': resolveGreatForestWeb,     // Great Forest Web
    '01078': resolveCaughtInAWeb,       // Caught in a Web
};

// ── Main Resolution Function ──────────────────────────────────────────────────

/**
 * Resolve a treachery card's "When Revealed" effect.
 * Returns the updated game state and log messages.
 */
export function resolveTreachery(state: GameState, card: EncounterCard): TreacheryResult {
    const handler = TREACHERY_HANDLERS[card.code];

    if (handler) {
        return handler(state, card);
    }

    // Unknown treachery - log and discard
    return {
        state,
        log: [`Treachery revealed: ${card.name} (effect not implemented)`],
        discard: true,
    };
}

/**
 * Check if a card is a treachery card.
 */
export function isTreacheryCard(card: EncounterCard): boolean {
    return card.type_code === 'treachery';
}
