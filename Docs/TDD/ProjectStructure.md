# Project Structure

The application follows a modular directory structure to separate concern and logic:

```text
/src
  /assets        - Global styles, fonts, and generic card art.
  /components    - Reusable UI elements (Card, Hand, Token, Button).
  /engine        - Pure TypeScript logic for game rules and phase management.
  /store         - Zustand store for managing global game state.
  /data          - Card data and scenario configurations.
    /sets        - Card data organized by set ID.
      /01        - Core Set cards (player cards, encounter cards, quest cards).
    /scenarios   - Scenario configurations (encounter set references, setup).
      /01        - Core Set scenarios.
    /decks       - Pre-built player decks.
  /utils         - Helper functions (Image resolvers, rule validators).
  App.tsx        - Root component and layout orchestrator.

/public
  /cards         - Full card images (used for zoomed view and hand cards).
  /cardPortraits - Square portrait images (used for hero card display).
```

## Data Organization

### Sets (`/src/data/sets/{setId}/`)
Contains the actual card data definitions. Each set folder includes:
- `playerCards.ts` - Heroes, allies, attachments, events
- `encounterCards.ts` - Enemies, locations, treacheries organized by encounter set
- `questCards.ts` - Quest cards for all scenarios in the set
- `index.ts` - Re-exports for convenient imports

### Scenarios (`/src/data/scenarios/{setId}/`)
Contains scenario configuration (no card data duplication):
- References encounter sets by ID
- Defines setup cards
- Provides functions to build quest deck and encounter deck

### Decks (`/src/data/decks/`)
Contains pre-built player deck configurations:
- Lists hero codes
- Lists card codes with quantities

For detailed scenario creation workflow, see [ScenarioDataCuration.md](./ScenarioDataCuration.md).

## Image File Naming Convention

All image files use a **code-only naming convention** for simplicity and consistency:

| Folder | Pattern | Example |
|--------|---------|---------|
| `/public/cards/` | `{code}.png` | `01001.png` (Aragorn full card) |
| `/public/cardPortraits/` | `{code}.png` | `01001.png` (Aragorn portrait) |

**Benefits:**
- No special character issues (avoids `é`, `ó`, `'`, `!` in filenames)
- Simple path generation: `/cards/${card.code}.png`
- No lookup tables needed in code
- Easy to add new images (just use the card code from RingsDB)

**Code Usage:**
```typescript
// Get full card image path
function getCardImagePath(code: string): string {
    return `/cards/${code}.png`;
}

// Get portrait image path
function getPortraitImagePath(code: string): string {
    return `/cardPortraits/${code}.png`;
}
```

**Card Code Reference:**
- Player cards (Core Set): `01001` - `01073`
- Encounter cards (Core Set): `01074` - `01118`
- Quest cards (Core Set): `01119` - `01128`
- Card codes verified against OCTGN data (`References/octgn_core_set.xml`)
