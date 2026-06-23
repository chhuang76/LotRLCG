/**
 * Driven by Shadow (01103)
 *
 * When Revealed: Place 1 progress token on the current quest for each card in
 * the staging area.
 *
 * Note: This is actually a beneficial effect for the players!
 */

import type { GameState, EncounterCard } from '../../types';
import { registerTreachery, type TreacheryResult } from '../../treacheryEffects';

export function resolveDrivenByShadow(state: GameState, card: EncounterCard): TreacheryResult {
    const logs: string[] = [];
    logs.push(`Treachery revealed: ${card.name}`);

    const stagingCount = state.stagingArea.length;

    if (stagingCount === 0) {
        logs.push('No cards in staging area. No progress placed.');
        return { state, log: logs, discard: true };
    }

    let nextState = { ...state };
    const newProgress = nextState.questProgress + stagingCount;

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

registerTreachery('01103', resolveDrivenByShadow);
