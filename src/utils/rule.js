
export const isValidMove = (card, topCard, activeColor) => {
  if (!card || !topCard) return false;

  // Ace Logic
  if (card.num === "A") {
    // Can play if matches active color
    if (card.color === activeColor) {
      return true;
    }
    // Can play if played on top of another Ace (regardless of color)
    if (topCard.num === "A") {
      return true;
    }
    return false;
  }

  // Match active color
  if (card.color === activeColor) {
    return true;
  }

  // Match number (rank)
  if (card.num === topCard.num) {
    return true;
  }

  return false;
};

export const getCardEffect = (card) => {
  if (!card) return null;

  switch (card.num) {
    case "A":
      return { type: "CHANGE_COLOR_ANY", value: null }; // Value will be set by player
    case "Q":
      return { type: "PENALTY_DRAW", value: 1 }; // If played as single to change color. Logic needs to handle context.
    case "J":
      return { type: "SKIP", value: 1 };
    case "2":
      return { type: "DRAW_SKIP", value: 2 };
    default:
      return null;
  }
};

export const checkWinCondition = (deck) => {
  return deck.length === 0;
};
