// Core type definitions for the LOTR Card Game engine

export type CardType =
    | 'hero'
    | 'ally'
    | 'attachment'
    | 'event'
    | 'enemy'
    | 'location'
    | 'treachery'
    | 'objective'
    | 'quest';

export type Sphere = 'leadership' | 'tactics' | 'spirit' | 'lore' | 'neutral' | 'baggins';

// Base card — common properties for all cards
export interface BaseCard {
    code: string;
    name: string;
    type_code: CardType;
    traits?: string;
    text?: string;
    quantity: number;
    imagesrc?: string;
}

// Player cards (Heroes, Allies, Attachments, Events)
export interface PlayerCard extends BaseCard {
    type_code: 'hero' | 'ally' | 'attachment' | 'event';
    sphere_code?: Sphere;
    cost?: number;       // Resource cost (null for heroes)
    threat?: number;     // Threat cost for heroes
    willpower?: number;
    attack?: number;
    defense?: number;
    health?: number;
    unique?: boolean;
}

// Encounter cards (Enemies, Locations, Treacheries, Quests)
export interface EncounterCard extends BaseCard {
    type_code: 'enemy' | 'location' | 'treachery' | 'objective' | 'quest';
    engagement_cost?: number; // Enemies only
    threat?: number;          // Staging area threat contribution
    attack?: number;          // Enemies only
    defense?: number;         // Enemies only
    health?: number;          // Enemies only
    quest_points?: number;    // Locations and Quests
    stage?: number;           // Quest cards only
    shadow?: string;          // Shadow effect text
    flavor?: string;
    victory?: number;
}

export type Card = PlayerCard | EncounterCard;

// ----- Game State -----

export type GamePhase =
    | 'setup'
    | 'resource'
    | 'planning'
    | 'quest'
    | 'quest_commit'       // Player chooses characters to commit
    | 'quest_staging'      // Reveal encounter cards
    | 'quest_resolve'      // Compare WP vs Threat
    | 'travel'
    | 'encounter'
    | 'combat'
    | 'combat_defend'      // Player chooses defender
    | 'combat_attack'      // Player chooses attackers
    | 'refresh'
    | 'game_over';

// Ally type with exhausted/damage state
export interface Ally extends PlayerCard {
    exhausted: boolean;
    damage: number;
}

// Attachment with exhausted state (for attachments with abilities like Steward of Gondor)
export interface AttachedCard extends PlayerCard {
    exhausted: boolean;
}

export interface Hero extends PlayerCard {
    currentHealth: number;
    damage: number;
    exhausted: boolean;
    resources: number;
    attachments: AttachedCard[]; // Full card objects with exhausted state
}

// Character reference for combat targeting
export interface CharacterRef {
    type: 'hero' | 'ally';
    index: number;  // For allies, index in allies array
    code: string;   // For heroes, hero code
}

export interface ActiveEnemy {
    card: EncounterCard;
    damage: number;
    shadowCards: EncounterCard[];
    engagedPlayerId: string;
    exhausted: boolean;
    attackBonus?: number;  // Round-based attack modifier (e.g., Forest Spider +1)
}

// Combat state tracking
export interface CombatState {
    currentEnemyIndex: number;           // Which enemy is currently attacking/being attacked
    phase: 'enemy_attacks' | 'player_attacks';
    selectedDefender: CharacterRef | null;
    selectedAttackers: CharacterRef[];
    shadowRevealed: boolean;
    enemiesResolved: number[];           // Indices of enemies that have completed combat
}

export interface ActiveLocation {
    card: EncounterCard;
    progress: number;
}

export interface PlayerState {
    id: string;
    name: string;
    threat: number;
    hand: PlayerCard[];
    deck: PlayerCard[];
    discard: PlayerCard[];
    heroes: Hero[];
    allies: Ally[];
    engagedEnemies: ActiveEnemy[];
}

export interface GameState {
    phase: GamePhase;
    round: number;
    players: PlayerState[];
    encounterDeck: EncounterCard[];
    encounterDiscard: EncounterCard[];
    stagingArea: (EncounterCard | ActiveEnemy)[];
    activeLocation: ActiveLocation | null;
    questDeck: EncounterCard[];
    currentQuest: EncounterCard | null;
    questProgress: number;
    firstPlayerId: string;
    combatState: CombatState | null;     // Combat tracking state
    questCommitment: CharacterRef[];     // Characters committed to quest
}
