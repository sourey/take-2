"use client";

import { useEffect, useState } from "react";
import { shuffleDeck } from "@/utils/utils";
import { Card } from "./components/Card";

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
let deck = [];

export default function Home() {
  const [deck, setDeck] = useState([]);
  const [gameStart, setGameStart] = useState(false);
  const [playerDeck, setPlayerDeck] = useState([]);
  const [computerDeck, setComputerDeck] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [gameCardNum, setGameCardNum] = useState(7);
  const [currentPlayCard, setCurrentPlayCard] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    const initialDeck = [];

    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < cardNums.length; j++) {
        const uniqueId = `${i}${j}`;
        initialDeck.push({ id: uniqueId, color: colors[i], num: cardNums[j] });
      }
    }
    shuffleDeck(initialDeck);
    setDeck(initialDeck);
  }, []);

  const startGame = () => {
    if (!!playerName && !!gameCardNum) {
      setGameStart(!gameStart);

      let pDeck = [];
      let cDeck = [];

      const playingDeck = [...deck].slice(0, gameCardNum * 2);
      const playCard = [...deck].slice(gameCardNum * 2, gameCardNum * 2 + 1);
      playingDeck.forEach((card, index) => {
        if (index % 2 === 0) {
          pDeck.push(card);
        } else {
          cDeck.push(card);
        }
      });
      setPlayerDeck(pDeck);
      setComputerDeck(cDeck);
      setCurrentPlayCard(playCard[0]);
    }
  };

  const handlePlayerNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  const handleGameCardNumChange = (e) => {
    setGameCardNum(parseInt(e.target.value));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, card) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    const droppedCard = JSON.parse(data);

    //remove dropped card from player's deck
    const newplayerDeck = [...playerDeck].filter(
      (c) => c.id !== droppedCard.id
    );
    setCurrentPlayCard(droppedCard);
    setPlayerDeck(newplayerDeck);

    console.log("Dropped card:", droppedCard);
  };

  const handleDragStart = (e, card) => {
    const data = JSON.stringify(card);
    e.dataTransfer.setData("text/plain", data);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  return (
    <>
      {!gameStart ? (
        <>
          <div className="flex justify-center items-center h-screen">
            <h1>TAKE 2</h1>
            <div className="flex justify-center mb-4 text-black mt-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={handlePlayerNameChange}
                className="mx-2 px-2 py-1 border border-gray-300 rounded-md"
              />
              <input
                type="number"
                placeholder="Enter number of cards"
                value={gameCardNum}
                onChange={handleGameCardNumChange}
                min="1"
                max="52"
                className="mx-2 px-2 py-1 border border-gray-300 rounded-md"
              />
            </div>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
              onClick={startGame}
            >
              Start
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className={`w-full h-screen flex items-center justify-center ${
              isDarkTheme ? "bg-gray-900" : "bg-gray-100"
            }`}
          >
            <div
              className={`w-[90vw] h-[90vh] max-w-[1200px] max-h-[800px] ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } rounded-lg shadow-lg overflow-hidden`}
            >
              <div className="w-full h-full grid grid-rows-[auto_1fr_2fr_1fr] p-4">
                {/* Theme toggle button */}
                <div className="flex justify-end mb-2">
                  <button
                    onClick={toggleTheme}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isDarkTheme ? "bg-gray-700" : "bg-yellow-400"
                    }`}
                  >
                    {isDarkTheme ? (
                      <svg
                        className="w-6 h-6 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6 text-gray-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Computer's cards */}
                <div className="flex justify-center items-center">
                  <h1
                    className={`mr-4 text-lg font-bold ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    COMPUTER
                  </h1>
                  <div className="flex space-x-2 overflow-x-auto">
                    {computerDeck.map((card, index) => (
                      <Card
                        key={index}
                        card={card}
                        index={index}
                        className="w-[10%] max-w-[60px] bg-white"
                      />
                    ))}
                  </div>
                </div>

                {/* Play area */}
                <div className="flex justify-center items-center">
                  <div
                    className={`${
                      isDarkTheme ? "bg-gray-700" : "bg-gray-200"
                    } rounded-lg flex items-center justify-center w-[30%] h-[80%] min-w-[120px] min-h-[180px]`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {currentPlayCard && (
                      <Card
                        card={currentPlayCard}
                        index={0}
                        className="w-[80%] h-[80%] bg-white"
                      />
                    )}
                  </div>
                </div>

                {/* Player's cards */}
                <div className="flex justify-center items-center">
                  <h1
                    className={`mr-4 text-lg font-bold ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {playerName?.toUpperCase()}
                  </h1>
                  <div className="flex space-x-2 overflow-x-auto">
                    {playerDeck.map((card, index) => (
                      <div
                        key={index}
                        className={`p-1 transition ${
                          isDarkTheme
                            ? "hover:bg-gray-600"
                            : "hover:bg-gray-300"
                        } rounded cursor-move`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, card)}
                      >
                        <Card
                          card={card}
                          index={index}
                          className="w-[10%] max-w-[60px] bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
