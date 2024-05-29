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
          <div className="flex flex-col justify-between h-screen p-5">
            {/* Computer's cards */}
            <div className="flex justify-center">
              <h1 className="mt-20 mr-5">COMPUTER</h1>
              {computerDeck.map((card, index) => (
                <Card card={card} index={index} />
              ))}
            </div>

            <div className="flex justify-center my-8">
              <div
                className="bg-gray-400 rounded-lg flex items-center justify-center"
                style={{ height: "650px", width: "600px" }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {currentPlayCard && <Card card={currentPlayCard} index={0} />}
              </div>
            </div>

            {/* Player's cards */}
            <div className="flex justify-center">
              <h1 className="mt-20 mr-5">{playerName?.toUpperCase()}</h1>
              {playerDeck.map((card, index) => (
                <div
                  className="p-1 mx-2 transition hover:bg-gray-500 draggable"
                  draggable
                  onDragStart={(e) => handleDragStart(e, card)}
                >
                  <Card card={card} index={index} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
