import './QuestPreview.css';

interface QuestPreviewProps {
    committedWillpower: number;
    stagingThreat: number;
}

/**
 * QuestPreview - overlay anchored middle-left of the player zone during the
 * quest_commit phase. Shows committed willpower vs staging threat and the
 * expected net result.
 */
export function QuestPreview({ committedWillpower, stagingThreat }: QuestPreviewProps) {
    const net = committedWillpower - stagingThreat;
    const resultClass = net > 0 ? 'positive' : net < 0 ? 'negative' : 'neutral';
    const resultText = net > 0
        ? `+${net} progress`
        : net < 0
            ? `${-net} threat raised`
            : 'No change';

    return (
        <div className="quest-preview">
            <div className="quest-preview__title">Quest Preview</div>
            <div className="quest-preview__row">
                <span>Willpower</span>
                <span className="quest-preview__wp">🌟 {committedWillpower}</span>
            </div>
            <div className="quest-preview__row">
                <span>Staging Threat</span>
                <span className="quest-preview__threat">👁 {stagingThreat}</span>
            </div>
            <div className={`quest-preview__result ${resultClass}`}>
                {resultText}
            </div>
        </div>
    );
}

export default QuestPreview;
