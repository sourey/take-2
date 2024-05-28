"use client";

import { useEffect, useState } from "react";
import { shuffleDeck } from "@/utils/utils";

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

  useEffect(() => {
    const initialDeck = [];

    for (const color of colors) {
      for (const num of cardNums) {
        initialDeck.push({ color, num });
      }
    }
    shuffleDeck(initialDeck);
    setDeck(initialDeck);
  }, []);

  const isRedColor = (color) => color === "♥" || color === "♦";

  const startGame = () => {
    setGameStart(!gameStart);
  };

  return (
    <>
      {!gameStart ? (
        <div class="flex justify-center items-center h-screen">
          <button
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
            onClick={startGame}
          >
            Start
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 mt-5">
          {deck.map((card, index) => (
            <div
              key={index}
              className="relative w-20 h-24 bg-gray-200 rounded-lg shadow-md"
            >
              <div className="absolute top-1 left-1 text-black text-xs font-bold">
                {card.num}
              </div>
              <div
                className={`flex items-center justify-center h-full text-4xl ${
                  isRedColor(card.color) ? "text-red-500" : "text-black"
                }`}
              >
                {card.color}
              </div>
              <div className="absolute bottom-1 right-1 text-black text-xs font-bold">
                {card.num}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
