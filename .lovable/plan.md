Update the two test cards on `/app/tests/new` so the titles "Vertical jump" and "Linear sprint" are centered, and remove the "Start →" link text and arrow from both cards.

Changes:
- Edit `src/pages/NewTest.tsx`:
  - Remove the `<div>Start →</div>` element from both the Vertical jump and Linear sprint cards.
  - Center the title text (`text-center`) within each card's text block.
  - Vertically center the text block against the logo so the title sits in the middle of the card's right-hand area.

No other files need to change.