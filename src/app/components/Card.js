import { motion } from "framer-motion";

// Base URL for PNG card assets from GitHub
const CARD_ASSETS_BASE = "https://raw.githubusercontent.com/hayeah/playing-cards-assets/master/png";
// Local card back image (stored in /public folder)
const CARD_BACK_URL = "/card-back.png";

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

// Persistent cache using localStorage for PWA offline support
const IMAGE_CACHE_KEY = 'take2-card-images';
const loadImageCache = () => {
  try {
    const cached = localStorage.getItem(IMAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
};

const saveImageCache = (cache) => {
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save image cache:', e);
  }
};

// In-memory cache for current session
const imageCache = new Map();
let persistentCache = loadImageCache();

// Get the image URL for a card
const getCardImageUrl = (num, suit) => {
  const suitName = suitMap[suit];
  const rankName = rankMap[num];
  if (!suitName || !rankName) return null;
  return `${CARD_ASSETS_BASE}/${rankName}_of_${suitName}.png`;
};

// Preload all card images into cache
let preloadPromise = null;
export const preloadCards = () => {
  if (preloadPromise) return preloadPromise;

  const urls = [];
  // Add card back (local asset from /public folder)
  urls.push({ key: "card_back", url: CARD_BACK_URL });

  // Add all cards (PNGs)
  Object.entries(suitMap).forEach(([symbol, suitName]) => {
    if (symbol === "♥") return; // Skip duplicate hearts mapping
    Object.entries(rankMap).forEach(([num, rankName]) => {
      const key = `${rankName}_of_${suitName}`;
      urls.push({ key, url: `${CARD_ASSETS_BASE}/${key}.png` });
    });
  });

  preloadPromise = Promise.all(
    urls.map(async ({ key, url }) => {
      // Skip if already cached in memory
      if (imageCache.has(key)) return;

      try {
        // Check if we have a persistent cache version
        if (persistentCache[key]) {
          // Use the cached base64 data
          imageCache.set(key, persistentCache[key]);
          return;
        }

        // Fetch and cache the image
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();

          // Convert to base64 for persistent storage
          const base64Data = await blobToBase64(blob);

          // Store in both memory and persistent cache
          imageCache.set(key, base64Data);
          persistentCache[key] = base64Data;
          saveImageCache(persistentCache);
        }
      } catch (e) {
        console.warn(`Failed to preload ${key}:`, e);
      }
    })
  );

  return preloadPromise;
};

// Helper function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Get cached URL or original URL
const getCachedUrl = (num, suit) => {
  const suitName = suitMap[suit];
  const rankName = rankMap[num];
  if (!suitName || !rankName) return null;
  const key = `${rankName}_of_${suitName}`;

  // Return base64 data URL from persistent cache (works offline)
  // Fall back to memory cache, then original URL
  return persistentCache[key] || imageCache.get(key) || `${CARD_ASSETS_BASE}/${key}.png`;
};

// Get card back URL (local asset, no theme variants needed)
const getBackUrl = () => {
  return persistentCache["card_back"] || imageCache.get("card_back") || CARD_BACK_URL;
};

export const Card = ({ index, card, className, ...props }) => {
  const num = card?.num;
  const suit = card?.color;

  // Hidden card (for computer) - use card back
  // Responsive sizes: smaller on mobile
  if (num === "?") {
    return (
      <motion.div
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative w-[60px] h-[84px] sm:w-[70px] sm:h-[98px] md:w-[90px] md:h-[126px] rounded-lg shadow-md mx-0.5 select-none overflow-hidden ${className}`}
      >
        <img
          src={getBackUrl()}
          alt="Card back"
          className="w-full h-full object-cover rounded-lg"
          draggable={false}
        />
      </motion.div>
    );
  }

  const imageUrl = getCachedUrl(num, suit);

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative w-[60px] h-[84px] sm:w-[70px] sm:h-[98px] md:w-[90px] md:h-[126px] rounded-lg shadow-md mx-0.5 select-none overflow-hidden bg-white ${className}`}
      {...props}
    >
      <img
        src={imageUrl}
        alt={`${num} of ${suit}`}
        className="w-full h-full object-contain rounded-lg p-[3px]"
        draggable={false}
      />
    </motion.div>
  );
};
