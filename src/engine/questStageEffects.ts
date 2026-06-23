/**
 * Quest Stage Effects Resolution System
 *
 * Handles "When Revealed" effects when advancing to a new quest stage,
 * as well as ongoing "Forced" effects for specific quest stages.
 *
 * Passage Through Mirkwood Quest Stages (active B sides):
 * - Stage 1 (01119B): Flies and Spiders - Setup handled on the 1A side at game start
 * - Stage 2 (01120B): A Fork in the Road - branches to a Chosen Path stage on defeat
 * - Stage 3 (01121B/01122B): A Chosen Path
 */

import type { GameState, EncounterCard } from './types';

// ── Effect Result ─────────────────────────────────────────────────────────────

export interface QuestStageResult {
    state: GameState;
    log: string[];
}

// ── Set-Aside Cards ───────────────────────────────────────────────────────────

/**
 * The "Caught in a Web" card that gets added to staging when advancing to stage 2.
 * This is a set-aside card, not part of the encounter deck.
 */
const CAUGHT_IN_A_WEB_SETASIDE: EncounterCard = {
    code: '01078',
    name: 'Caught in a Web',
    type_code: 'treachery',
    traits: 'Condition.',
    threat: 0,
    text: "<b>When Revealed:</b> Each player must choose 1 hero he controls. Attach this card to that hero. (Counts as a Condition attachment with the text: 'Attached hero cannot collect resources during the resource phase.')",
    quantity: 1,
};

// ── Individual Quest Stage Handlers ───────────────────────────────────────────

/**
 * Stage 1: Flies and Spiders (01119A)
 * No transition effect - setup is handled at game start.
 */
function resolveStage1WhenRevealed(state: GameState): QuestStageResult {
    return {
        state,
        log: ['Quest stage 1: Flies and Spiders - No transition effect.'],
    };
}

/**
 * Stage 2: A Fork in the Road (01120A)
 * When Revealed: Add the Caught in a Web set-aside card to the staging area.
 */
function resolveStage2WhenRevealed(state: GameState): QuestStageResult {
    const logs: string[] = [];
    logs.push('Quest stage 2: A Fork in the Road');
    logs.push('When Revealed: Adding "Caught in a Web" to the staging area.');

    const newStagingArea = [...state.stagingArea, CAUGHT_IN_A_WEB_SETASIDE];

    return {
        state: { ...state, stagingArea: newStagingArea },
        log: logs,
    };
}

/**
 * Stage 3: A Chosen Path (01121B / 01122B)
 * No "When Revealed" effect modeled here - just log the special rules.
 * Victory condition and reveal-2 are handled elsewhere.
 */
function resolveStage3WhenRevealed(state: GameState): QuestStageResult {
    const logs: string[] = [];
    logs.push('Quest stage 3: A Chosen Path');
    logs.push('⚠️ Special: Reveal 2 encounter cards each quest phase instead of 1.');
    logs.push('🏆 Victory condition: Empty the encounter deck to win!');

    return {
        state,
        log: logs,
    };
}

// ── Quest Stage Handler Registry ──────────────────────────────────────────────

type QuestStageHandler = (state: GameState) => QuestStageResult;

const QUEST_STAGE_HANDLERS: Record<string, QuestStageHandler> = {
    '01119B': resolveStage1WhenRevealed,  // Stage 1: Flies and Spiders
    '01120B': resolveStage2WhenRevealed,  // Stage 2: A Fork in the Road
    '01121B': resolveStage3WhenRevealed,  // Stage 3: A Chosen Path (Don't Leave the Path!)
    '01122B': resolveStage3WhenRevealed,  // Stage 3: A Chosen Path (Beorn's Path)
};

// ── Main Resolution Functions ─────────────────────────────────────────────────

/**
 * Resolve the "When Revealed" effect when advancing to a new quest stage.
 */
export function resolveQuestStageTransition(
    state: GameState,
    newQuest: EncounterCard
): QuestStageResult {
    const handler = QUEST_STAGE_HANDLERS[newQuest.code];

    if (handler) {
        return handler(state);
    }

    // Unknown quest stage - just log it
    return {
        state,
        log: [`Advancing to quest: ${newQuest.name} (no transition effect implemented)`],
    };
}

/**
 * Check if current quest stage requires revealing extra encounter cards.
 * Stage 3 of Passage Through Mirkwood reveals 2 cards instead of 1.
 */
export function getEncounterCardsToReveal(state: GameState): number {
    const currentQuest = state.currentQuest;
    if (!currentQuest) return 1;

    // Stage 3: A Chosen Path - reveal 2 cards
    if (currentQuest.code === '01121B' || currentQuest.code === '01122B') {
        return 2;
    }

    return 1;
}

/**
 * Check if the victory condition is met.
 * For Stage 3 of Passage Through Mirkwood: encounter deck is empty.
 */
export function checkVictoryCondition(state: GameState): { victory: boolean; reason: string } {
    const currentQuest = state.currentQuest;

    if (!currentQuest) {
        return { victory: false, reason: '' };
    }

    // Stage 3: Victory when encounter deck is empty
    if (currentQuest.code === '01121B' || currentQuest.code === '01122B') {
        if (state.encounterDeck.length === 0 && state.encounterDiscard.length === 0) {
            return {
                victory: true,
                reason: '🏆 VICTORY! The encounter deck is empty - you have escaped Mirkwood!',
            };
        }
    }

    return { victory: false, reason: '' };
}

/**
 * Stage 2 Forced effect: At the end of the encounter phase,
 * if there are no enemies in play, reveal the top card of the encounter deck.
 */
export function checkStage2ForcedEffect(state: GameState): boolean {
    const currentQuest = state.currentQuest;
    if (!currentQuest || currentQuest.code !== '01120B') {
        return false;
    }

    // Check if there are any enemies in play (staging area or engaged)
    const enemiesInStaging = state.stagingArea.some((item) => {
        if ('card' in item) return true; // ActiveEnemy
        return item.type_code === 'enemy';
    });

    const enemiesEngaged = state.players.some((p) => p.engagedEnemies.length > 0);

    return !enemiesInStaging && !enemiesEngaged;
}

/**
 * Get the current quest stage number.
 */
export function getCurrentStageNumber(state: GameState): number {
    return state.currentQuest?.stage ?? 0;
}

/**
 * Check if the game is on the final quest stage.
 */
export function isOnFinalStage(state: GameState): boolean {
    return state.currentQuest?.stage === 3 || state.questDeck.length === 0;
}
