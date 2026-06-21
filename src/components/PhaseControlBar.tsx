import type { GamePhase } from '../engine/types';
import './PhaseControlBar.css';

interface PhaseAction {
    label: string;
    primary?: boolean;
    end?: boolean;
    onClick: () => void;
}

interface QuestActions {
    onStartCommit?: () => void;
    onConfirmCommit?: () => void;
    onRevealStaging?: () => void;
    onResolveQuest?: () => void;
}

interface TravelActions {
    onSkipTravel?: () => void;
}

interface CombatActions {
    onConfirmDefense?: () => void;
    onConfirmAttack?: () => void;
}

interface PhaseControlBarProps {
    phase: GamePhase;
    round: number;
    onAdvancePhase: () => void;
    questActions?: QuestActions;
    travelActions?: TravelActions;
    combatActions?: CombatActions;
    hasActiveLocation?: boolean;
    hasLocationsInStaging?: boolean;
    questCommitWillpower?: number;
    combatAttackPower?: number;
    combatDefenderSelected?: boolean;
    extraActions?: PhaseAction[];
}

const PHASES: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'resource', label: 'Resource', icon: '💰' },
    { id: 'planning', label: 'Planning', icon: '📋' },
    { id: 'quest', label: 'Quest', icon: '🗺' },
    { id: 'travel', label: 'Travel', icon: '🚶' },
    { id: 'encounter', label: 'Encounter', icon: '👿' },
    { id: 'combat', label: 'Combat', icon: '⚔' },
    { id: 'refresh', label: 'Refresh', icon: '♻' },
];

// Default context-sensitive actions per phase
function defaultActions(
    phase: GamePhase,
    onAdvance: () => void,
    questActions?: QuestActions,
    travelActions?: TravelActions,
    hasActiveLocation?: boolean,
    hasLocationsInStaging?: boolean,
    questCommitWillpower?: number,
    combatActions?: CombatActions,
    combatAttackPower?: number,
    combatDefenderSelected?: boolean
): PhaseAction[] {
    switch (phase) {
        case 'resource':
            return [
                { label: 'Collect Resources', primary: true, onClick: onAdvance },
            ];
        case 'planning':
            return [
                { label: 'Done Planning', primary: true, onClick: onAdvance },
            ];
        case 'quest':
            return [
                { label: 'Start Quest', primary: true, onClick: questActions?.onStartCommit ?? onAdvance },
            ];
        case 'quest_commit':
            return [
                {
                    label: `Confirm Commitment (${questCommitWillpower ?? 0} 🌟)`,
                    primary: true,
                    onClick: questActions?.onConfirmCommit ?? onAdvance,
                },
            ];
        case 'quest_staging':
            return [
                { label: 'Reveal Encounter Cards', primary: true, onClick: questActions?.onRevealStaging ?? onAdvance },
            ];
        case 'quest_resolve':
            return [
                { label: 'Resolve Quest', primary: true, onClick: questActions?.onResolveQuest ?? onAdvance },
            ];
        case 'travel': {
            // Show different buttons based on state
            if (hasActiveLocation) {
                return [
                    { label: 'Skip (Location Active)', primary: true, onClick: travelActions?.onSkipTravel ?? onAdvance },
                ];
            }
            if (!hasLocationsInStaging) {
                return [
                    { label: 'Skip (No Locations)', primary: true, onClick: travelActions?.onSkipTravel ?? onAdvance },
                ];
            }
            return [
                { label: 'Skip Travel', onClick: travelActions?.onSkipTravel ?? onAdvance },
            ];
        }
        case 'encounter':
            return [
                { label: 'Optionally Engage', primary: true, onClick: () => { } },
                { label: 'Done Engaging', onClick: onAdvance },
            ];
        case 'combat':
            return [
                { label: 'Declare Defender', primary: true, onClick: () => { } },
                { label: 'Resolve Attacks', onClick: () => { } },
                { label: 'End Combat', end: true, onClick: onAdvance },
            ];
        case 'combat_defend':
            return [
                {
                    label: combatDefenderSelected ? 'Confirm Defense' : 'Confirm (Undefended)',
                    primary: true,
                    onClick: combatActions?.onConfirmDefense ?? onAdvance,
                },
            ];
        case 'combat_attack':
            return [
                {
                    label: `Attack! (${combatAttackPower ?? 0} ⚔)`,
                    primary: true,
                    onClick: combatActions?.onConfirmAttack ?? onAdvance,
                },
            ];
        case 'refresh':
            return [
                { label: 'End Round', primary: true, end: true, onClick: onAdvance },
            ];
        default:
            return [{ label: 'Continue', primary: true, onClick: onAdvance }];
    }
}

export function PhaseControlBar({
    phase,
    round,
    onAdvancePhase,
    questActions,
    travelActions,
    combatActions,
    hasActiveLocation,
    hasLocationsInStaging,
    questCommitWillpower,
    combatAttackPower,
    combatDefenderSelected,
    extraActions,
}: PhaseControlBarProps) {
    // Map sub-phases to their parent for display
    const displayPhase = phase.startsWith('quest_') ? 'quest' :
                         phase.startsWith('combat_') ? 'combat' : phase;
    const currentIdx = PHASES.findIndex((p) => p.id === displayPhase);
    const actions = extraActions ?? defaultActions(phase, onAdvancePhase, questActions, travelActions, hasActiveLocation, hasLocationsInStaging, questCommitWillpower, combatActions, combatAttackPower, combatDefenderSelected);

    if (phase === 'setup' || phase === 'game_over') return null;

    return (
        <div className="phase-bar">
            {/* Phase tabs */}
            <div className="phase-bar__tabs">
                {PHASES.map((p, i) => {
                    const isDone = i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                        <div
                            key={p.id}
                            className={`phase-bar__tab${isActive ? ' active' : isDone ? ' done' : ''}`}
                        >
                            <span className="phase-bar__tab-icon">{p.icon}</span>
                            {p.label}
                        </div>
                    );
                })}
            </div>

            {/* Action buttons */}
            <div className="phase-bar__actions">
                <span className="phase-bar__round-label">Round {round} — {phase.charAt(0).toUpperCase() + phase.slice(1)}</span>
                {actions.map((a, i) => (
                    <button
                        key={i}
                        className={`phase-bar__action-btn${a.primary ? ' primary' : ''}${a.end ? ' end' : ''}`}
                        onClick={a.onClick}
                    >
                        {a.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PhaseControlBar;
