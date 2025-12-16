import { motion } from "framer-motion";

// Base URL for card assets from GitHub
const CARD_ASSETS_BASE = "https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png";

// Map suit symbols to suit names for filenames
const suitMap = {
  "♠": "spades",
  "♥️": "hearts", 
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs"
};

// Map card numbers to rank names for filenames
const rankMap = {
  "A": "ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  "J": "jack",
  "Q": "queen",
  "K": "king"
};

// Get the image URL for a card
const getCardImageUrl = (num, suit) => {
  const suitName = suitMap[suit];
  const rankName = rankMap[num];
  if (!suitName || !rankName) return null;
  return `${CARD_ASSETS_BASE}/${rankName}_of_${suitName}.png`;
};

export const Card = ({ index, card, className, ...props }) => {
  const num = card?.num;
  const suit = card?.color;

  // Hidden card (for computer) - use card back
  if (num === "?") {
    return (
      <motion.div
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative w-[90px] h-[126px] rounded-lg shadow-md mx-0.5 select-none overflow-hidden ${className}`}
      >
        <img 
          src={`${CARD_ASSETS_BASE}/back.png`}
          alt="Card back"
          className="w-full h-full object-cover rounded-lg p-[3px]"
          draggable={false}
        />
      </motion.div>
    );
  }

  const imageUrl = getCardImageUrl(num, suit);

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative w-[90px] h-[126px] rounded-lg shadow-md mx-0.5 select-none overflow-hidden bg-white ${className}`}
      {...props}
    >
      {imageUrl ? (
        <img 
          src={imageUrl}
          alt={`${num} of ${suit}`}
          className="w-full h-full object-contain rounded-lg p-[3px]"
          draggable={false}
        />
      ) : (
        // Fallback if image URL can't be generated
        <div className="w-full h-full flex items-center justify-center text-2xl">
          {num}{suit}
        </div>
      )}
    </motion.div>
  );
};
