import React from "react";

export const GameRules = ({ isDarkTheme }) => {
  return (
    <div
      className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-64 p-4 rounded-lg shadow-lg ${
        isDarkTheme ? "bg-gray-800 text-white" : "bg-white text-gray-900"
      } text-sm overflow-y-auto max-h-[80vh]`}
    >
      <h3 className="font-bold text-lg mb-2 border-b pb-1">Game Rules</h3>
      
      <div className="space-y-3">
        <div>
          <h4 className="font-bold text-yellow-500">Objective</h4>
          <p>Shed all your cards to win!</p>
        </div>

        <div>
          <h4 className="font-bold text-blue-500">Basic Play</h4>
          <ul className="list-disc pl-4">
            <li>Match <strong>Active Color</strong></li>
            <li>Match <strong>Card Number</strong></li>
            <li>Matching Number changes Active Color</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-red-500">Power Cards (A, 2, Q, J)</h4>
          <ul className="space-y-2 mt-1">
            <li>
              <span className="font-bold">A (Ace):</span> Can be played anytime if color matches. Allows you to <strong>Change Color</strong>. Can be played on another Ace.
            </li>
            <li>
              <span className="font-bold">Q (Queen):</span> 
              <ul className="list-circle pl-4 mt-1">
                <li>Single Play: Changes color, but you <strong>Draw 1 Penalty Card</strong>.</li>
                <li>Pair Play: Play Q with a <strong>NORMAL card</strong> (3-10, K) of <strong>SAME COLOR</strong>. No penalty!</li>
                <li><em>Cannot pair with power cards (A, 2, J)</em></li>
                <li><strong>After Q Pair:</strong> Next player can match against EITHER the Q or the paired card!</li>
              </ul>
            </li>
            <li>
              <span className="font-bold">J (Jack):</span> Skips next player&apos;s turn. Can be countered by playing another Jack to pass the skip.
            </li>
            <li>
              <span className="font-bold">2:</span> Next player must <strong>Draw 2</strong>. Can be chained with another 2 to stack penalty.
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-purple-500">Finishing Rule</h4>
          <p><strong>Power cards (A, 2, Q, J) cannot finish the game!</strong> If played as your last card, you must draw 1 card from the stack.</p>
        </div>

        <div>
          <h4 className="font-bold text-green-500">Starting Card Rule</h4>
          <p>If the first card is:</p>
          <ul className="list-disc pl-4">
            <li><strong>A:</strong> First player chooses active color</li>
            <li><strong>2:</strong> First player draws 2 cards</li>
            <li><strong>Q:</strong> First player draws 1 card</li>
            <li><strong>J:</strong> First player&apos;s turn is skipped</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

