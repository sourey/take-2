"use client";

import { useEffect, useState, useRef } from "react";
import { shuffleDeck, isRedColor } from "@/utils/utils";
import { isValidMove, getCardEffect, checkWinCondition } from "@/utils/rule";
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
  const [winner, setWinner] = useState(null);
  const [skipActive, setSkipActive] = useState(false); // Track if a skip is pending
  
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

      const pDeck = newDeck.slice(0, gameCardNum);
      const cDeck = newDeck.slice(gameCardNum, gameCardNum * 2);
      const startCard = newDeck[gameCardNum * 2];
      const remainingDeck = newDeck.slice(gameCardNum * 2 + 1);

      setPlayerDeck(pDeck);
      setComputerDeck(cDeck);
      setCurrentPlayCard(startCard);
      setActiveColor(startCard.color);
      setDrawPile(remainingDeck);
      setGameStart(true);
      setTurn("player");
      setMessage(`Game Started! ${playerName}'s Turn`);
      setPenaltyStack(0);
      setSkipActive(false);
      setWinner(null);
      setSelectedCards([]);
    }
  };

  const drawCard = (who, count = 1) => {
    if (drawPile.length === 0) {
      setMessage("Draw pile empty!");
      return;
    }

    const cardsToDraw = drawPile.slice(0, count);
    const newDrawPile = drawPile.slice(count);

    setDrawPile(newDrawPile);

    if (who === "player") {
      setPlayerDeck((prev) => [...prev, ...cardsToDraw]);
    } else {
      setComputerDeck((prev) => [...prev, ...cardsToDraw]);
    }
    return cardsToDraw;
  };

  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleGameCardNumChange = (e) => setGameCardNum(parseInt(e.target.value));
  const toggleTheme = () => setIsDarkTheme(!isDarkTheme);

  const handleCardClick = (card) => {
    if (turn !== "player") return;

    // Toggle selection
    if (selectedCards.find(c => c.id === card.id)) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      // Logic for adding to selection:
      // 1. If no cards selected, select this one.
      // 2. If one card selected, check rules:
      //    - Same Rank? (Standard Pair)
      //    - Same Color AND Rank is Q? (Queen Special Rule)
      
      if (selectedCards.length > 0) {
        const firstCard = selectedCards[0];
        
        // Check Same Rank
        const isSameRank = firstCard.num === card.num;
        
        // Check Queen Special Rule: Q + Same Color Card
        const isQueenSpecial = firstCard.num === "Q" && firstCard.color === card.color;
        
        if (isSameRank || isQueenSpecial) {
             setSelectedCards([...selectedCards, card]);
        } else {
            // If neither matches, switch selection to new card
            setSelectedCards([card]);
        }
      } else {
        setSelectedCards([card]);
      }
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

    if (!isValidMove(firstCard, currentPlayCard, activeColor) && !skipActive) { 
         setMessage("Invalid Move!");
         return;
    }
    
    if (skipActive && firstCard.num === "J") {
        // Valid counter play
    } else if (skipActive) {
        setMessage("Must play a Jack!");
        return;
    }


    // Pair validation
    if (selectedCards.length > 1) {
        // Rule 1: Same Rank (Standard Pair)
        const allSameRank = selectedCards.every(c => c.num === firstCard.num);
        
        // Rule 2: Queen Special (Q + Same Color Card)
        // Only valid if primary card is Q, and pair consists of Q and another card of SAME COLOR.
        // Note: Logic above allows selecting them, here we validate.
        let isQueenSpecial = false;
        if (firstCard.num === "Q" && selectedCards.length === 2) {
             const secondCard = selectedCards[1];
             if (firstCard.color === secondCard.color) {
                 isQueenSpecial = true;
             }
        }

        if (!allSameRank && !isQueenSpecial) {
             setMessage("Cards must match Rank OR be a Queen + Same Color!");
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

    if (!isValidMove(firstCard, currentPlayCard, activeColor) && !skipActive) {
      setMessage("Invalid Move!");
      return;
    }
    
    if (cardsToPlay.length > 1) {
        const allSameRank = cardsToPlay.every(c => c.num === firstCard.num);
        let isQueenSpecial = false;
        if (firstCard.num === "Q" && cardsToPlay.length === 2) {
             const secondCard = cardsToPlay[1];
             if (firstCard.color === secondCard.color) {
                 isQueenSpecial = true;
             }
        }

        if (!allSameRank && !isQueenSpecial) {
             setMessage("Cards must match Rank OR be a Queen + Same Color!");
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

    const lastCard = cards[cards.length - 1];
    setCurrentPlayCard(lastCard);

    let shouldChangeColor = true;
    // Queen Pair Rule: Paired Q does not change active color.
    // Does this apply to Q + Same Color? 
    // "Paired Play: Can be played with another card of the same color to shed both... Paired Q does not change active color."
    // Yes.
    if (primaryCard.num === "Q" && cards.length > 1) {
        shouldChangeColor = false;
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
        setWinner(who);
        return;
    }

    setTurn(nextTurn);
  };

  const handleColorPick = (color) => {
    setActiveColor(color);
    setShowColorPicker(false);
    setTurn("computer");
    setMessage(`${playerName} changed color to ${color}`);
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

        const validCards = computerDeck.filter(c => isValidMove(c, currentPlayCard, activeColor));
        
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
  }, [turn, gameStart, winner, computerDeck, currentPlayCard, activeColor, penaltyStack, skipActive]);

  // Check win condition effect
  useEffect(() => {
      if (gameStart) {
          if (playerDeck.length === 0) setWinner("player");
          if (computerDeck.length === 0) setWinner("computer");
      }
  }, [playerDeck, computerDeck, gameStart]);


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
        <div className="flex flex-col justify-center items-center h-screen">
          <h1 className="text-6xl font-bold mb-8 text-white drop-shadow-lg">TAKE 2</h1>
          <div className="flex flex-col gap-4 mb-8 text-black w-64">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={handlePlayerNameChange}
              className="px-4 py-3 border-2 border-yellow-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/90"
            />
            <input
              type="number"
              placeholder="Number of cards (e.g. 7)"
              value={gameCardNum}
              onChange={handleGameCardNumChange}
              min="1"
              max="26"
              className="px-4 py-3 border-2 border-yellow-500 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/90"
            />
          </div>
          <button
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-12 rounded-full transition-all transform hover:scale-105 shadow-xl border-4 border-yellow-600 text-xl"
            onClick={startGame}
          >
            DEAL CARDS
          </button>
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col p-4 relative">
            {/* Winner Overlay */}
            {winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-6xl font-bold text-white mb-4 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">
                            {winner === "player" ? "YOU WIN!" : "COMPUTER WINS!"}
                        </h2>
                        <p className="text-white text-xl mb-4">Returning to menu in 5 seconds...</p>
                        <button 
                            onClick={() => {
                                setGameStart(false);
                                setWinner(null);
                            }}
                            className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200"
                        >
                            Return Now
                        </button>
                    </div>
                </div>
            )}

            {/* Color Picker Overlay */}
            {showColorPicker && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl border-4 border-yellow-500">
                        <h3 className="text-xl font-bold text-black mb-4">Pick a Color</h3>
                        <div className="flex gap-4">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleColorPick(c)}
                                    className={`w-16 h-16 text-4xl flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
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
          <div className="flex justify-between items-center mb-4">
            {/* Active Color Display - Enhanced */}
            <div className="flex items-center bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-lg">
                <span className="text-white font-bold mr-3 text-lg">ACTIVE SUIT</span>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-3xl bg-white shadow-inner ${
                    isRedColor(activeColor) ? "text-red-600" : "text-black"
                }`}>
                    {activeColor}
                </div>
            </div>

            <div className="text-lg font-bold text-white bg-black/40 backdrop-blur-md px-8 py-3 rounded-full border border-white/20 shadow-lg min-w-[300px] text-center">
                {message || (turn === "player" ? "Your Turn" : "Computer's Turn")}
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border-2 border-white/20 ${
                isDarkTheme ? "bg-gray-800 text-white" : "bg-yellow-400 text-black"
              }`}
            >
              {isDarkTheme ? "🌙" : "☀️"}
            </button>
          </div>

          {/* Computer Area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex -space-x-12">
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
            <div className="mt-2 font-bold text-white bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">
                Computer ({computerDeck.length})
            </div>
          </div>

          {/* Play Area */}
          <div className="flex-[2] flex items-center justify-center gap-16 relative">
            {/* Draw/Pass Pile */}
            <div 
                onClick={handleDrawClick}
                className={`relative w-32 h-44 bg-blue-900 rounded-xl border-4 border-white shadow-2xl cursor-pointer hover:scale-105 transition-all transform flex items-center justify-center group ${turn !== "player" ? "opacity-50 cursor-not-allowed grayscale" : "hover:shadow-blue-500/50"}`}
                style={{
                    backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                }}
            >
                <div className="text-center">
                    <span className="text-white font-black text-xl block drop-shadow-md">
                        {skipActive ? "SKIP" : (penaltyStack > 0 ? "PENALTY" : "DRAW")}
                    </span>
                    {skipActive && <span className="text-xs text-white/80">Tap to Pass</span>}
                </div>
                
                {penaltyStack > 0 && (
                    <div className="absolute -top-4 -right-4 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg text-lg animate-bounce">
                        +{penaltyStack}
                    </div>
                )}
            </div>

            {/* Current Card Area */}
            <div 
                className="w-40 h-52 border-4 border-dashed border-white/30 rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <AnimatePresence mode="wait">
                    {currentPlayCard && (
                        <div className="transform scale-125">
                            <Card
                                key={currentPlayCard.id}
                                card={currentPlayCard}
                                className="shadow-2xl"
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Play Selected Button */}
            {selectedCards.length > 0 && turn === "player" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-20 z-20">
                    <button
                        onClick={handlePlaySelected}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold py-3 px-8 rounded-full shadow-xl animate-bounce border-2 border-green-300 text-lg"
                    >
                        PLAY {selectedCards.length} CARD{selectedCards.length > 1 ? 'S' : ''}
                    </button>
                </div>
            )}
          </div>

          {/* Player Area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="mb-2 font-bold text-white bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm">
                {playerName || "Player"} ({playerDeck.length})
            </div>
            <div className="flex -space-x-8 overflow-x-auto p-4 max-w-full min-h-[160px] items-end pb-8 px-12">
              <AnimatePresence>
                {playerDeck.map((card, index) => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  // Highlight playable Jacks if skip is active
                  const isJack = card.num === 'J';
                  const highlightSkip = skipActive && isJack;
                  
                  // Suggest Pair for Q or others
                  let highlightPair = false;
                  if (selectedCards.length === 1 && !isSelected) {
                      const first = selectedCards[0];
                      if (first.num === card.num) {
                          highlightPair = true;
                      }
                      // Queen Rule: Q + Same Color
                      if (first.num === "Q" && first.color === card.color) {
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
                          isSelected ? "-translate-y-8 z-10 scale-110" : "hover:-translate-y-4 hover:scale-105"
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
