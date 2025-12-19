"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { shuffleDeck, isRedColor } from "@/utils/utils";
import { isValidMove, getCardEffect, checkWinCondition, isPowerCard } from "@/utils/rule";
import { Card, preloadCards } from "./components/Card";
import { GameRules } from "./components/GameRules"; // Import GameRules component
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  initAudio,
  resumeAudio,
  playCardDealSound,
  playShuffleSound,
  playCardPlaceSound,
  playWinningSound,
  playLastCallSound,
  playPenaltySound,
  playSkipSound,
  playAceSound,
  playQueenPairSound,
  playGameStartSound,
  setAudioEnabled,
  getAudioEnabled
} from "@/utils/audio";
import {
  recordGameCompletion,
  getGlobalStats,
  getPlayerStats,
  formatDuration,
  BADGE_LEVELS,
  savePlayerName,
  getPlayerNames
} from "@/utils/stats";

const colors = ["♠", "♥️", "♦", "♣"];
const cardNums = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// Sort cards by color then by number for better organization
const sortCardsByColor = (cards) => {
  const colorOrder = { "♠": 0, "♣": 1, "♥️": 2, "♦": 3 };
  const numOrder = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13 };
  
  return [...cards].sort((a, b) => {
    // First sort by color
    const colorDiff = colorOrder[a.color] - colorOrder[b.color];
    if (colorDiff !== 0) return colorDiff;
    // Then sort by number within same color
    return numOrder[a.num] - numOrder[b.num];
  });
};
 
const STORAGE_KEY = "take2-game-state";
const HIGH_SCORE_KEY = "take2-high-score";
const GAME_VERSION = "v1.1";

export default function Home() {
  const [deck, setDeck] = useState([]); // Initial full deck for setup
  const [drawPile, setDrawPile] = useState([]); // Remaining cards to draw
  const [discardPile, setDiscardPile] = useState([]); // Played cards (for recycling)
  const [visibleStack, setVisibleStack] = useState([]); // Last few cards for visual stack effect
  const [gameStart, setGameStart] = useState(false);
  const [playerDeck, setPlayerDeck] = useState([]);
  const [computerDecks, setComputerDecks] = useState([]); // Array of computer hands
  const [playerName, setPlayerName] = useState("");
  const [gameCardNum, setGameCardNum] = useState(5);
  const [numPlayers, setNumPlayers] = useState(2); // Total players (1 human + N-1 computers)
  const [isLoaded, setIsLoaded] = useState(false); // Track if we've loaded from storage
  const [assetsLoaded, setAssetsLoaded] = useState(false); // Track if card assets are cached
  const [showResumePrompt, setShowResumePrompt] = useState(false); // Show resume/new game prompt
  const [savedGameData, setSavedGameData] = useState(null); // Temporarily hold saved game for resume
  
  // Cool names for computer opponents
  const computerNames = ["Alpha", "Bravo", "Charlie"];
  const [currentPlayCard, setCurrentPlayCard] = useState(null);
  const [activeColor, setActiveColor] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [turn, setTurn] = useState(0); // 0 = player, 1+ = computer index
  const [message, setMessage] = useState("");
  const [penaltyStack, setPenaltyStack] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isStartingColorPick, setIsStartingColorPick] = useState(false); // Track if color pick is for starting Ace
  const [rankings, setRankings] = useState([]); // Array of player indices in order of finishing (1st, 2nd, etc.)
  const [gameOver, setGameOver] = useState(false); // True when game is completely finished
  const [skipActive, setSkipActive] = useState(false); // Track if a skip is pending
  const [deckRecycled, setDeckRecycled] = useState(false); // Show deck recycled indicator
  const [qPairCard, setQPairCard] = useState(null); // Track Q pair secondary card for dual matching

  // Audio state
  const [audioEnabled, setAudioEnabledState] = useState(true);

  // Game timing and stats
  const [gameStartTime, setGameStartTime] = useState(null);
  const [gameEndTime, setGameEndTime] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [savedPlayerNames, setSavedPlayerNames] = useState([]);
  const [showGlobalStatsModal, setShowGlobalStatsModal] = useState(false);

  // Multi-select state
  const [selectedCards, setSelectedCards] = useState([]);
  
  // Move tracking
  const [playerMoves, setPlayerMoves] = useState([]); // Array of move counts for each player [player, comp1, comp2, comp3]
  const [finishMoves, setFinishMoves] = useState({}); // { playerIndex: moveCount } when they finished
  const [highScore, setHighScore] = useState(null); // Lowest moves to finish 1st (persistent)
  
  // Human behavior tracking for smarter AI
  const [humanPlayHistory, setHumanPlayHistory] = useState({
    cardsPlayed: [],      // All cards human has played { card, turnNumber }
    colorCounts: { "♠": 0, "♥️": 0, "♦": 0, "♣": 0 }, // Colors human has played
    drawCount: 0,         // Times human has drawn (indicates they couldn't play)
    lastDrawTurn: -1,     // Last turn human drew cards
    consecutiveDraws: 0,  // How many times in a row human drew
  });
  
  // Ref for the play area (drop zone)
  const playAreaRef = useRef(null);

  // Preload card assets on mount
  useEffect(() => {
    preloadCards().then(() => {
      console.log("Card assets preloaded and cached");
      setAssetsLoaded(true);
    });

    // Initialize audio system
    initAudio();

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Load stats when player name changes or component mounts
  useEffect(() => {
    if (playerName) {
      setPlayerStats(getPlayerStats(playerName));
    }
    setGlobalStats(getGlobalStats());
  }, [playerName]);

  // Initialize game - load from storage or create new deck
  useEffect(() => {
    // Always load high score (persistent across games)
    try {
      const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
      if (savedHighScore) {
        setHighScore(JSON.parse(savedHighScore));
      }
    } catch (e) {
      console.error("Failed to load high score:", e);
    }

    // Load initial global stats and player names
    setGlobalStats(getGlobalStats());
    setSavedPlayerNames(getPlayerNames());
    
    // Check for saved game state - don't auto-load, ask user first
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only show resume prompt if there's an active game (not finished)
        if (state.gameStart && !state.gameOver) {
          setSavedGameData(state);
          setShowResumePrompt(true);
          setIsLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
    }

    // No saved state - create fresh deck
    const initialDeck = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < cardNums.length; j++) {
        const uniqueId = `${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
        initialDeck.push({ id: uniqueId, color: colors[i], num: cardNums[j] });
      }
    }
    shuffleDeck(initialDeck);
    setDeck(initialDeck);
    setIsLoaded(true);
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded
    if (showResumePrompt) return; // Don't overwrite saved game while showing resume prompt

    const state = {
      deck,
      drawPile,
      discardPile,
      visibleStack,
      gameStart,
      playerDeck,
      computerDecks,
      playerName,
      gameCardNum,
      numPlayers,
      currentPlayCard,
      activeColor,
      isDarkTheme,
      turn,
      message,
      penaltyStack,
      showColorPicker,
      isStartingColorPick,
      rankings,
      gameOver,
      skipActive,
      qPairCard,
      playerMoves,
      finishMoves,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save game state:", e);
    }
  }, [
    isLoaded,
    showResumePrompt,
    deck,
    drawPile,
    discardPile,
    visibleStack,
    gameStart,
    playerDeck,
    computerDecks,
    playerName,
    gameCardNum,
    numPlayers,
    currentPlayCard,
    activeColor,
    isDarkTheme,
    turn,
    message,
    penaltyStack,
    showColorPicker,
    isStartingColorPick,
    rankings,
    gameOver,
    skipActive,
    qPairCard,
    playerMoves,
    finishMoves,
  ]);

  // New Game - clear saved state and reset to menu
  const handleNewGame = () => {
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear game state:", e);
    }

    // Create fresh deck
    const initialDeck = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < cardNums.length; j++) {
        const uniqueId = `${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
        initialDeck.push({ id: uniqueId, color: colors[i], num: cardNums[j] });
      }
    }
    shuffleDeck(initialDeck);

    // Reset all state
    setDeck(initialDeck);
    setDrawPile([]);
    setDiscardPile([]);
    setVisibleStack([]);
    setGameStart(false);
    setPlayerDeck([]);
    setComputerDecks([]);
    // Keep playerName for convenience
    setCurrentPlayCard(null);
    setActiveColor(null);
    setTurn(0);
    setMessage("");
    setPenaltyStack(0);
    setShowColorPicker(false);
    setIsStartingColorPick(false);
    setRankings([]);
    setGameOver(false);
    setSkipActive(false);
    setDeckRecycled(false);
    setQPairCard(null);
    setSelectedCards([]);
    setPlayerMoves([]);
    setFinishMoves({});
    // Reset human tracking for AI
    setHumanPlayHistory({
      cardsPlayed: [],
      colorCounts: { "♠": 0, "♥️": 0, "♦": 0, "♣": 0 },
      drawCount: 0,
      lastDrawTurn: -1,
      consecutiveDraws: 0,
    });

    // Refresh saved player names to show dropdown if names were saved
    setSavedPlayerNames(getPlayerNames());
  };

  // Resume saved game
  const handleResumeGame = () => {
    if (!savedGameData) return;
    
    const state = savedGameData;
    setDeck(state.deck || []);
    setDrawPile(state.drawPile || []);
    setDiscardPile(state.discardPile || []);
    setVisibleStack(state.visibleStack || []);
    setGameStart(state.gameStart || false);
    setPlayerDeck(state.playerDeck || []);
    setComputerDecks(state.computerDecks || []);
    setPlayerName(state.playerName || "");
    setGameCardNum(state.gameCardNum || 5);
    setNumPlayers(state.numPlayers || 4);
    setCurrentPlayCard(state.currentPlayCard || null);
    setActiveColor(state.activeColor || null);
    setIsDarkTheme(state.isDarkTheme !== undefined ? state.isDarkTheme : true);
    setTurn(state.turn || 0);
    setMessage(state.message || "");
    setPenaltyStack(state.penaltyStack || 0);
    setShowColorPicker(state.showColorPicker || false);
    setIsStartingColorPick(state.isStartingColorPick || false);
    setRankings(state.rankings || []);
    setGameOver(state.gameOver || false);
    setSkipActive(state.skipActive || false);
    setQPairCard(state.qPairCard || null);
    setPlayerMoves(state.playerMoves || []);
    setFinishMoves(state.finishMoves || {});
    
    setSavedGameData(null);
    setShowResumePrompt(false);
  };

  // Start fresh instead of resuming
  const handleStartFresh = () => {
    // Clear saved game
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear saved game:", e);
    }
    
    // Create fresh deck
    const initialDeck = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < cardNums.length; j++) {
        const uniqueId = `${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
        initialDeck.push({ id: uniqueId, color: colors[i], num: cardNums[j] });
      }
    }
    shuffleDeck(initialDeck);
    setDeck(initialDeck);
    
    setSavedGameData(null);
    setShowResumePrompt(false);
  };

  // Rankings Effect: Confetti when any player finishes
  useEffect(() => {
    if (rankings.length === 0) return;
    
    const lastFinisher = rankings[rankings.length - 1];
    const place = rankings.length;
    
    // Trigger confetti for each player that finishes
    const triggerFinishConfetti = (place, isHuman) => {
      // Play winning sound
      playWinningSound();

      if (place === 1) {
        // 1st place - big celebration
        const count = 200;
        const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

        confetti({ ...defaults, spread: 26, startVelocity: 55, particleCount: Math.floor(count * 0.25) });
        confetti({ ...defaults, spread: 60, particleCount: Math.floor(count * 0.2) });
        confetti({ ...defaults, spread: 100, decay: 0.91, scalar: 0.8, particleCount: Math.floor(count * 0.35) });
        confetti({ ...defaults, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, particleCount: Math.floor(count * 0.1) });
        confetti({ ...defaults, spread: 120, startVelocity: 45, particleCount: Math.floor(count * 0.1) });
      } else if (place === 2) {
        // 2nd place - medium celebration
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.65 },
          zIndex: 9999,
          colors: ['#C0C0C0', '#A8A8A8', '#888888', '#FFD700'],
        });
      } else if (place === 3) {
        // 3rd place - small celebration
        confetti({
          particleCount: 50,
          spread: 45,
          origin: { y: 0.6 },
          zIndex: 9999,
          colors: ['#CD7F32', '#B87333', '#A0522D'],
        });
      }
    };
    
    triggerFinishConfetti(place, lastFinisher === 0);
  }, [rankings]);
  
  // Helper to check if a player is still in the game
  const isPlayerActive = (playerIndex) => {
    return !rankings.includes(playerIndex);
  };
  
  // Counterclockwise turn order based on table positions:
  // Bottom (Player 0) → Right (3) → Top (1) → Left (2) → Bottom
  const getCounterclockwiseTurnOrder = () => {
    if (numPlayers === 2) return [0, 1];
    if (numPlayers === 3) return [0, 1, 2];
    if (numPlayers === 4) return [0, 3, 1, 2];
    return Array.from({ length: numPlayers }, (_, i) => i);
  };
  
  // Helper to get next active turn (skips eliminated players, counterclockwise)
  const getNextActiveTurn = (currentTurn) => {
    const turnOrder = getCounterclockwiseTurnOrder();
    const currentIndex = turnOrder.indexOf(currentTurn);
    let nextIndex = (currentIndex + 1) % turnOrder.length;
    let next = turnOrder[nextIndex];
    
    // Skip players who have already finished
    let attempts = 0;
    while (rankings.includes(next) && attempts < turnOrder.length) {
      nextIndex = (nextIndex + 1) % turnOrder.length;
      next = turnOrder[nextIndex];
      attempts++;
    }
    return next;
  };
  
  // Count active players
  const activePlayerCount = numPlayers - rankings.length;

  const startGame = () => {
    if (!!playerName && !!gameCardNum && numPlayers >= 2) {
      // Resume audio context and play game start sound
      resumeAudio().then(() => {
        playGameStartSound();
        // Add card dealing sound after a short delay
        setTimeout(() => playCardDealSound(), 500);
      });

      const newDeck = [...deck];
      shuffleDeck(newDeck);

      // Deal cards to player
      let pDeck = newDeck.slice(0, gameCardNum);
      
      // Deal cards to each computer
      const cDecks = [];
      for (let i = 0; i < numPlayers - 1; i++) {
        const startIdx = gameCardNum * (i + 1);
        const endIdx = gameCardNum * (i + 2);
        cDecks.push(newDeck.slice(startIdx, endIdx));
      }
      
      // Start card is after all dealt cards
      const startCardIdx = gameCardNum * numPlayers;
      const startCard = newDeck[startCardIdx];
      let remainingDeck = newDeck.slice(startCardIdx + 1);

      // Handle starting card penalties
      let startMessage = `Game Started! ${playerName}'s Turn`;
      let startingTurn = 0; // 0 = player
      let startingActiveColor = startCard.color;
      let showStartColorPicker = false;
      
      if (startCard.num === "2") {
        // Starting with 2: player draws 2 cards AND turn is skipped
        const penaltyCards = remainingDeck.slice(0, 2);
        remainingDeck = remainingDeck.slice(2);
        pDeck = [...pDeck, ...penaltyCards];
        startingTurn = 1; // Skip to computer after penalty
        startMessage = `Game Started! Starting card is 2 - ${playerName} draws 2 cards, turn skipped!`;
      } else if (startCard.num === "Q") {
        // Starting with Q: player draws 1 card AND turn is skipped
        const penaltyCards = remainingDeck.slice(0, 1);
        remainingDeck = remainingDeck.slice(1);
        pDeck = [...pDeck, ...penaltyCards];
        startingTurn = 1; // Skip to computer after penalty
        startMessage = `Game Started! Starting card is Q - ${playerName} draws 1 card, turn skipped!`;
      } else if (startCard.num === "J") {
        // Starting with J: player's turn is skipped to next player
        startingTurn = 1; // First computer
        startMessage = `Game Started! Starting card is J - ${playerName}'s turn is skipped!`;
      } else if (startCard.num === "A") {
        // Starting with A: player chooses active color AND gets to play
        showStartColorPicker = true;
        startMessage = `Game Started! Starting card is A - ${playerName} choose the active color!`;
      }

      setPlayerDeck(pDeck);
      setComputerDecks(cDecks);
      setCurrentPlayCard(startCard);
      setActiveColor(startingActiveColor);
      setDrawPile(remainingDeck);
      setDiscardPile([]); // Start with empty discard pile
      setGameStart(true);
      setTurn(startingTurn);
      setMessage(startMessage);
      setPenaltyStack(0);
      setSkipActive(false);
      setRankings([]);
      setGameOver(false);
      setSelectedCards([]);
      setShowColorPicker(showStartColorPicker);
      setIsStartingColorPick(showStartColorPicker); // Mark if this is a starting Ace color pick
      setDeckRecycled(false);
      setQPairCard(null);
      setVisibleStack([]); // Reset visual stack
      // Initialize move tracking: [player, comp1, comp2, comp3...]
      setPlayerMoves(Array(numPlayers).fill(0));
      setFinishMoves({});
      // Reset human tracking for AI
      setHumanPlayHistory({
        cardsPlayed: [],
        colorCounts: { "♠": 0, "♥️": 0, "♦": 0, "♣": 0 },
        drawCount: 0,
        lastDrawTurn: -1,
        consecutiveDraws: 0,
      });

      // Save player name and record game start time for statistics
      savePlayerName(playerName);
      setGameStartTime(Date.now());
      setGameEndTime(null);
    }
  };

  // who: 0 = player, 1+ = computer index (1-based for computers)
  const drawCard = (who, count = 1) => {
    let currentDrawPile = [...drawPile];
    let currentDiscardPile = [...discardPile];
    let recycled = false;

    // If draw pile is empty or doesn't have enough cards, recycle discard pile
    if (currentDrawPile.length < count && currentDiscardPile.length > 0) {
      // Shuffle the discard pile and add to draw pile
      shuffleDeck(currentDiscardPile);
      currentDrawPile = [...currentDrawPile, ...currentDiscardPile];
      currentDiscardPile = [];
      recycled = true;
      setDeckRecycled(true);
      // Auto-hide the recycled indicator after 2 seconds
      setTimeout(() => setDeckRecycled(false), 2000);
    }

    if (currentDrawPile.length === 0) {
      setMessage("No cards available to draw!");
      return;
    }

    // Draw the requested number of cards (or as many as available)
    const actualCount = Math.min(count, currentDrawPile.length);
    const cardsToDraw = currentDrawPile.slice(0, actualCount);
    const newDrawPile = currentDrawPile.slice(actualCount);

    setDrawPile(newDrawPile);
    setDiscardPile(currentDiscardPile);

    if (who === 0) {
      // Player
      setPlayerDeck((prev) => [...prev, ...cardsToDraw]);
      trackHumanDraw(); // Track for AI awareness - human couldn't play
    } else {
      // Computer (who is 1-based index for computers, so who-1 for array index)
      const computerIndex = who - 1;
      setComputerDecks((prev) => {
        const newDecks = [...prev];
        newDecks[computerIndex] = [...newDecks[computerIndex], ...cardsToDraw];
        return newDecks;
      });
    }

    if (recycled) {
      const drawerName = who === 0 ? playerName : getComputerName(who - 1);
      setMessage(`Deck recycled! ${drawerName} drew ${actualCount} card(s).`);
    }

    return cardsToDraw;
  };
  
  // Helper to get the name of the current turn player
  const getTurnPlayerName = (turnIndex) => {
    return turnIndex === 0 ? playerName : getComputerName(turnIndex - 1);
  };
  
  // Helper to get next turn (counterclockwise around the table)
  const getNextTurn = (currentTurn) => {
    const turnOrder = getCounterclockwiseTurnOrder();
    const currentIndex = turnOrder.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
  };

  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleGameCardNumChange = (e) => setGameCardNum(parseInt(e.target.value));
  const handleNumPlayersChange = (e) => setNumPlayers(parseInt(e.target.value));
  const toggleTheme = () => setIsDarkTheme(!isDarkTheme);
  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabledState(newState);
    setAudioEnabled(newState);
  };
  
  // Helper to get computer name
  const getComputerName = (index) => computerNames[index] || `Bot ${index + 1}`;

  // Power cards: A, 2, J, Q (K has no power - it's a normal card)
  const POWER_CARD_NUMS = ["A", "2", "J", "Q"];
  const isNormalCard = (c) => !POWER_CARD_NUMS.includes(c.num);
  // Cards that can be paired with Q: any normal card of same color (includes K)
  const canPairWithQ = (c) => isNormalCard(c);

  const handleCardClick = (card) => {
    if (turn !== 0 || rankings.includes(0)) return; // Only active player can click cards

    // Toggle selection - deselect if already selected
    if (selectedCards.find(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      return;
    }

    // Max 2 cards can be selected (only Q pairing allowed)
    if (selectedCards.length >= 2) {
      // Replace selection with new card
      setSelectedCards([card]);
      return;
    }

    // If one card is already selected, check if pairing is allowed
    if (selectedCards.length === 1) {
      const firstCard = selectedCards[0];
      
      // Only Q can be paired, and only with cards that can pair with Q (normal cards + K)
      // Q must be the first selected card
      const isQueenPair = firstCard.num === "Q" && 
                          firstCard.color === card.color && 
                          canPairWithQ(card);
      
      if (isQueenPair) {
        setSelectedCards([firstCard, card]);
      } else {
        // Switch selection to new card
        setSelectedCards([card]);
      }
    } else {
      // No cards selected, select this one
      setSelectedCards([card]);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCards.length === 0) return;
    const firstCard = selectedCards[0];

    // Validation for Penalty / Skip
    if (penaltyStack > 0 && firstCard.num !== "2") {
        setMessage(`Must play a 2 or draw ${penaltyStack} cards!`);
        return;
    }

    if (skipActive && firstCard.num !== "J") {
        setMessage("You are skipped! Play a Jack to pass it or skip turn.");
        return; 
    }

    // Check validity against current card OR Q pair card (if Q was paired)
    const validAgainstCurrent = isValidMove(firstCard, currentPlayCard, activeColor);
    const validAgainstQPair = qPairCard && isValidMove(firstCard, qPairCard, qPairCard.color);
    if (!validAgainstCurrent && !validAgainstQPair && !skipActive) { 
         setMessage("Invalid Move!");
         return;
    }
    
    if (skipActive && firstCard.num === "J") {
        // Valid counter play
    } else if (skipActive) {
        setMessage("Must play a Jack!");
        return;
    }


    // Pair validation - only Q can be paired, and only with normal cards of same color
    if (selectedCards.length > 1) {
        if (selectedCards.length > 2) {
            setMessage("Maximum 2 cards can be played!");
            return;
        }

        // Only Q can be paired with a card that can pair with Q (normal cards + K)
        const secondCard = selectedCards[1];
        const isValidQueenPair = firstCard.num === "Q" && 
                                  firstCard.color === secondCard.color && 
                                  canPairWithQ(secondCard);

        if (!isValidQueenPair) {
             setMessage("Only Q can be paired with same color card (including K)!");
             return;
        }
        
        // Q pair can only be played if Q matches the current active color (no color change power)
        if (firstCard.color !== activeColor) {
            setMessage("Q pair can only be played matching the current color!");
            return;
        }
    }

    playCards(0, selectedCards);
    setSelectedCards([]);
  };

  // Handle drag end - check if card was dropped on play area (works on mobile & desktop)
  const handleDragEnd = (card, info) => {
    if (turn !== 0 || rankings.includes(0)) return; // Only active player can drag
    
    // Check if card was dropped over the play area
    if (!playAreaRef.current) return;
    
    const playAreaRect = playAreaRef.current.getBoundingClientRect();
    
    // Get drop coordinates - info.point contains the pointer position
    const dropX = info.point.x;
    const dropY = info.point.y;
    
    // Add tolerance - make the drop zone larger for easier dropping on mobile
    const tolerance = 60;
    
    // Check if the drop point is within the play area (with tolerance)
    const isOverPlayArea = 
      dropX >= playAreaRect.left - tolerance &&
      dropX <= playAreaRect.right + tolerance &&
      dropY >= playAreaRect.top - tolerance &&
      dropY <= playAreaRect.bottom + tolerance;
    
    if (!isOverPlayArea) {
      return;
    }
    
    // Card was dropped on play area - attempt to play it
    let cardsToPlay = [card];
    if (selectedCards.find(c => c.id === card.id)) {
      cardsToPlay = selectedCards;
    }

    const firstCard = cardsToPlay[0];
    
    if (penaltyStack > 0 && firstCard.num !== "2") {
      setMessage(`Must play a 2 or draw ${penaltyStack} cards!`);
      return;
    }
    if (skipActive && firstCard.num !== "J") {
      setMessage("You are skipped! Must play a Jack.");
      return;
    }

    // Check validity against current card OR Q pair card (if Q was paired)
    const validAgainstCurrent = isValidMove(firstCard, currentPlayCard, activeColor);
    const validAgainstQPair = qPairCard && isValidMove(firstCard, qPairCard, qPairCard.color);
    if (!validAgainstCurrent && !validAgainstQPair && !skipActive) {
      setMessage("Invalid Move!");
      return;
    }
    
    // Pair validation - only Q can be paired, and only with normal cards of same color
    if (cardsToPlay.length > 1) {
      if (cardsToPlay.length > 2) {
        setMessage("Maximum 2 cards can be played!");
        return;
      }

      const secondCard = cardsToPlay[1];
      const isValidQueenPair = firstCard.num === "Q" && 
                                firstCard.color === secondCard.color && 
                                canPairWithQ(secondCard);

      if (!isValidQueenPair) {
        setMessage("Only Q can be paired with same color card (including K)!");
        return;
      }
      
      // Q pair can only be played if Q matches the current active color (no color change power)
      if (firstCard.color !== activeColor) {
        setMessage("Q pair can only be played matching the current color!");
        return;
      }
    }

    playCards(0, cardsToPlay);
    setSelectedCards([]);
  };

  // who: 0 = player, 1+ = computer index
  const playCards = (who, cards) => {
    const primaryCard = cards[0];
    const whoName = getTurnPlayerName(who);

    // Play card placement sound
    playCardPlaceSound();
    
    // Increment move count for this player
    setPlayerMoves(prev => {
      const newMoves = [...prev];
      newMoves[who] = (newMoves[who] || 0) + 1;
      return newMoves;
    });

    if (who === 0) {
      setPlayerDeck((prev) => prev.filter((c) => !cards.find(pc => pc.id === c.id)));
      setSelectedCards([]); // Always clear selection when player plays
      trackHumanPlay(cards); // Track for AI awareness
    } else {
      const computerIndex = who - 1;
      setComputerDecks((prev) => {
        const newDecks = [...prev];
        newDecks[computerIndex] = newDecks[computerIndex].filter((c) => !cards.find(pc => pc.id === c.id));
        return newDecks;
      });
    }

    // Add the old current card and all but the last played card to discard pile
    const cardsToDiscard = [];
    if (currentPlayCard) {
      cardsToDiscard.push(currentPlayCard);
    }
    // If multiple cards played, all except last go to discard pile
    if (cards.length > 1) {
      cardsToDiscard.push(...cards.slice(0, -1));
    }
    if (cardsToDiscard.length > 0) {
      setDiscardPile((prev) => [...prev, ...cardsToDiscard]);
    }

    // Update visible stack for visual effect (keep last 5 cards)
    if (currentPlayCard) {
      setVisibleStack((prev) => {
        const newStack = [...prev, currentPlayCard];
        // Keep only the last 5 cards for visual effect
        return newStack.slice(-5);
      });
    }

    const lastCard = cards[cards.length - 1];
    setCurrentPlayCard(lastCard);

    // Clear any previous Q pair card when a new play is made
    setQPairCard(null);

    let shouldChangeColor = true;
    // Queen Pair Rule: When Q is played with same-color card
    // The non-Q card becomes current, but next player can match against BOTH cards
    // Q pair does NOT have power to change colors - only about shedding two cards
    if (primaryCard.num === "Q" && cards.length > 1) {
        // Set the Q as the secondary card that next player can also match against
        setQPairCard(primaryCard); // Store the Q for dual matching
        shouldChangeColor = false; // Q pair does NOT change color
    }
    if (shouldChangeColor && primaryCard.num !== "A") {
        setActiveColor(lastCard.color);
    }

    let nextTurn = getNextTurn(who);
    let nextPenalty = penaltyStack;
    let nextSkipActive = false;
    
    // Calculate deck length AFTER playing cards (for finish checks)
    let currentDeckLength;
    if (who === 0) {
      currentDeckLength = playerDeck.length - cards.length;
    } else {
      currentDeckLength = computerDecks[who - 1].length - cards.length;
    }
    
    const effect = getCardEffect(primaryCard);
    const nextPlayerName = getTurnPlayerName(nextTurn);

    if (effect) {
         if (primaryCard.num === "Q") {
             if (cards.length === 1) {
                 // Q penalty: draw 1 card (this also prevents finishing with Q)
                 drawCard(who, 1);
                 playPenaltySound(); // Play penalty sound for Q
                 if (currentDeckLength === 0) {
                     // Player tried to finish with Q - the draw above already penalizes
                     setMessage(`${whoName} cannot finish with Queen! Drew 1 card.`);
                 } else {
                     setMessage(`${whoName} played Queen and drew 1 card.`);
                 }
                 // Skip the separate "cannot finish" check below for Q
                 setPenaltyStack(nextPenalty);
                 setSkipActive(nextSkipActive);
                 setTurn(getNextActiveTurn(who));
                 return;
             } else {
                 playQueenPairSound(); // Special sound for Q pair
                 setMessage(`${whoName} played Queen Pair!`);
             }
         } else if (effect.type === "CHANGE_COLOR_ANY") {
             playAceSound(); // Magical sound for Ace color change
             if (who === 0) {
                 setShowColorPicker(true);
                 return;
             } else {
                 // Smart Ace: Consider both remaining hand AND human's weak colors
                 const computerHand = computerDecks[who - 1] || [];
                 // Filter out the cards being played (Ace) to get remaining cards
                 const remainingCards = computerHand.filter(c => !cards.find(pc => pc.id === c.id));

                 const colorCounts = { "♠": 0, "♥️": 0, "♦": 0, "♣": 0 };
                 remainingCards.forEach(c => {
                   if (colorCounts[c.color] !== undefined) {
                     colorCounts[c.color]++;
                   }
                 });

                 // Pick color with most cards in remaining hand
                 let bestColor = colors[0];
                 let maxCount = -1;
                 colors.forEach(color => {
                   if (colorCounts[color] > maxCount) {
                     maxCount = colorCounts[color];
                     bestColor = color;
                   }
                 });

                 // If no cards remaining or tie, consider human's weak colors to hurt them
                 if (maxCount <= 1) {
                   const humanWeakColors = getHumanWeakColors();
                   if (humanWeakColors.length > 0) {
                     // If we have cards in a color human is weak in, prefer that
                     const weakColorWithCards = humanWeakColors.find(c => colorCounts[c] > 0);
                     if (weakColorWithCards) {
                       bestColor = weakColorWithCards;
                     } else if (maxCount === 0) {
                       // No cards left, just pick human's weakest color
                       bestColor = humanWeakColors[0];
                     }
                   } else if (maxCount === 0) {
                     // Fallback: pick most played color overall
                     bestColor = getMostPlayedColor();
                   }
                 }

                 setActiveColor(bestColor);
                 setMessage(`${whoName} changed color to ${bestColor}`);
             }
         } else if (effect.type === "SKIP") {
             playSkipSound(); // Alert sound for skip
             nextSkipActive = true;
             setMessage(`${nextPlayerName} faces a Skip!`);
         } else if (effect.type === "DRAW_SKIP") {
             playPenaltySound(); // Penalty sound for 2's
             nextPenalty += (2 * cards.length);
             setMessage(`Penalty increased to ${nextPenalty}!`);
         }
    }
    
    setPenaltyStack(nextPenalty);
    setSkipActive(nextSkipActive);

    // Check if player finished (currentDeckLength calculated earlier)
    if (currentDeckLength === 0) {
        // Check if any played card is a power card - power cards cannot finish the game
        const playedPowerCard = cards.some(card => isPowerCard(card));
        if (playedPowerCard) {
            // Player must draw one card from stack - cannot finish with power card
            drawCard(who, 1);
            setMessage(`${whoName} cannot finish with a power card! Drew 1 card.`);
        } else {
            // Player finished! Add to rankings
            const newRankings = [...rankings, who];
            setRankings(newRankings);
            
            // Record the moves this player took to finish (current moves + 1 for this play)
            const finishMoveCount = (playerMoves[who] || 0) + 1;
            setFinishMoves(prev => ({ ...prev, [who]: finishMoveCount }));
            
            const place = newRankings.length;
            const placeStr = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`;
            setMessage(`${whoName} finished ${placeStr} in ${finishMoveCount} moves!`);
            
            // Update high score if this is 1st place and beats the record
            if (place === 1) {
                if (highScore === null || finishMoveCount < highScore.moves) {
                    const newHighScore = {
                        moves: finishMoveCount,
                        name: whoName,
                        date: new Date().toLocaleDateString(),
                        numPlayers: numPlayers,
                        startingCards: gameCardNum
                    };
                    setHighScore(newHighScore);
                    try {
                        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(newHighScore));
                    } catch (e) {
                        console.error("Failed to save high score:", e);
                    }
                }
            }
            
            // Check if game is over (only 1 player left)
            const remainingPlayers = numPlayers - newRankings.length;
            if (remainingPlayers <= 1) {
                // Find the last player and add them to rankings
                for (let i = 0; i < numPlayers; i++) {
                    if (!newRankings.includes(i)) {
                        setRankings([...newRankings, i]);
                        break;
                    }
                }
                setGameOver(true);

                // Record game completion statistics
                const endTime = Date.now();
                setGameEndTime(endTime);
                const updatedStats = recordGameCompletion({
                    playerName,
                    rankings: [...newRankings, ...Array.from({ length: numPlayers - newRankings.length }, (_, i) => newRankings.length + i)],
                    gameStartTime,
                    gameEndTime: endTime,
                    numPlayers,
                    gameCardNum
                });

                // Save player name for future use
                savePlayerName(playerName);

                // Update displayed stats and player names
                setPlayerStats(getPlayerStats(playerName));
                setGlobalStats(getGlobalStats());
                setSavedPlayerNames(getPlayerNames());

                return;
            }
            
            // Game continues - move to next active player
            setTurn(getNextActiveTurn(who));
            return;
        }
    }

    setTurn(getNextActiveTurn(who));
  };

  const handleColorPick = (color) => {
    setActiveColor(color);
    setShowColorPicker(false);
    
    if (isStartingColorPick) {
      // Starting Ace: player chose color, now it's their turn to play
      setTurn(0);
      setMessage(`${playerName} chose ${color} as active color. Your turn!`);
      setIsStartingColorPick(false);
    } else {
      // Normal Ace play: check if player tried to finish with Ace (power card)
      // Player deck has already been updated when the Ace was played
      if (playerDeck.length === 0) {
        // Player cannot finish with Ace - must draw 1 card
        drawCard(0, 1);
        setMessage(`${playerName} cannot finish with Ace! Drew 1 card.`);
      } else {
        setMessage(`${playerName} changed color to ${color}`);
      }
      // Turn goes to next active player
      setTurn(getNextActiveTurn(0));
    }
  };

  const handleDrawClick = () => {
    if (turn !== 0) return; // Only player (turn 0) can click draw
    if (!isPlayerActive(0)) return; // Player already finished

    if (skipActive) {
        playSkipSound(); // Sound for being skipped
        setMessage("Skipped turn!");
        setSkipActive(false);
        setTurn(getNextActiveTurn(0));
        return;
    }

    if (penaltyStack > 0) {
        playPenaltySound(); // Penalty sound for drawing cards
        drawCard(0, penaltyStack);
        setPenaltyStack(0);
        setTurn(getNextActiveTurn(0));
        setMessage(`You drew ${penaltyStack} cards due to penalty.`);
    } else {
        drawCard(0, 1);
        setTurn(getNextActiveTurn(0));
    }
  };

  // ===== SMART AI LOGIC =====
  
  // Analyze discard pile to understand which colors/numbers are depleted
  const analyzeDiscardPile = () => {
    const colorCount = { "♠": 0, "♥️": 0, "♦": 0, "♣": 0 };
    const numCount = {};
    
    discardPile.forEach(card => {
      if (colorCount[card.color] !== undefined) {
        colorCount[card.color]++;
      }
      numCount[card.num] = (numCount[card.num] || 0) + 1;
    });
    
    // Also count visible stack
    visibleStack.forEach(card => {
      if (colorCount[card.color] !== undefined) {
        colorCount[card.color]++;
      }
      numCount[card.num] = (numCount[card.num] || 0) + 1;
    });
    
    return { colorCount, numCount };
  };
  
  // Find the color that's been played most (opponents likely don't have it)
  const getMostPlayedColor = () => {
    const { colorCount } = analyzeDiscardPile();
    let maxColor = colors[0];
    let maxCount = 0;
    
    colors.forEach(color => {
      if (colorCount[color] > maxCount) {
        maxCount = colorCount[color];
        maxColor = color;
      }
    });
    
    return maxColor;
  };
  
  // Get next active opponent (for targeting)
  const getNextOpponent = (currentTurn) => {
    const next = getNextActiveTurn(currentTurn);
    return {
      index: next,
      isHuman: next === 0,
      cardCount: next === 0 ? playerDeck.length : (computerDecks[next - 1]?.length || 99)
    };
  };
  
  // ===== HUMAN BEHAVIOR ANALYSIS FOR SMARTER AI =====
  
  // Track when human plays a card
  const trackHumanPlay = (cards) => {
    setHumanPlayHistory(prev => {
      const newColorCounts = { ...prev.colorCounts };
      cards.forEach(card => {
        if (newColorCounts[card.color] !== undefined) {
          newColorCounts[card.color]++;
        }
      });
      return {
        ...prev,
        cardsPlayed: [...prev.cardsPlayed, ...cards.map(c => ({ card: c, turn: playerMoves[0] || 0 }))],
        colorCounts: newColorCounts,
        consecutiveDraws: 0, // Reset consecutive draws when human plays
      };
    });
  };
  
  // Track when human draws cards
  const trackHumanDraw = () => {
    setHumanPlayHistory(prev => ({
      ...prev,
      drawCount: prev.drawCount + 1,
      lastDrawTurn: playerMoves[0] || 0,
      consecutiveDraws: prev.consecutiveDraws + 1,
    }));
  };
  
  // Analyze what colors human is likely weak in (played a lot = probably low)
  const getHumanWeakColors = () => {
    const { colorCounts } = humanPlayHistory;
    const totalPlayed = Object.values(colorCounts).reduce((a, b) => a + b, 0);
    if (totalPlayed === 0) return [];
    
    // Colors played more than average are likely weak points
    const avgPlayed = totalPlayed / 4;
    const weakColors = colors.filter(c => colorCounts[c] > avgPlayed);
    
    // Sort by most played (most likely to be weak)
    return weakColors.sort((a, b) => colorCounts[b] - colorCounts[a]);
  };
  
  // Analyze if human is struggling (drew recently, consecutive draws)
  const isHumanStruggling = () => {
    const { consecutiveDraws, drawCount } = humanPlayHistory;
    const totalMoves = playerMoves[0] || 0;
    
    // Human is struggling if:
    // - They've drawn 2+ times in a row
    // - They draw more than they play (high draw rate)
    const drawRate = totalMoves > 0 ? drawCount / totalMoves : 0;
    
    return {
      struggling: consecutiveDraws >= 2 || drawRate > 0.4,
      consecutiveDraws,
      drawRate,
      recentlyDrew: humanPlayHistory.lastDrawTurn >= (totalMoves - 2),
    };
  };
  
  // Get the best color to change to when playing Ace (to hurt human player)
  const getBestAceColorAgainstHuman = () => {
    const weakColors = getHumanWeakColors();
    
    // If we know colors human is weak in, pick one of those
    if (weakColors.length > 0) {
      return weakColors[0];
    }
    
    // Otherwise fall back to most played color overall
    return getMostPlayedColor();
  };
  
  // Smart card selection for computer
  const selectSmartCard = (hand, validCards, computerIdx, currentActiveColor) => {
    if (validCards.length === 0) return null;
    if (validCards.length === 1) return { card: validCards[0], paired: null };
    
    const nextOpponent = getNextOpponent(computerIdx + 1);
    const handSize = hand.length;
    
    // Categorize valid cards
    const twos = validCards.filter(c => c.num === "2");
    const jacks = validCards.filter(c => c.num === "J");
    const aces = validCards.filter(c => c.num === "A");
    const queens = validCards.filter(c => c.num === "Q");
    const normalCards = validCards.filter(c => !isPowerCard(c));
    
    // STRATEGY 1: If close to winning (2-3 cards), save normal cards to finish
    if (handSize <= 3 && normalCards.length > 0) {
      // If we have exactly one normal card, try to use power cards first
      if (normalCards.length === 1 && (twos.length > 0 || jacks.length > 0)) {
        // Use power cards to delay, save the finisher
        if (jacks.length > 0 && nextOpponent.cardCount <= 3) {
          return { card: jacks[0], paired: null }; // Skip opponent who's close to winning
        }
        if (twos.length > 0) {
          return { card: twos[0], paired: null };
        }
      }
      // Play normal card to finish (if it's our last non-power card)
      if (handSize === 1 && normalCards.length === 1) {
        return { card: normalCards[0], paired: null };
      }
    }
    
    // STRATEGY 2: Pressure opponent who's close to winning
    if (nextOpponent.cardCount <= 2) {
      // Try to skip them with Jack
      if (jacks.length > 0) {
        return { card: jacks[0], paired: null };
      }
      // Or hit them with 2 penalty
      if (twos.length > 0) {
        return { card: twos[0], paired: null };
      }
    }
    
    // STRATEGY 3: Target human player specifically when they're low OR struggling
    const humanStatus = isHumanStruggling();
    if (nextOpponent.isHuman && (nextOpponent.cardCount <= 4 || humanStatus.struggling)) {
      // Human is struggling - press harder!
      if (jacks.length > 0) {
        return { card: jacks[0], paired: null }; // Skip them
      }
      if (twos.length > 0) {
        return { card: twos[0], paired: null }; // Force draw
      }
      // If we have cards in colors human is weak in, play those
      const humanWeakColors = getHumanWeakColors();
      if (humanWeakColors.length > 0) {
        const cardsInWeakColor = normalCards.filter(c => humanWeakColors.includes(c.color));
        if (cardsInWeakColor.length > 0) {
          return { card: cardsInWeakColor[0], paired: null };
        }
      }
    }
    
    // STRATEGY 4: Queen pairing - try to pair Q with same-color normal card (K is normal)
    // Q pair can only be played if Q matches the active color (no color change power)
    if (queens.length > 0) {
      for (const queen of queens) {
        // Only consider Q that matches active color for pairing
        if (queen.color !== currentActiveColor) continue;
        
        const pairableCards = hand.filter(c => 
          c.id !== queen.id && 
          c.color === queen.color && 
          !isPowerCard(c) // Any non-power card (K included since it's not a power card)
        );
        if (pairableCards.length > 0) {
          // Found a pair! Play Q + normal card
          return { card: queen, paired: pairableCards[0] };
        }
      }
    }
    
    // STRATEGY 5: Use Ace strategically - change to color most played (opponents likely don't have)
    if (aces.length > 0 && handSize > 2) {
      // Save Ace for later unless we need to change color badly
      const mostPlayedColor = getMostPlayedColor();
      const hasCardsInMostPlayed = hand.some(c => c.color === mostPlayedColor && c.num !== "A");
      
      // Only use Ace if we have cards in that color to follow up
      if (hasCardsInMostPlayed) {
        return { card: aces[0], paired: null, preferredColor: mostPlayedColor };
      }
    }
    
    // STRATEGY 6: Prefer playing cards of colors we have many of AND human is weak in
    if (normalCards.length > 0) {
      const colorGroups = {};
      hand.forEach(c => {
        colorGroups[c.color] = (colorGroups[c.color] || 0) + 1;
      });
      
      // Get human's weak colors
      const humanWeakColors = getHumanWeakColors();
      
      // Sort normal cards by: 1) human weak color, 2) how many cards of that color we have
      const sortedNormals = [...normalCards].sort((a, b) => {
        const aIsWeak = humanWeakColors.includes(a.color) ? 1 : 0;
        const bIsWeak = humanWeakColors.includes(b.color) ? 1 : 0;
        
        // Prioritize human weak colors
        if (aIsWeak !== bIsWeak) return bIsWeak - aIsWeak;
        
        // Then by how many cards of that color we have (play from largest group)
        return (colorGroups[b.color] || 0) - (colorGroups[a.color] || 0);
      });
      
      return { card: sortedNormals[0], paired: null };
    }
    
    // STRATEGY 7: If only power cards left, prioritize: 2 > J > Q > A
    if (twos.length > 0) return { card: twos[0], paired: null };
    if (jacks.length > 0) return { card: jacks[0], paired: null };
    if (queens.length > 0) return { card: queens[0], paired: null };
    if (aces.length > 0) return { card: aces[0], paired: null };
    
    // Fallback: random valid card
    return { card: validCards[Math.floor(Math.random() * validCards.length)], paired: null };
  };
  
  // Computer AI - handles all computer players
  useEffect(() => {
    // Check if it's any computer's turn (turn > 0) and they're still active
    if (turn > 0 && gameStart && !gameOver && computerDecks.length > 0 && isPlayerActive(turn)) {
      const computerIndex = turn - 1;
      const currentComputerDeck = computerDecks[computerIndex];
      const computerName = getComputerName(computerIndex);
      
      if (!currentComputerDeck || currentComputerDeck.length === 0) return;
      
      const timer = setTimeout(() => {
          
        if (skipActive) {
            const jackCard = currentComputerDeck.find(c => c.num === "J");
            if (jackCard) {
                playCards(turn, [jackCard]);
                setMessage(`${computerName} countered Skip with a Jack!`);
            } else {
                playSkipSound(); // Sound for being skipped
                setMessage(`${computerName} skipped turn.`);
                setSkipActive(false);
                setTurn(getNextActiveTurn(turn));
            }
            return;
        }

        if (penaltyStack > 0) {
            // Smart: Stack if we have 2, otherwise take the hit
            const penaltyCard = currentComputerDeck.find(c => c.num === "2");
            if (penaltyCard) {
                playCards(turn, [penaltyCard]);
                return;
            } else {
                playPenaltySound(); // Penalty sound for drawing cards
                drawCard(turn, penaltyStack);
                setPenaltyStack(0);
                setTurn(getNextActiveTurn(turn));
                setMessage(`${computerName} drew ${penaltyStack} cards for penalty.`);
                return;
            }
        }

        // Check validity against current card OR Q pair card (if Q was paired)
        const validCards = currentComputerDeck.filter(c => {
            const validAgainstCurrent = isValidMove(c, currentPlayCard, activeColor);
            const validAgainstQPair = qPairCard && isValidMove(c, qPairCard, qPairCard.color);
            return validAgainstCurrent || validAgainstQPair;
        });
        
        if (validCards.length > 0) {
            // Use smart card selection
            const selection = selectSmartCard(currentComputerDeck, validCards, computerIndex, activeColor);
            
            if (selection.paired) {
                // Play Queen pair
                playCards(turn, [selection.card, selection.paired]);
            } else if (selection.card.num === "A" && selection.preferredColor) {
                // For Ace, we'll set the preferred color after playing
                // Store it temporarily (the playCards function handles Ace color selection)
                playCards(turn, [selection.card]);
            } else {
                playCards(turn, [selection.card]);
            }
        } else {
            drawCard(turn, 1);
            setTurn(getNextActiveTurn(turn));
            setMessage(`${computerName} drew a card.`);
        }
      }, 1500); // Slightly faster for better game flow
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameStart, gameOver, computerDecks, currentPlayCard, activeColor, penaltyStack, skipActive, qPairCard, numPlayers, rankings, discardPile, playerDeck]);

  // Auto-skip player if they don't have a Jack to counter skip
  useEffect(() => {
    if (turn === 0 && skipActive && gameStart && !gameOver && isPlayerActive(0)) {
      // Check if player has any Jacks
      const hasJack = playerDeck.some(card => card.num === "J");
      
      if (!hasJack) {
        // Auto-skip after a short delay to show the skip indication
        const timer = setTimeout(() => {
          setMessage(`${playerName || "Player"} was skipped - no Jack to counter!`);
          setSkipActive(false);
          setTurn(getNextActiveTurn(0));
        }, 2000); // 2 second delay to show skip indication
        
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, skipActive, gameStart, gameOver, playerDeck, playerName]);

  // Check win condition effect - safety net
  // Note: Win condition is primarily checked in playCards function
  // This effect catches any edge cases
  useEffect(() => {
      if (gameStart && !gameOver) {
          // Check if player finished but not in rankings yet
          if (playerDeck.length === 0 && !rankings.includes(0) && currentPlayCard && !isPowerCard(currentPlayCard)) {
              const newRankings = [...rankings, 0];
              setRankings(newRankings);
              if (numPlayers - newRankings.length <= 1) {
                  // Add last player
                  for (let i = 0; i < numPlayers; i++) {
                      if (!newRankings.includes(i)) {
                          setRankings([...newRankings, i]);
                          break;
                      }
                  }
                  setGameOver(true);
              }
          }
          // Check each computer's deck
          computerDecks.forEach((deck, index) => {
              const playerIdx = index + 1;
              if (deck.length === 0 && !rankings.includes(playerIdx) && currentPlayCard && !isPowerCard(currentPlayCard)) {
                  const newRankings = [...rankings, playerIdx];
                  setRankings(newRankings);
                  if (numPlayers - newRankings.length <= 1) {
                      // Add last player
                      for (let i = 0; i < numPlayers; i++) {
                          if (!newRankings.includes(i)) {
                              setRankings([...newRankings, i]);
                              break;
                          }
                      }
                      setGameOver(true);
                  }
              }
          });
      }
  }, [playerDeck, computerDecks, gameStart, gameOver, currentPlayCard, rankings, numPlayers]);

  // Clean up stale selections - remove any selected cards that are no longer in player's hand
  // Only runs when playerDeck changes (not when selectedCards changes to avoid loops)
  useEffect(() => {
      setSelectedCards(prev => {
          if (prev.length === 0) return prev;
          const validSelections = prev.filter(sc =>
              playerDeck.some(pc => pc.id === sc.id)
          );
          if (validSelections.length !== prev.length) {
              return validSelections;
          }
          return prev;
      });
  }, [playerDeck]);

  // Last call audio effect - play when any player reaches their last card
  useEffect(() => {
    if (!gameStart || gameOver) return;

    const hasPlayerLastCard = playerDeck.length === 1 && !rankings.includes(0);
    const hasComputerLastCard = computerDecks.some((deck, index) =>
      deck.length === 1 && !rankings.includes(index + 1)
    );

    if (hasPlayerLastCard || hasComputerLastCard) {
      // Play last call sound with a slight delay to not overlap with card play sounds
      setTimeout(() => playLastCallSound(), 300);
    }
  }, [playerDeck.length, computerDecks, rankings, gameStart, gameOver]);


  return (
    <div 
        className={`min-h-screen overflow-hidden relative`}
    >
      {/* Background Texture */}
      <div className={`absolute inset-0 z-0 ${
          isDarkTheme 
            ? "bg-poker-dark" 
            : "bg-poker-green"
      }`} 
      >
        <div className="felt-noise w-full h-full"></div>
      </div>

      {/* Resume Game Prompt */}
      {showResumePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-600"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Welcome Back!</h2>
            <p className="text-slate-300 text-center mb-6 text-sm sm:text-base">
              You have a game in progress
              {savedGameData?.playerName && (
                <span className="block text-yellow-400 font-semibold mt-1">
                  Playing as {savedGameData.playerName}
                </span>
              )}
            </p>
            
            {savedGameData && (
              <div className="bg-slate-700/50 rounded-lg p-3 mb-6 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Your cards:</span>
                  <span className="font-bold text-white">{savedGameData.playerDeck?.length || 0}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Players:</span>
                  <span className="font-bold text-white">{savedGameData.numPlayers || 4}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Your moves:</span>
                  <span className="font-bold text-white">{savedGameData.playerMoves?.[0] || 0}</span>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleResumeGame}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                ▶️ Resume Game
              </button>
              <button
                onClick={handleStartFresh}
                className="w-full py-3 px-6 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                🆕 New Game
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full">
      {!gameStart ? (
        <div className="flex flex-col justify-center items-center min-h-screen px-4 gap-2 sm:gap-4 py-4 overflow-y-auto">
          {/* Creative Game Title */}
          <div className="relative mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white drop-shadow-2xl relative z-10">
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent animate-pulse">
                  TAKE
                </span>
                <span className="absolute -top-2 -left-2 text-red-500 text-lg animate-bounce">♠</span>
                <span className="absolute -top-2 -right-2 text-black text-lg animate-bounce" style={{animationDelay: '0.2s'}}>♣</span>
              </span>
              <span className="relative inline-block ml-2">
                <span className="bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent animate-pulse" style={{animationDelay: '0.5s'}}>
                  2
                </span>
                <span className="absolute -bottom-2 -left-2 text-red-500 text-lg animate-bounce" style={{animationDelay: '0.4s'}}>♥</span>
                <span className="absolute -bottom-2 -right-2 text-black text-lg animate-bounce" style={{animationDelay: '0.6s'}}>♦</span>
              </span>
            </h1>

            {/* Animated background cards */}
            <div className="absolute inset-0 -z-10 opacity-20">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative w-32 h-44 sm:w-40 sm:h-56 md:w-48 md:h-64">
                  {/* Back card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-2xl border-2 border-white transform rotate-6 animate-pulse"></div>
                  {/* Front card */}
                  <div className="absolute inset-0 bg-white rounded-lg shadow-2xl border-2 border-gray-300 transform -rotate-3 animate-pulse" style={{animationDelay: '1s'}}>
                    <div className="flex items-center justify-center h-full">
                      <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-red-500">♠</span>
                    </div>
                  </div>
                  {/* Side card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 rounded-lg shadow-2xl border-2 border-white transform rotate-12 animate-pulse" style={{animationDelay: '2s'}}></div>
                </div>
              </div>
            </div>

            {/* Sparkle effects */}
            <div className="absolute -top-4 left-1/4 text-yellow-300 animate-ping">✨</div>
            <div className="absolute -top-2 right-1/4 text-yellow-300 animate-ping" style={{animationDelay: '1s'}}>⭐</div>
            <div className="absolute -bottom-4 left-1/3 text-yellow-300 animate-ping" style={{animationDelay: '2s'}}>✨</div>
          </div>
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 text-black w-full max-w-xs mt-8 sm:mt-0">
            {/* Player Name Input with Dropdown */}
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={handlePlayerNameChange}
                className="w-full px-4 py-3 border-2 border-yellow-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/90 text-base mb-4 sm:mb-0"
              />
              {savedPlayerNames.length > 0 && (
              <div className="text-white/70 text-xs text-center mt-4 mb-4">
                Or select from your previous player
              </div>
            )}
              <div className="mt-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setPlayerName(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-yellow-400 rounded-lg bg-white/90 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                >
                  <option value="" disabled>Select player name...</option>
                  {savedPlayerNames.length === 0 && (
                    <option value="" disabled className="text-gray-400">
                      No saved names yet - play a game first!
                    </option>
                  )}
                  {savedPlayerNames.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Number of Cards Selector */}
            <div className="w-full">
              {/* Mobile: Ultra-compact horizontal layout */}
              <div className="block sm:hidden">
                <div className="flex gap-4 mb-2 overflow-x-auto pb-1 mt-4 sm:mt-0">
                  {[
                    { cards: 5, short: "Fast", emoji: "⚡" },
                    { cards: 7, short: "Normal", emoji: "🎯" },
                    { cards: 10, short: "Long", emoji: "🏃" },
                    { cards: 13, short: "Epic", emoji: "🏔️" }
                  ].map(({ cards, short, emoji }) => (
                    <button
                      key={cards}
                      onClick={() => setGameCardNum(cards)}
                      className={`flex-shrink-0 w-[65px] h-[50px] p-1 rounded-md font-bold transition-all transform hover:scale-105 shadow-md border-2 flex flex-col items-center justify-center ${
                        gameCardNum === cards
                          ? 'bg-yellow-500 text-black border-yellow-400 shadow-yellow-500/50'
                          : 'bg-white/90 text-gray-700 border-gray-300 hover:border-yellow-400'
                      }`}
                    >
                      <div className="text-sm leading-none">{emoji}</div>
                      <div className="text-[10px] font-bold leading-tight mt-0.5">{short}</div>
                      <div className="text-[9px] font-normal leading-none">{cards}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop: Full grid layout */}
              <div className="hidden sm:grid sm:grid-cols-2 sm:gap-2 sm:mb-3">
                {[
                  { cards: 5, label: "Quick", desc: "⚡ Fast", time: "~5-10 min" },
                  { cards: 7, label: "Standard", desc: "🎯 Normal", time: "~10-15 min" },
                  { cards: 10, label: "Extended", desc: "🏃 Long", time: "~15-25 min" },
                  { cards: 13, label: "Marathon", desc: "🏔️ Epic", time: "~25-40 min" }
                ].map(({ cards, label, desc, time }) => (
                  <button
                    key={cards}
                    onClick={() => setGameCardNum(cards)}
                    className={`p-3 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg border-2 text-center ${
                      gameCardNum === cards
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-yellow-500/50'
                        : 'bg-white/90 text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                  >
                    <div className="text-sm font-bold">{label}</div>
                    <div className="text-xs opacity-75">{desc}</div>
                    <div className="text-xs mt-1 font-normal">{cards} cards</div>
                  </button>
                ))}
              </div>

              {/* Description - ultra compact on mobile */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1 bg-slate-600/30 rounded-md px-2 py-1 sm:px-4 sm:py-2">
                  <span className="text-white text-[10px] sm:text-sm">
                    📊 {gameCardNum} cards
                    <span className="hidden sm:inline">
                      {gameCardNum === 5 && " • Quick games"}
                      {gameCardNum === 7 && " • Balanced"}
                      {gameCardNum === 10 && " • Strategic"}
                      {gameCardNum === 13 && " • Ultimate"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            {/* Number of Players Selector */}
            <div className="w-full">
              <div className="flex justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumPlayers(num)}
                    className={`px-3 py-2 sm:px-4 sm:py-3 rounded-md sm:rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg border-2 text-sm sm:text-base ${
                      numPlayers === num
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-yellow-500/50'
                        : 'bg-white/90 text-gray-700 border-gray-300 hover:border-yellow-400'
                    }`}
                  >
                    {num}
                    <span className="hidden sm:inline"> Players</span>
                  </button>
                ))}
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-1 bg-slate-600/30 rounded-md px-2 py-1 sm:px-4 sm:py-2">
                  <span className="text-white text-[10px] sm:text-sm">
                    {numPlayers === 2 && '🤖 1 AI'}
                    {numPlayers === 3 && '🤖🤖 2 AI'}
                    {numPlayers === 4 && '🤖🤖🤖 3 AI'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* High Score Display */}
          {/* {highScore && (
            <div className="mb-4 bg-gradient-to-r from-yellow-600/30 to-yellow-400/30 rounded-xl px-6 py-3 border border-yellow-500/50 text-center">
              <div className="text-yellow-300 font-bold text-lg">🏆 Best Record</div>
              <div className="text-white text-2xl font-bold">{highScore.moves} moves</div>
              <div className="text-yellow-200/70 text-sm">by {highScore.name}</div>
              <button
                onClick={() => {
                  setHighScore(null);
                  try { localStorage.removeItem(HIGH_SCORE_KEY); } catch(e) {}
                }}
                className="text-xs text-white/40 hover:text-white/60 mt-1 underline"
              >
                Clear Record
              </button>
            </div>
          )} */}

          {/* Player Badge and Stats - Mobile Optimized */}
          {playerName && playerStats && playerStats.games > 0 && (
            <div className="mb-3 sm:mb-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-xl px-3 py-3 sm:px-6 sm:py-4 border border-slate-600/50">
              {/* Mobile: Compact horizontal layout */}
              <div className="block sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{playerStats.badge.icon}</span>
                    <div>
                      <div className="text-white font-bold text-sm" style={{ color: playerStats.badge.color }}>
                        {playerStats.badge.name}
                      </div>
                      <div className="text-white/60 text-xs">
                        {playerStats.games}g • {playerStats.wins}w • {playerStats.winRate}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/60 text-xs">Best</div>
                    <div className="text-white font-bold text-xs">{formatDuration(playerStats.bestTime)}</div>
                  </div>
                </div>

                {/* Progress bar - simplified for mobile */}
                {(() => {
                  const currentBadgeIndex = BADGE_LEVELS.findIndex(b => b.name === playerStats.badge.name);
                  const nextBadge = BADGE_LEVELS[currentBadgeIndex + 1];

                  if (nextBadge) {
                    const gamesProgress = Math.min(playerStats.games / nextBadge.minGames, 1);
                    const winsProgress = Math.min(playerStats.wins / nextBadge.minWins, 1);
                    const overallProgress = Math.min(gamesProgress, winsProgress);

                    return (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                          <span>Next: {nextBadge.icon}</span>
                          <span>{Math.round(overallProgress * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-600/50 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${overallProgress * 100}%`,
                              backgroundColor: nextBadge.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 text-center">
                      <span className="text-yellow-400 text-xs font-bold">🎉 MAX!</span>
                    </div>
                  );
                })()}
              </div>

              {/* Desktop: Full layout */}
              <div className="hidden sm:block">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl">{playerStats.badge.icon}</span>
                    <div>
                      <div className="text-white font-bold text-xl text-left" style={{ color: playerStats.badge.color }}>
                        {playerStats.badge.name}
                      </div>
                      <div className="text-white/70 text-sm">
                        {playerStats.games} games • {playerStats.wins} wins • {playerStats.winRate}% win rate
                      </div>
                    </div>
                  </div>

                  {/* Next Badge Progress */}
                  {(() => {
                    const currentBadgeIndex = BADGE_LEVELS.findIndex(b => b.name === playerStats.badge.name);
                    const nextBadge = BADGE_LEVELS[currentBadgeIndex + 1];

                    if (nextBadge) {
                      const gamesProgress = Math.min(playerStats.games / nextBadge.minGames, 1);
                      const winsProgress = Math.min(playerStats.wins / nextBadge.minWins, 1);
                      const overallProgress = Math.min(gamesProgress, winsProgress);

                      return (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                            <span>Next: {nextBadge.icon} {nextBadge.name}</span>
                            <span>{Math.round(overallProgress * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-600/50 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${overallProgress * 100}%`,
                                backgroundColor: nextBadge.color
                              }}
                            />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-2 text-center">
                        <span className="text-yellow-400 text-sm font-bold">🎉 MAX LEVEL ACHIEVED!</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-600/30 rounded-lg p-2">
                    <div className="text-white/70 text-xs">Best Time</div>
                    <div className="text-white font-bold text-sm">{formatDuration(playerStats.bestTime)}</div>
                  </div>
                  <div className="bg-slate-600/30 rounded-lg p-2">
                    <div className="text-white/70 text-xs">Win Rate</div>
                    <div className="text-white font-bold text-sm">{playerStats.winRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

         
          
          <button
            className={`font-bold py-3 px-8 md:py-4 md:px-12 rounded-full transition-all transform shadow-xl border-4 text-lg md:text-xl ${
              assetsLoaded 
                ? "bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-600 hover:scale-105" 
                : "bg-gray-500 text-gray-300 border-gray-600 cursor-wait"
            }`}
            onClick={startGame}
            disabled={!assetsLoaded}
          >
            {assetsLoaded ? "DEAL CARDS" : (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                LOADING...
              </span>
            )}
          </button>
           {/* Global Stats Button */}
           <div className="mb-2 sm:mb-4 mt-8 sm:mt-8">
            <button
              onClick={() => setShowGlobalStatsModal(true)}
              className="w-full bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/50 hover:to-slate-700/50 rounded-xl px-6 py-3 border border-slate-600/50 transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-center">
                <div className="text-white font-bold text-lg mb-1">🏆 Global Stats</div>
                <div className="text-white/70 text-sm">View leaderboard & records</div>
              </div>
            </button>
          </div>
          {!assetsLoaded && (
            <p className="text-white/60 text-xs mt-2 animate-pulse">Caching card assets for smooth gameplay...</p>
          )}
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col p-2 sm:p-4 relative overflow-visible">
            {/* Game Over / Rankings Overlay */}
            {gameOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="text-center max-w-md">
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                            {rankings[0] === 0 ? "🎉 YOU WIN!" : `${getComputerName(rankings[0] - 1).toUpperCase()} WINS!`}
                        </h2>
                        
                        {/* High Score Banner */}
                        {highScore && (
                            <div className="bg-gradient-to-r from-yellow-600/40 to-yellow-400/40 rounded-lg px-4 py-2 mb-3 border border-yellow-500/50">
                                <span className="text-yellow-300 text-sm font-bold">🏆 Best Record: {highScore.moves} moves</span>
                                <span className="text-yellow-200/70 text-xs ml-2">by {highScore.name}</span>
                            </div>
                        )}
                        
                        {/* New Record Celebration */}
                        {highScore && finishMoves[rankings[0]] === highScore.moves && (
                            <div className="bg-gradient-to-r from-green-500/50 to-emerald-500/50 rounded-lg px-4 py-2 mb-3 border border-green-400 animate-pulse">
                                <span className="text-white font-bold">🎊 NEW RECORD! 🎊</span>
                            </div>
                        )}
                        
                        {/* Rankings List */}
                        <div className="bg-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm">
                            <h3 className="text-white font-bold text-lg mb-2">Final Rankings</h3>
                            {rankings.map((playerIdx, rank) => (
                                <div key={playerIdx} className={`flex items-center justify-between px-4 py-2 rounded-lg mb-1 ${
                                    playerIdx === 0 ? 'bg-yellow-500/30' : 'bg-white/5'
                                }`}>
                                    <span className="text-white font-bold w-8">
                                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`}
                                    </span>
                                    <span className={`text-white flex-1 text-left ${playerIdx === 0 ? 'font-bold' : ''}`}>
                                        {playerIdx === 0 ? playerName : getComputerName(playerIdx - 1)}
                                    </span>
                                    <span className="text-white/70 text-sm">
                                        {finishMoves[playerIdx] ? `${finishMoves[playerIdx]} moves` : '-'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={handleNewGame}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold shadow-xl border-4 border-yellow-600 text-base sm:text-lg transition-all transform hover:scale-105"
                        >
                            🎮 PLAY AGAIN
                        </button>
                    </div>
                </div>
            )}
            
            {/* In-game Rankings Banner (shows during game when players finish) */}
            {rankings.length > 0 && !gameOver && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-xs sm:text-sm">
                        Finished: {rankings.map((idx, i) => (
                            <span key={idx} className="mx-1">
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} 
                                {idx === 0 ? playerName : getComputerName(idx - 1)}
                                <span className="text-white/60 text-xs ml-1">({finishMoves[idx]} moves)</span>
                            </span>
                        ))}
                    </span>
                </div>
            )}

            {/* Color Picker Overlay - no blur so player can see their cards to choose best suit */}
            {showColorPicker && (
                <div className="absolute inset-0 z-40 flex items-center justify-center px-4 bg-black/30">
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl border-4 border-yellow-500">
                        <h3 className="text-lg sm:text-xl font-bold text-black mb-3 sm:mb-4 text-center">Pick a Suit</h3>
                        <div className="flex gap-2 sm:gap-4">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleColorPick(c)}
                                    className={`w-12 h-12 sm:w-16 sm:h-16 text-2xl sm:text-4xl flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                                        isRedColor(c) ? "border-red-500 text-red-500 bg-red-50" : "border-black text-black bg-gray-50"
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

          {/* Header - Mobile: top row with suit, rules, theme; Desktop: horizontal layout */}
          <div className="mb-2 sm:mb-4">
            {/* Mobile Top Bar */}
            <div className="flex sm:hidden justify-between items-center mb-2">
              {/* Theme Toggle & Active Color - Mobile Left */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewGame}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-full shadow-lg border-2 border-red-400 transition-colors"
                >
                  NEW
                </button>
                <button
                  onClick={toggleAudio}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 text-sm ${
                    audioEnabled ? "bg-green-500 text-white" : "bg-gray-600 text-gray-300"
                  }`}
                  title={audioEnabled ? "Disable Audio" : "Enable Audio"}
                >
                  {audioEnabled ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={toggleTheme}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 text-sm ${
                    isDarkTheme ? "bg-gray-800 text-white" : "bg-yellow-400 text-black"
                  }`}
                >
                  {isDarkTheme ? "🌙" : "☀️"}
                </button>
                <div className="flex items-center bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 shadow-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xl bg-white shadow-inner ${
                        isRedColor(activeColor) ? "text-red-600" : "text-black"
                    }`}>
                        {activeColor}
                    </div>
                </div>
              </div>
              
              {/* Rules - Mobile Right */}
              <GameRules isDarkTheme={isDarkTheme} />
            </div>
            
            {/* Mobile Message */}
            <div className="flex sm:hidden justify-center">
              <div className={`text-xs font-bold text-white backdrop-blur-md px-4 py-2 rounded-full border shadow-lg text-center max-w-[250px] truncate ${
                turn === 0 && skipActive ? 'bg-red-600/80 border-red-400' : 'bg-black/40 border-white/20'
              }`}>
                  {message || (turn === 0 && skipActive ? "⏭️ You are SKIPPED!" : turn === 0 ? "Your Turn" : `${getComputerName(turn - 1)}'s Turn`)}
              </div>
            </div>
            
            {/* Desktop Header */}
            <div className="hidden sm:flex justify-between items-center">
              {/* Active Color Display - Desktop */}
              <div className="flex items-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-lg">
                  <span className="text-white font-bold mr-3 text-lg">ACTIVE SUIT</span>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-3xl bg-white shadow-inner ${
                      isRedColor(activeColor) ? "text-red-600" : "text-black"
                  }`}>
                      {activeColor}
                  </div>
              </div>

              <div className={`text-lg font-bold text-white backdrop-blur-md px-8 py-3 rounded-full border shadow-lg text-center min-w-[300px] truncate ${
                turn === 0 && skipActive ? 'bg-red-600/80 border-red-400' : 'bg-black/40 border-white/20'
              }`}>
                  {message || (turn === 0 && skipActive ? "⏭️ You are SKIPPED!" : turn === 0 ? "Your Turn" : `${getComputerName(turn - 1)}'s Turn`)}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleNewGame}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg border-2 border-red-400 transition-colors"
                >
                  NEW GAME
                </button>
                <GameRules isDarkTheme={isDarkTheme} />
                <button
                  onClick={toggleAudio}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 text-base ${
                    audioEnabled ? "bg-green-500 text-white" : "bg-gray-600 text-gray-300"
                  }`}
                  title={audioEnabled ? "Disable Audio" : "Enable Audio"}
                >
                  {audioEnabled ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 text-base ${
                    isDarkTheme ? "bg-gray-800 text-white" : "bg-yellow-400 text-black"
                  }`}
                >
                  {isDarkTheme ? "🌙" : "☀️"}
                </button>
              </div>
            </div>
          </div>

          {/* Game Table Layout - Computers around, Player at bottom */}
          <div className="flex-1 flex flex-col relative">
            
            {/* Top Computer (Computer 1 - always shown if exists) */}
            {computerDecks.length >= 1 && (
              <div className="flex justify-center py-1 sm:py-2">
                {(() => {
                  const computerIdx = 0;
                  const playerIdx = 1;
                  const deck = computerDecks[computerIdx];
                  const hasFinished = rankings.includes(playerIdx);
                  const finishPlace = rankings.indexOf(playerIdx);
                  
                  return (
                    <div className={`flex flex-col items-center transition-all ${
                      hasFinished ? 'opacity-50' : ''
                    } ${turn === playerIdx && !hasFinished ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-400/10' : ''} ${deck.length === 1 && !hasFinished ? 'ring-4 ring-red-500 rounded-lg p-2 bg-red-500/20 animate-pulse shadow-lg shadow-red-500/50' : ''}`}>
                      {/* Last Call Indicator for Computer */}
                      {deck.length === 1 && !hasFinished && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="mb-1 bg-gradient-to-r from-red-500 to-orange-500 backdrop-blur-md px-3 py-1 rounded-full border-2 border-yellow-400 shadow-lg animate-bounce"
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-white font-black text-xs animate-pulse">🚨</span>
                            <span className="text-yellow-200 text-xs font-bold">LAST</span>
                          </div>
                        </motion.div>
                      )}
                      {hasFinished ? (
                        <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-lg border-2 border-green-400">
                          <span className="text-2xl sm:text-4xl">
                            {finishPlace === 0 ? '🥇' : finishPlace === 1 ? '🥈' : '🥉'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex -space-x-8 sm:-space-x-10">
                          <AnimatePresence>
                            {deck.map((card, cardIndex) => (
                              <Card
                                key={card.id}
                                card={{...card, color: '?', num: '?'}}
                                index={cardIndex}
                                className={`border-2 shadow-lg ${deck.length === 1 ? 'border-red-400 shadow-red-500/50 animate-pulse' : 'border-white'}`}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                      <div className={`mt-1 text-xs sm:text-sm font-bold text-white px-2 sm:px-3 py-0.5 rounded-full backdrop-blur-sm ${
                        hasFinished ? 'bg-green-500/30' : turn === playerIdx ? 'bg-yellow-500/50' : 'bg-black/30'
                      } ${deck.length === 1 && !hasFinished ? 'bg-red-500/60 animate-pulse' : ''}`}>
                          {hasFinished ? '✓ ' : ''}{getComputerName(computerIdx)} {hasFinished ? '' : `(${deck.length})`}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Middle Row: Left Computer, Play Area, Right Computer */}
            <div className="flex-1 flex items-center justify-center sm:gap-16 md:gap-24 lg:gap-32">
              
              {/* Left Computer (Computer 2 - if 3+ players) */}
              {computerDecks.length >= 2 && (
                <div className="flex-shrink-0 px-2">
                  {(() => {
                    const computerIdx = 1;
                    const playerIdx = 2;
                    const deck = computerDecks[computerIdx];
                    const hasFinished = rankings.includes(playerIdx);
                    const finishPlace = rankings.indexOf(playerIdx);

                    return (
                      <div className={`flex flex-col items-center transition-all ${
                        hasFinished ? 'opacity-50' : ''
                      } ${turn === playerIdx && !hasFinished ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-400/10' : ''} ${deck.length === 1 && !hasFinished ? 'ring-4 ring-red-500 rounded-lg p-2 bg-red-500/20 animate-pulse shadow-lg shadow-red-500/50' : ''}`}>
                        {/* Last Call Indicator for Computer */}
                        {deck.length === 1 && !hasFinished && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mb-1 bg-gradient-to-r from-red-500 to-orange-500 backdrop-blur-md px-2 py-1 rounded-full border-2 border-yellow-400 shadow-lg animate-bounce"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-white font-black text-xs animate-pulse">🚨</span>
                              <span className="text-yellow-200 text-xs font-bold">LAST</span>
                            </div>
                          </motion.div>
                        )}
                        {hasFinished ? (
                          <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-lg border-2 border-green-400">
                            <span className="text-xl sm:text-2xl">
                              {finishPlace === 0 ? '🥇' : finishPlace === 1 ? '🥈' : '🥉'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col -space-y-12 sm:-space-y-14">
                            <AnimatePresence>
                              {deck.slice(0, 6).map((card, cardIndex) => (
                                <Card
                                  key={card.id}
                                  card={{...card, color: '?', num: '?'}}
                                  index={cardIndex}
                                  className={`border-2 shadow-lg ${deck.length === 1 ? 'border-red-400 shadow-red-500/50 animate-pulse' : 'border-white'}`}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                        <div className={`mt-1 text-[10px] sm:text-xs font-bold text-white px-2 py-0.5 rounded-full backdrop-blur-sm ${
                          hasFinished ? 'bg-green-500/30' : turn === playerIdx ? 'bg-yellow-500/50' : 'bg-black/30'
                        } ${deck.length === 1 && !hasFinished ? 'bg-red-500/60 animate-pulse' : ''}`}>
                            {hasFinished ? '✓ ' : ''}{getComputerName(computerIdx)} {hasFinished ? '' : `(${deck.length})`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Play Area - Center */}
              <div className="flex items-center justify-center gap-8 sm:gap-12 md:gap-16 relative">
            {/* Draw/Pass Pile */}
            <div 
                onClick={handleDrawClick}
                className={`relative w-20 h-28 sm:w-28 sm:h-40 md:w-36 md:h-52 bg-blue-900 rounded-lg sm:rounded-xl border-2 sm:border-4 border-white shadow-2xl cursor-pointer hover:scale-105 transition-all transform flex items-center justify-center group ${turn !== 0 ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-blue-500/50"} ${deckRecycled ? "ring-2 sm:ring-4 ring-yellow-400 ring-opacity-75" : ""}`}
                style={{
                    backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                }}
            >
                <div className="text-center">
                    <span className="text-white font-black text-sm sm:text-lg md:text-xl block drop-shadow-md">
                        {skipActive ? "SKIP" : (penaltyStack > 0 ? "PENALTY" : "DRAW")}
                    </span>
                    {skipActive && <span className="text-[10px] sm:text-xs text-white/80">Tap to Pass</span>}
                    <span className="text-[10px] sm:text-xs text-white/60 block mt-0.5 sm:mt-1">{drawPile.length} cards</span>
                </div>

                {penaltyStack > 0 && (
                    <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 bg-red-600 text-white w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg text-xs sm:text-lg animate-bounce">
                        +{penaltyStack}
                    </div>
                )}

                {/* Deck Recycled Indicator */}
                {deckRecycled && (
                    <div className="absolute -bottom-8 sm:-bottom-12 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap animate-bounce shadow-lg">
                        ♻️ Recycled!
                    </div>
                )}
            </div>

            {/* Current Card Area */}
            <div className="relative flex items-center gap-2">
                {/* Q Pair Card - shown when Q was paired */}
                {qPairCard && (
                    <>
                        {/* Desktop: Show card to the left */}
                        <div className="hidden sm:block absolute -left-20 md:-left-28 top-1/2 transform -translate-y-1/2 z-20">
                            <div className="relative">
                                <div className="transform scale-75 md:scale-90 opacity-80">
                                    <Card
                                        card={qPairCard}
                                        className="shadow-xl border-2 border-purple-400"
                                    />
                                </div>
                                <div className="absolute -bottom-5 md:-bottom-6 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold whitespace-nowrap">
                                    OR Q
                                </div>
                            </div>
                        </div>
                        {/* Mobile: Show small card above play area */}
                        <div className="sm:hidden absolute -top-20 left-1/2 transform -translate-x-1/2 z-30">
                            <div className="relative">
                                <div className="transform scale-50 opacity-90">
                                    <Card
                                        card={qPairCard}
                                        className="shadow-xl border-2 border-purple-400"
                                    />
                                </div>
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-2 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap shadow-lg">
                                    OR Q
                                </div>
                            </div>
                        </div>
                    </>
                )}
                
                <div
                    ref={playAreaRef}
                    className={`w-28 h-36 sm:w-40 sm:h-52 md:w-56 md:h-72 border-2 sm:border-4 border-dashed rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm ${qPairCard ? "border-purple-400/50" : "border-white/30"} relative overflow-visible`}
                >
                    {/* Stacked previous cards - more visible rotations */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {visibleStack.map((card, index) => {
                            // More pronounced rotations and offsets for visibility
                            const rotation = (index % 2 === 0 ? -1 : 1) * (8 + index * 6);
                            const offsetX = (index % 2 === 0 ? -1 : 1) * (15 + index * 8);
                            const offsetY = -5 + index * 3;
                            const opacity = 0.5 + (index / visibleStack.length) * 0.4;
                            const scale = 1.15;
                            
                            return (
                                <motion.div
                                    key={card.id}
                                    className="absolute"
                                    initial={{ 
                                        scale: 1.5, 
                                        opacity: 0, 
                                        y: -80,
                                        rotate: 0 
                                    }}
                                    animate={{ 
                                        scale: scale,
                                        opacity: opacity,
                                        x: offsetX,
                                        y: offsetY,
                                        rotate: rotation
                                    }}
                                    transition={{ 
                                        duration: 0.4,
                                        ease: "easeOut"
                                    }}
                                    style={{ zIndex: index }}
                                >
                                    <Card
                                        card={card}
                                        className="shadow-lg"
                                    />
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Current card on top - bigger */}
                    <AnimatePresence mode="wait">
                        {currentPlayCard && (
                            <motion.div 
                                key={currentPlayCard.id}
                                className="relative z-10"
                                initial={{ 
                                    scale: 0.5, 
                                    opacity: 0, 
                                    y: -100,
                                    rotate: -20
                                }}
                                animate={{ 
                                    scale: 1.4, 
                                    opacity: 1, 
                                    y: 0,
                                    rotate: 0
                                }}
                                exit={{ 
                                    scale: 1.2, 
                                    opacity: 0.5,
                                    transition: { duration: 0.2 }
                                }}
                                transition={{ 
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20
                                }}
                            >
                                <Card
                                    card={currentPlayCard}
                                    className="shadow-2xl ring-2 ring-white/30"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
              </div>
              
              {/* Right Computer (Computer 3 - if 4 players) */}
              {computerDecks.length >= 3 && (
                <div className="flex-shrink-0 px-2">
                  {(() => {
                    const computerIdx = 2;
                    const playerIdx = 3;
                    const deck = computerDecks[computerIdx];
                    const hasFinished = rankings.includes(playerIdx);
                    const finishPlace = rankings.indexOf(playerIdx);

                    return (
                      <div className={`flex flex-col items-center transition-all ${
                        hasFinished ? 'opacity-50' : ''
                      } ${turn === playerIdx && !hasFinished ? 'ring-2 ring-yellow-400 rounded-lg p-2 bg-yellow-400/10' : ''} ${deck.length === 1 && !hasFinished ? 'ring-4 ring-red-500 rounded-lg p-2 bg-red-500/20 animate-pulse shadow-lg shadow-red-500/50' : ''}`}>
                        {/* Last Call Indicator for Computer */}
                        {deck.length === 1 && !hasFinished && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mb-1 bg-gradient-to-r from-red-500 to-orange-500 backdrop-blur-md px-2 py-1 rounded-full border-2 border-yellow-400 shadow-lg animate-bounce"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-white font-black text-xs animate-pulse">🚨</span>
                              <span className="text-yellow-200 text-xs font-bold">LAST</span>
                            </div>
                          </motion.div>
                        )}
                        {hasFinished ? (
                          <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-lg border-2 border-green-400">
                            <span className="text-xl sm:text-2xl">
                              {finishPlace === 0 ? '🥇' : finishPlace === 1 ? '🥈' : '🥉'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col -space-y-12 sm:-space-y-14">
                            <AnimatePresence>
                              {deck.slice(0, 6).map((card, cardIndex) => (
                                <Card
                                  key={card.id}
                                  card={{...card, color: '?', num: '?'}}
                                  index={cardIndex}
                                  className={`border-2 shadow-lg ${deck.length === 1 ? 'border-red-400 shadow-red-500/50 animate-pulse' : 'border-white'}`}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                        <div className={`mt-1 text-[10px] sm:text-xs font-bold text-white px-2 py-0.5 rounded-full backdrop-blur-sm ${
                          hasFinished ? 'bg-green-500/30' : turn === playerIdx ? 'bg-yellow-500/50' : 'bg-black/30'
                        } ${deck.length === 1 && !hasFinished ? 'bg-red-500/60 animate-pulse' : ''}`}>
                            {hasFinished ? '✓ ' : ''}{getComputerName(computerIdx)} {hasFinished ? '' : `(${deck.length})`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
            </div>
            
            {/* Play Selected Button - Only show for Q pairing (2 cards) */}
            {selectedCards.length === 2 && turn === 0 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                    <button
                        onClick={handlePlaySelected}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-8 rounded-full shadow-xl animate-bounce border-2 border-green-300 text-sm sm:text-lg"
                    >
                        PLAY Q PAIR
                    </button>
                </div>
            )}
          </div>

          {/* Player Area */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-end pb-2 sm:pb-4 overflow-visible transition-all ${
            rankings.includes(0) ? 'opacity-60' : ''
          }`}>
            {/* Last Call Indicator - Show when player has last card */}
            {playerDeck.length === 1 && !rankings.includes(0) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-2 bg-gradient-to-r from-red-500 to-orange-500 backdrop-blur-md px-4 py-2 rounded-full border-2 border-yellow-400 shadow-lg animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm sm:text-base animate-bounce">🚨 LAST CALL!</span>
                  <span className="text-yellow-200 text-xs sm:text-sm font-bold">Final Card</span>
                </div>
              </motion.div>
            )}
            {/* Skip Indicator - Show when player is skipped and doesn't have Jack */}
            {turn === 0 && skipActive && !playerDeck.some(card => card.num === "J") && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-2 bg-red-600/90 backdrop-blur-md px-4 py-2 rounded-full border-2 border-red-400 shadow-lg animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm sm:text-base">⏭️ SKIPPED</span>
                  <span className="text-white/90 text-xs sm:text-sm">No Jack to counter</span>
                </div>
              </motion.div>
            )}
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className={`text-xs sm:text-base font-bold text-white px-3 sm:px-4 py-0.5 sm:py-1 rounded-full backdrop-blur-sm ${
                rankings.includes(0) ? 'bg-green-500/30' : turn === 0 ? 'bg-yellow-500/50' : 'bg-black/30'
              }`}>
                  {rankings.includes(0) ? `✓ ${rankings.indexOf(0) === 0 ? '🥇' : rankings.indexOf(0) === 1 ? '🥈' : '🥉'} ` : ''}{playerName || "Player"} {!rankings.includes(0) && `(${playerDeck.length})`}
              </div>
              {/* Move Counter */}
              <div className="text-[10px] sm:text-xs text-white/70 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {playerMoves[0] || 0} moves
              </div>
            </div>
            <div
              className={`flex overflow-visible p-2 sm:p-4 min-h-[100px] sm:min-h-[140px] md:min-h-[160px] items-end pb-4 sm:pb-8 px-4 sm:px-6 justify-center transition-all ${
                turn === 0 && !rankings.includes(0) ? 'ring-2 ring-yellow-400 rounded-xl bg-yellow-400/10' : ''
              } ${playerDeck.length === 1 && !rankings.includes(0) ? 'ring-4 ring-red-500 rounded-xl bg-red-500/20 animate-pulse shadow-lg shadow-red-500/50' : ''}`}
            >
              <AnimatePresence>
                {sortCardsByColor(playerDeck).map((card, index) => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  // Highlight playable Jacks if skip is active
                  const isJack = card.num === 'J';
                  const highlightSkip = skipActive && isJack;
                  
                  // Suggest Pair - Q can pair with same color cards (normal cards + K)
                  // Only highlight if Q matches activeColor (Q pair can't change color)
                  let highlightPair = false;
                  if (selectedCards.length === 1 && !isSelected) {
                      const first = selectedCards[0];
                      // Q can pair with normal cards + K of same color, but Q must match activeColor
                      if (first.num === "Q" && first.color === activeColor && first.color === card.color && canPairWithQ(card)) {
                          highlightPair = true;
                      }
                  }
                  
                  // Calculate overlap margin - tighter stacking for more cards
                  // Card width is ~60px on mobile, we want cards to overlap significantly
                  const cardCount = playerDeck.length;
                  const overlap = cardCount > 10 ? -48 : cardCount > 7 ? -44 : -38;
                  
                  return (
                    <motion.div
                      key={card.id}
                      drag={turn === 0 && !rankings.includes(0)}
                      dragSnapToOrigin
                      dragElastic={1}
                      dragMomentum={false}
                      dragTransition={{ bounceStiffness: 500, bounceDamping: 30 }}
                      whileDrag={{ 
                        scale: 1.1, 
                        zIndex: 9999,
                        boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.4)"
                      }}
                      onTap={() => handleCardClick(card)}
                      onDragEnd={(event, info) => handleDragEnd(card, info)}
                      className={`cursor-grab active:cursor-grabbing touch-none ${
                          isSelected 
                            ? "-translate-y-4 sm:-translate-y-8 z-20 scale-105 sm:scale-110" 
                            : highlightPair 
                              ? "-translate-y-3 sm:-translate-y-5 z-10" 
                              : ""
                      }`}
                      style={{ 
                        touchAction: "none", 
                        position: "relative",
                        marginLeft: index === 0 ? 0 : overlap,
                      }}
                    >
                      <Card
                        card={card}
                        index={index}
                        className={`border shadow-lg ${
                            isSelected 
                            ? "border-yellow-400 border-4 shadow-yellow-500/50" 
                            : highlightSkip 
                                ? "border-green-400 border-4 shadow-green-500/50" 
                                : highlightPair
                                    ? "border-blue-400 border-4 animate-pulse shadow-blue-500/50" 
                                    : "border-gray-300"
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Global Stats Modal */}
      {showGlobalStatsModal && globalStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-600 relative"
          >
            {/* Close button */}
            <button
              onClick={() => setShowGlobalStatsModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-xl font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
              🏆 Global Stats
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                  <div className="text-white/70 text-xs mb-1">Total Games</div>
                  <div className="text-white font-bold text-2xl">{globalStats.totalGames}</div>
                </div>
                <div className="bg-slate-600/30 rounded-lg p-3 text-center">
                  <div className="text-white/70 text-xs mb-1">Longest Game</div>
                  <div className="text-white font-bold text-lg">{formatDuration(globalStats.longestGame)}</div>
                </div>
              </div>

              <div className="space-y-3">
                {globalStats.mostWins.player && (
                  <div className="flex justify-between items-center bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                    <span className="text-white/70 text-sm">👑 Most Wins:</span>
                    <span className="text-white font-bold">{globalStats.mostWins.player} ({globalStats.mostWins.count})</span>
                  </div>
                )}
                {globalStats.mostLosses.player && (
                  <div className="flex justify-between items-center bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                    <span className="text-white/70 text-sm">💔 Most Losses:</span>
                    <span className="text-white font-bold">{globalStats.mostLosses.player} ({globalStats.mostLosses.count})</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2">
                <div className="text-white/60 text-xs">
                  Win Rate: <span className="text-white font-bold">{globalStats.winRate}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Game Version Footer */}
      <div className="absolute bottom-2 right-2 text-white/30 text-xs font-mono bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
        {GAME_VERSION}
      </div>
      </div>
    </div>
  );
}
