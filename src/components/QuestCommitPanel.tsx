import type { Hero, Ally, CharacterRef } from '../engine/types';
import './QuestCommitPanel.css';

interface QuestCommitPanelProps {
    heroes: Hero[];
    allies: Ally[];
    committedCharacters: CharacterRef[];
    stagingThreat: number;
    onToggleCommit: (ref: CharacterRef) => void;
    onConfirmCommit: () => void;
    onSkipCommit: () => void;
}

/**
 * QuestCommitPanel - Displays UI for selecting characters to commit to the quest
 * Shows all ready characters (heroes and allies) and allows toggling selection
 */
export function QuestCommitPanel({
    heroes,
    allies,
    committedCharacters,
    stagingThreat,
    onToggleCommit,
    onConfirmCommit,
    onSkipCommit,
}: QuestCommitPanelProps) {
    // Check if a character is committed
    const isCommitted = (ref: CharacterRef): boolean => {
        return committedCharacters.some(
            (c) => c.type === ref.type && c.code === ref.code
        );
    };

    // Check if a character can commit (not exhausted, alive)
    const canCommit = (type: 'hero' | 'ally', hero?: Hero, ally?: Ally): boolean => {
        if (type === 'hero' && hero) {
            return !hero.exhausted && hero.damage < (hero.health ?? 99);
        }
        if (type === 'ally' && ally) {
            return !ally.exhausted && ally.damage < (ally.health ?? 99);
        }
        return false;
    };

    // Calculate total willpower of committed characters
    const totalWillpower = committedCharacters.reduce((sum, ref) => {
        if (ref.type === 'hero') {
            const hero = heroes.find((h) => h.code === ref.code);
            return sum + (hero?.willpower ?? 0);
        } else {
            const ally = allies[ref.index];
            return sum + (ally?.willpower ?? 0);
        }
    }, 0);

    // Calculate expected result
    const netProgress = totalWillpower - stagingThreat;
    const resultText = netProgress >= 0
        ? `+${netProgress} progress`
        : `${netProgress} threat raise`;
    const resultClass = netProgress >= 0 ? 'positive' : 'negative';

    return (
        <div className="quest-commit-panel">
            <div className="quest-commit-panel__header">
                <h2 className="quest-commit-panel__title">
                    🗺️ Quest Phase - Commit Characters
                </h2>
            </div>

            <div className="quest-commit-panel__main">
                {/* Character Selection Section */}
                <div className="quest-commit-panel__characters-section">
                    <h3 className="quest-commit-panel__section-title">
                        Select characters to commit to the quest:
                    </h3>

                    {/* Heroes */}
                    <div className="quest-commit-panel__character-group">
                        <span className="quest-commit-panel__group-label">Heroes</span>
                        <div className="quest-commit-panel__character-list">
                            {heroes.map((hero, index) => {
                                const ref: CharacterRef = { type: 'hero', index, code: hero.code };
                                const available = canCommit('hero', hero);
                                const committed = isCommitted(ref);

                                return (
                                    <div
                                        key={hero.code}
                                        className={`quest-commit-panel__character ${committed ? 'committed' : ''} ${!available ? 'unavailable' : ''}`}
                                        onClick={() => {
                                            if (available) onToggleCommit(ref);
                                        }}
                                    >
                                        <span className="quest-commit-panel__character-check">
                                            {committed ? '✓' : '○'}
                                        </span>
                                        <span className="quest-commit-panel__character-name">{hero.name}</span>
                                        <span className="quest-commit-panel__character-stats">
                                            🌟 {hero.willpower ?? 0}
                                        </span>
                                        {hero.exhausted && (
                                            <span className="quest-commit-panel__character-status">Exhausted</span>
                                        )}
                                        {!available && !hero.exhausted && (
                                            <span className="quest-commit-panel__character-status">Defeated</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Allies */}
                    {allies.length > 0 && (
                        <div className="quest-commit-panel__character-group">
                            <span className="quest-commit-panel__group-label">Allies</span>
                            <div className="quest-commit-panel__character-list">
                                {allies.map((ally, index) => {
                                    const ref: CharacterRef = { type: 'ally', index, code: ally.code };
                                    const available = canCommit('ally', undefined, ally);
                                    const committed = isCommitted(ref);

                                    return (
                                        <div
                                            key={`${ally.code}-${index}`}
                                            className={`quest-commit-panel__character ${committed ? 'committed' : ''} ${!available ? 'unavailable' : ''}`}
                                            onClick={() => {
                                                if (available) onToggleCommit(ref);
                                            }}
                                        >
                                            <span className="quest-commit-panel__character-check">
                                                {committed ? '✓' : '○'}
                                            </span>
                                            <span className="quest-commit-panel__character-name">{ally.name}</span>
                                            <span className="quest-commit-panel__character-stats">
                                                🌟 {ally.willpower ?? 0}
                                            </span>
                                            {ally.exhausted && (
                                                <span className="quest-commit-panel__character-status">Exhausted</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Quest Preview Section */}
                <div className="quest-commit-panel__preview-section">
                    <h3 className="quest-commit-panel__section-title">Quest Preview</h3>

                    <div className="quest-commit-panel__preview">
                        <div className="quest-commit-panel__preview-row">
                            <span>Committed Willpower:</span>
                            <span className="quest-commit-panel__preview-wp">{totalWillpower} 🌟</span>
                        </div>
                        <div className="quest-commit-panel__preview-row">
                            <span>Staging Area Threat:</span>
                            <span className="quest-commit-panel__preview-threat">{stagingThreat} ⚫</span>
                        </div>
                        <div className={`quest-commit-panel__preview-row quest-commit-panel__preview-result ${resultClass}`}>
                            <span>Expected Result:</span>
                            <span>{resultText}</span>
                        </div>

                        {committedCharacters.length === 0 && (
                            <div className="quest-commit-panel__preview-warning">
                                ⚠️ No characters committed! You will raise threat by {stagingThreat}.
                            </div>
                        )}

                        <div className="quest-commit-panel__preview-note">
                            Note: Staging threat may change after encounter cards are revealed.
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="quest-commit-panel__actions">
                <button
                    className="quest-commit-panel__btn quest-commit-panel__btn--skip"
                    onClick={onSkipCommit}
                >
                    Skip (0 Willpower)
                </button>
                <button
                    className="quest-commit-panel__btn quest-commit-panel__btn--confirm"
                    onClick={onConfirmCommit}
                >
                    Confirm Commitment ({totalWillpower} 🌟)
                </button>
            </div>
        </div>
    );
}

export default QuestCommitPanel;
