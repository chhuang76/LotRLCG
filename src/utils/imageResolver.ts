/**
 * Resolves the image path for a card given its code.
 * Falls back to null if no local image is available.
 * The UI should render a text-based placeholder card in that case.
 */

// Player card images are stored locally (codes 01001–01073)
const PLAYER_IMAGE_BASE = '/images/';

// Encounter card images are hotlinked (codes 01074+) — will fall back to placeholder
const ENCOUNTER_IMAGE_BASE = 'https://hallofbeorn-resources.s3.amazonaws.com/Images/LotR/Core-Set/';

export function resolveCardImage(code: string, name: string): string | null {
    const num = parseInt(code, 10);

    // Player cards: serve from local public/images directory
    if (num >= 1 && num <= 73) {
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        return `${PLAYER_IMAGE_BASE}${code}_${safeName}.png`;
    }

    // Encounter / quest cards: attempt external URL (may fail — UI handles fallback)
    const urlName = name.replace(/"/g, '').replace(/'/g, '').replace(/\s+/g, '-');
    return `${ENCOUNTER_IMAGE_BASE}${urlName}.jpg`;
}

export function isPlayerCard(code: string): boolean {
    return parseInt(code, 10) <= 73;
}
