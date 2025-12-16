"use client";

import { useEffect, useState, useRef } from "react";
import { shuffleDeck, isRedColor } from "@/utils/utils";
import { isValidMove, getCardEffect, checkWinCondition, isPowerCard } from "@/utils/rule";
import { Card } from "./components/Card";
import { GameRules } from "./components/GameRules"; // Import GameRules component
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

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

export default function Home() {
  const [deck, setDeck] = useState([]); // Initial full deck for setup
  const [drawPile, setDrawPile] = useState([]); // Remaining cards to draw
  const [discardPile, setDiscardPile] = useState([]); // Played cards (for recycling)
  const [visibleStack, setVisibleStack] = useState([]); // Last few cards for visual stack effect
  const [gameStart, setGameStart] = useState(false);
  const [playerDeck, setPlayerDeck] = useState([]);
  const [computerDeck, setComputerDeck] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [gameCardNum, setGameCardNum] = useState(7);
  const [currentPlayCard, setCurrentPlayCard] = useState(null);
  const [activeColor, setActiveColor] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [turn, setTurn] = useState("player"); // 'player' or 'computer'
  const [message, setMessage] = useState("");
  const [penaltyStack, setPenaltyStack] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isStartingColorPick, setIsStartingColorPick] = useState(false); // Track if color pick is for starting Ace
  const [winner, setWinner] = useState(null);
  const [skipActive, setSkipActive] = useState(false); // Track if a skip is pending
  const [deckRecycled, setDeckRecycled] = useState(false); // Show deck recycled indicator
  const [qPairCard, setQPairCard] = useState(null); // Track Q pair secondary card for dual matching
  
  // Multi-select state
  const [selectedCards, setSelectedCards] = useState([]);

  // Initialize game
  useEffect(() => {
    const initialDeck = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < cardNums.length; j++) {
        const uniqueId = `${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
        initialDeck.push({ id: uniqueId, color: colors[i], num: cardNums[j] });
      }
    }
    shuffleDeck(initialDeck);
    setDeck(initialDeck);
  }, []);

  // Winner Effect: Confetti and Timer
  useEffect(() => {
    if (winner) {
      if (winner === "player") {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 100,
        });
      }

      const timer = setTimeout(() => {
        setGameStart(false);
        setWinner(null);
        setPlayerDeck([]);
        setComputerDeck([]);
        setMessage("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [winner]);

  const startGame = () => {
    if (!!playerName && !!gameCardNum) {
      const newDeck = [...deck];
      shuffleDeck(newDeck);

      let pDeck = newDeck.slice(0, gameCardNum);
      const cDeck = newDeck.slice(gameCardNum, gameCardNum * 2);
      const startCard = newDeck[gameCardNum * 2];
      let remainingDeck = newDeck.slice(gameCardNum * 2 + 1);

      // Handle starting card penalties
      let startMessage = `Game Started! ${playerName}'s Turn`;
      let startingTurn = "player";
      let startingActiveColor = startCard.color;
      let showStartColorPicker = false;
      
      if (startCard.num === "2") {
        // Starting with 2: player draws 2 cards
        const penaltyCards = remainingDeck.slice(0, 2);
        remainingDeck = remainingDeck.slice(2);
        pDeck = [...pDeck, ...penaltyCards];
        startMessage = `Game Started! Starting card is 2 - ${playerName} draws 2 cards!`;
      } else if (startCard.num === "Q") {
        // Starting with Q: player draws 1 card
        const penaltyCards = remainingDeck.slice(0, 1);
        remainingDeck = remainingDeck.slice(1);
        pDeck = [...pDeck, ...penaltyCards];
        startMessage = `Game Started! Starting card is Q - ${playerName} draws 1 card!`;
      } else if (startCard.num === "J") {
        // Starting with J: player's turn is skipped
        startingTurn = "computer";
        startMessage = `Game Started! Starting card is J - ${playerName}'s turn is skipped!`;
      } else if (startCard.num === "A") {
        // Starting with A: player chooses active color
        showStartColorPicker = true;
        startMessage = `Game Started! Starting card is A - ${playerName} choose the active color!`;
      }

      setPlayerDeck(pDeck);
      setComputerDeck(cDeck);
      setCurrentPlayCard(startCard);
      setActiveColor(startingActiveColor);
      setDrawPile(remainingDeck);
      setDiscardPile([]); // Start with empty discard pile
      setGameStart(true);
      setTurn(startingTurn);
      setMessage(startMessage);
      setPenaltyStack(0);
      setSkipActive(false);
      setWinner(null);
      setSelectedCards([]);
      setShowColorPicker(showStartColorPicker);
      setIsStartingColorPick(showStartColorPicker); // Mark if this is a starting Ace color pick
      setDeckRecycled(false);
      setQPairCard(null);
      setVisibleStack([]); // Reset visual stack
    }
  };

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

    if (who === "player") {
      setPlayerDeck((prev) => [...prev, ...cardsToDraw]);
    } else {
      setComputerDeck((prev) => [...prev, ...cardsToDraw]);
    }

    if (recycled) {
      setMessage(`Deck recycled! ${who === "player" ? playerName : "Computer"} drew ${actualCount} card(s).`);
    }

    return cardsToDraw;
  };

  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleGameCardNumChange = (e) => setGameCardNum(parseInt(e.target.value));
  const toggleTheme = () => setIsDarkTheme(!isDarkTheme);

  // Power cards that cannot be paired with Q
  const POWER_CARD_NUMS = ["A", "2", "J", "K"];
  const isNormalCard = (c) => !POWER_CARD_NUMS.includes(c.num) && c.num !== "Q";

  const handleCardClick = (card) => {
    if (turn !== "player") return;

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
      
      // Only Q can be paired, and only with NORMAL cards of same color
      // Q must be the first selected card
      const isQueenPair = firstCard.num === "Q" && 
                          firstCard.color === card.color && 
                          isNormalCard(card);
      
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

        // Only Q can be paired with a normal card of same color
        const secondCard = selectedCards[1];
        const isValidQueenPair = firstCard.num === "Q" && 
                                  firstCard.color === secondCard.color && 
                                  isNormalCard(secondCard);

        if (!isValidQueenPair) {
             setMessage("Only Q can be paired with a normal card of same color!");
             return;
        }
    }

    playCards("player", selectedCards);
    setSelectedCards([]);
  };

  const handleDragStart = (e, card) => {
    if (turn !== "player") return;
    e.dataTransfer.setData("text/plain", JSON.stringify(card));
    
    if (!selectedCards.find(c => c.id === card.id)) {
        setSelectedCards([card]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (turn !== "player") return;

    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    const droppedCard = JSON.parse(data);

    let cardsToPlay = [droppedCard];
    if (selectedCards.find(c => c.id === droppedCard.id)) {
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
                                  isNormalCard(secondCard);

        if (!isValidQueenPair) {
             setMessage("Only Q can be paired with a normal card of same color!");
             return;
        }
    }

    playCards("player", cardsToPlay);
    setSelectedCards([]);
  };

  const playCards = (who, cards) => {
    const primaryCard = cards[0];

    if (who === "player") {
      setPlayerDeck((prev) => prev.filter((c) => !cards.find(pc => pc.id === c.id)));
    } else {
      setComputerDeck((prev) => prev.filter((c) => !cards.find(pc => pc.id === c.id)));
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
    if (primaryCard.num === "Q" && cards.length > 1) {
        // Set the Q as the secondary card that next player can also match against
        setQPairCard(primaryCard); // Store the Q for dual matching
        shouldChangeColor = true; // Color DOES change to the paired card's color
    }
    if (shouldChangeColor && primaryCard.num !== "A") {
        setActiveColor(lastCard.color);
    }

    let nextTurn = who === "player" ? "computer" : "player";
    let nextPenalty = penaltyStack;
    let nextSkipActive = false;
    
    const effect = getCardEffect(primaryCard);

    if (effect) {
         if (primaryCard.num === "Q") {
             if (cards.length === 1) {
                 drawCard(who, 1);
                 setMessage(`${who === "player" ? playerName : "Computer"} played Queen and drew 1 card.`);
             } else {
                 setMessage(`${who === "player" ? playerName : "Computer"} played Queen Pair!`);
             }
         } else if (effect.type === "CHANGE_COLOR_ANY") {
             if (who === "player") {
                 setShowColorPicker(true);
                 return; 
             } else {
                 const randomColor = colors[Math.floor(Math.random() * colors.length)];
                 setActiveColor(randomColor);
                 setMessage(`Computer changed color to ${randomColor}`);
             }
         } else if (effect.type === "SKIP") {
             nextSkipActive = true;
             setMessage(`${who === "player" ? "Computer" : playerName} faces a Skip!`);
         } else if (effect.type === "DRAW_SKIP") {
             nextPenalty += (2 * cards.length);
             setMessage(`Penalty increased to ${nextPenalty}!`);
         }
    }
    
    setPenaltyStack(nextPenalty);
    setSkipActive(nextSkipActive);

    const currentDeckLength = (who === "player" ? playerDeck.length : computerDeck.length) - cards.length;
    if (currentDeckLength === 0) {
        // Check if any played card is a power card - power cards cannot finish the game
        const playedPowerCard = cards.some(card => isPowerCard(card));
        if (playedPowerCard) {
            // Player must draw one card from stack - cannot finish with power card
            drawCard(who, 1);
            setMessage(`${who === "player" ? playerName : "Computer"} cannot finish with a power card! Drew 1 card.`);
        } else {
            setWinner(who);
            return;
        }
    }

    setTurn(nextTurn);
  };

  const handleColorPick = (color) => {
    setActiveColor(color);
    setShowColorPicker(false);
    
    if (isStartingColorPick) {
      // Starting Ace: player chose color, now it's their turn to play
      setTurn("player");
      setMessage(`${playerName} chose ${color} as active color. Your turn!`);
      setIsStartingColorPick(false);
    } else {
      // Normal Ace play: turn goes to computer
      setTurn("computer");
      setMessage(`${playerName} changed color to ${color}`);
    }
  };

  const handleDrawClick = () => {
    if (turn !== "player") return;
    
    if (skipActive) {
        setMessage("Skipped turn!");
        setSkipActive(false); 
        setTurn("computer");
        return;
    }
    
    if (penaltyStack > 0) {
        drawCard("player", penaltyStack);
        setPenaltyStack(0);
        setTurn("computer");
        setMessage(`You drew ${penaltyStack} cards due to penalty.`);
    } else {
        drawCard("player", 1);
        setTurn("computer"); 
    }
  };

  // Computer AI
  useEffect(() => {
    if (turn === "computer" && gameStart && !winner) {
      const timer = setTimeout(() => {
          
        if (skipActive) {
            const jackCard = computerDeck.find(c => c.num === "J");
            if (jackCard) {
                playCards("computer", [jackCard]);
                setMessage("Computer countered Skip with a Jack!");
            } else {
                setMessage("Computer skipped turn.");
                setSkipActive(false);
                setTurn("player");
            }
            return;
        }
          
        if (penaltyStack > 0) {
            const penaltyCard = computerDeck.find(c => c.num === "2");
            if (penaltyCard) {
                playCards("computer", [penaltyCard]);
                return;
            } else {
                drawCard("computer", penaltyStack);
                setPenaltyStack(0);
                setTurn("player");
                setMessage("Computer drew cards for penalty.");
                return;
            }
        }

        // Check validity against current card OR Q pair card (if Q was paired)
        const validCards = computerDeck.filter(c => {
            const validAgainstCurrent = isValidMove(c, currentPlayCard, activeColor);
            const validAgainstQPair = qPairCard && isValidMove(c, qPairCard, qPairCard.color);
            return validAgainstCurrent || validAgainstQPair;
        });
        
        if (validCards.length > 0) {
            const cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
            playCards("computer", [cardToPlay]);
        } else {
            drawCard("computer", 1);
            setTurn("player");
            setMessage("Computer drew a card.");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameStart, winner, computerDeck, currentPlayCard, activeColor, penaltyStack, skipActive, qPairCard]);

  // Check win condition effect
  // Note: Win condition is primarily checked in playCards function
  // This effect is a safety net but should not trigger for power card scenarios
  // since playCards handles drawing a card when finishing with power cards
  useEffect(() => {
      if (gameStart && !winner) {
          // Only check win if current play card is NOT a power card
          // (power card finishes are handled in playCards with a penalty draw)
          if (currentPlayCard && !isPowerCard(currentPlayCard)) {
              if (playerDeck.length === 0) setWinner("player");
              if (computerDeck.length === 0) setWinner("computer");
          }
      }
  }, [playerDeck, computerDeck, gameStart, winner, currentPlayCard]);


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

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full">
      {!gameStart ? (
        <div className="flex flex-col justify-center items-center h-screen px-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 md:mb-8 text-white drop-shadow-lg">TAKE 2</h1>
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8 text-black w-full max-w-xs">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={handlePlayerNameChange}
              className="px-4 py-3 border-2 border-yellow-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/90 text-base"
            />
            <input
              type="number"
              placeholder="Number of cards (e.g. 7)"
              value={gameCardNum}
              onChange={handleGameCardNumChange}
              min="1"
              max="26"
              className="px-4 py-3 border-2 border-yellow-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/90 text-base"
            />
          </div>
          <button
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 md:py-4 md:px-12 rounded-full transition-all transform hover:scale-105 shadow-xl border-4 border-yellow-600 text-lg md:text-xl"
            onClick={startGame}
          >
            DEAL CARDS
          </button>
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col p-2 sm:p-4 relative overflow-hidden">
            {/* Winner Overlay */}
            {winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="text-center">
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                            {winner === "player" ? "YOU WIN!" : "COMPUTER WINS!"}
                        </h2>
                        <p className="text-white text-sm sm:text-xl mb-3 sm:mb-4">Returning to menu in 5 seconds...</p>
                        <button 
                            onClick={() => {
                                setGameStart(false);
                                setWinner(null);
                            }}
                            className="bg-white text-black px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold hover:bg-gray-200 text-sm sm:text-base"
                        >
                            Return Now
                        </button>
                    </div>
                </div>
            )}

            {/* Color Picker Overlay */}
            {showColorPicker && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
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

            {/* Game Rules Panel - Added Here */}
            <GameRules isDarkTheme={isDarkTheme} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 mb-2 sm:mb-4">
            {/* Active Color Display - Enhanced */}
            <div className="flex items-center bg-black/40 backdrop-blur-md px-3 sm:px-6 py-2 sm:py-3 rounded-full border border-white/20 shadow-lg">
                <span className="text-white font-bold mr-2 sm:mr-3 text-sm sm:text-lg hidden sm:inline">ACTIVE SUIT</span>
                <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-3xl bg-white shadow-inner ${
                    isRedColor(activeColor) ? "text-red-600" : "text-black"
                }`}>
                    {activeColor}
                </div>
            </div>

            <div className="text-xs sm:text-lg font-bold text-white bg-black/40 backdrop-blur-md px-4 sm:px-8 py-2 sm:py-3 rounded-full border border-white/20 shadow-lg text-center max-w-[200px] sm:max-w-none sm:min-w-[300px] truncate">
                {message || (turn === "player" ? "Your Turn" : "Computer's Turn")}
            </div>
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 text-sm sm:text-base ${
                isDarkTheme ? "bg-gray-800 text-white" : "bg-yellow-400 text-black"
              }`}
            >
              {isDarkTheme ? "🌙" : "☀️"}
            </button>
          </div>

          {/* Computer Area */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center py-1 sm:py-2">
            <div className="flex -space-x-8 sm:-space-x-10 md:-space-x-12">
              <AnimatePresence>
                {computerDeck.map((card, index) => (
                  <Card
                    key={card.id}
                    card={{...card, color: '?', num: '?'}} // Hide computer cards
                    index={index}
                    className="border-2 border-white shadow-lg"
                  />
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-1 sm:mt-2 text-xs sm:text-base font-bold text-white bg-black/30 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full backdrop-blur-sm">
                Computer ({computerDeck.length})
            </div>
          </div>

          {/* Play Area */}
          <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 md:gap-24 relative">
            {/* Draw/Pass Pile */}
            <div 
                onClick={handleDrawClick}
                className={`relative w-20 h-28 sm:w-28 sm:h-40 md:w-36 md:h-52 bg-blue-900 rounded-lg sm:rounded-xl border-2 sm:border-4 border-white shadow-2xl cursor-pointer hover:scale-105 transition-all transform flex items-center justify-center group ${turn !== "player" ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-blue-500/50"} ${deckRecycled ? "ring-2 sm:ring-4 ring-yellow-400 ring-opacity-75" : ""}`}
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
                {/* Q Pair Card - shown when Q was paired - hidden on small screens */}
                {qPairCard && (
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
                )}
                
                <div
                    className={`w-28 h-36 sm:w-40 sm:h-52 md:w-56 md:h-72 border-2 sm:border-4 border-dashed rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm ${qPairCard ? "border-purple-400/50" : "border-white/30"} relative overflow-visible`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
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

            {/* Play Selected Button */}
            {selectedCards.length > 0 && turn === "player" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-12 sm:translate-y-20 z-20">
                    <button
                        onClick={handlePlaySelected}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-8 rounded-full shadow-xl animate-bounce border-2 border-green-300 text-sm sm:text-lg"
                    >
                        PLAY {selectedCards.length} CARD{selectedCards.length > 1 ? 'S' : ''}
                    </button>
                </div>
            )}
          </div>

          {/* Player Area */}
          <div className="flex-shrink-0 flex flex-col items-center justify-end pb-2 sm:pb-4">
            <div className="mb-1 sm:mb-2 text-xs sm:text-base font-bold text-white bg-black/30 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full backdrop-blur-sm">
                {playerName || "Player"} ({playerDeck.length})
            </div>
            <div className="flex -space-x-6 sm:-space-x-8 overflow-x-auto p-2 sm:p-4 max-w-full min-h-[100px] sm:min-h-[140px] md:min-h-[160px] items-end pb-4 sm:pb-8 px-4 sm:px-12">
              <AnimatePresence>
                {playerDeck.map((card, index) => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  // Highlight playable Jacks if skip is active
                  const isJack = card.num === 'J';
                  const highlightSkip = skipActive && isJack;
                  
                  // Suggest Pair - ONLY for Q + same color NORMAL card
                  let highlightPair = false;
                  if (selectedCards.length === 1 && !isSelected) {
                      const first = selectedCards[0];
                      // Only Q can pair, and only with normal cards (not A, 2, J, K, Q) of same color
                      if (first.num === "Q" && first.color === card.color && isNormalCard(card)) {
                          highlightPair = true;
                      }
                  }
                  
                  return (
                    <div
                      key={card.id}
                      draggable={turn === "player"}
                      onDragStart={(e) => handleDragStart(e, card)}
                      onClick={() => handleCardClick(card)}
                      className={`transition-all duration-200 cursor-pointer ${
                          isSelected ? "-translate-y-4 sm:-translate-y-8 z-10 scale-105 sm:scale-110" : "hover:-translate-y-2 sm:hover:-translate-y-4 hover:scale-105"
                      }`}
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
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
