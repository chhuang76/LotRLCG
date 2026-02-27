# Project Structure

The application follows a modular directory structure to separate concern and logic:

```text
/src
  /assets        - Global styles, fonts, and generic card art.
  /components    - Reusable UI elements (Card, Hand, Token, Button).
  /engine        - Pure TypeScript logic for game rules and phase management.
  /store         - Zustand store for managing global game state.
  /data          - Local JSON card databases (Core.json, core_encounter.json).
  /utils         - Helper functions (Image resolvers, rule validators).
  App.tsx        - Root component and layout orchestrator.

/public
  /cards         - Full card images (used for zoomed view and hand cards).
  /cardPortraits - Square portrait images (used for hero card display).
```

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
- Encounter cards (Core Set): `01074` - `01121`
- Card codes match RingsDB JSON data (`Core.json`)
