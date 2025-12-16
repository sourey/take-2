import React, { useState } from "react";

export const GameRules = ({ isDarkTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Theme-aware colors
  const textMain = isDarkTheme ? "text-gray-200" : "text-gray-700";
  const textMuted = isDarkTheme ? "text-gray-400" : "text-gray-500";
  const textStrong = isDarkTheme ? "text-white" : "text-gray-900";
  const borderColor = isDarkTheme ? "border-white/10" : "border-gray-200";
  
  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-lg ${
          isDarkTheme ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        }`}
      >
        {isOpen ? "✕" : "📋"}
      </button>

      {/* Rules panel - hidden on mobile unless toggled, always visible on desktop */}
      <div
        className={`fixed md:absolute right-0 md:right-4 top-0 md:top-1/2 md:transform md:-translate-y-1/2 
          w-full md:w-56 h-full md:h-auto md:max-h-[85vh] p-4 md:p-3 md:rounded-lg shadow-lg 
          ${isDarkTheme ? "bg-gray-800/98 md:bg-gray-800/95 text-white" : "bg-white/98 md:bg-white/95 text-gray-900 border-l md:border border-gray-200"} 
          text-xs overflow-y-auto backdrop-blur-sm z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"} md:translate-x-0`}
      >
        <h3 className={`font-bold text-base mb-2 border-b ${borderColor} pb-1 mt-12 md:mt-0`}>📋 Rules</h3>
      
      <div className="space-y-2">
        {/* How to Play */}
        <div>
          <p className={`${isDarkTheme ? "text-yellow-400" : "text-yellow-600"} font-semibold mb-1`}>🎯 Goal: Empty your hand!</p>
          <p className={textMain}>Match by <strong className={textStrong}>suit</strong> or <strong className={textStrong}>number</strong></p>
        </div>

        {/* Power Cards */}
        <div className={`border-t ${borderColor} pt-2`}>
          <p className={`${isDarkTheme ? "text-red-400" : "text-red-600"} font-semibold mb-1`}>⚡ Power Cards</p>
          <div className={`space-y-1 ${textMain}`}>
            <p><strong className={textStrong}>A</strong> → Change suit (play on same suit or A)</p>
            <p><strong className={textStrong}>2</strong> → Next player +2 cards (stackable)</p>
            <p><strong className={textStrong}>J</strong> → Skip next player (counter with J)</p>
            <p><strong className={textStrong}>Q</strong> → Draw 1 to change suit</p>
          </div>
        </div>

        {/* Queen Pair */}
        <div className={`border-t ${borderColor} pt-2`}>
          <p className={`${isDarkTheme ? "text-purple-400" : "text-purple-600"} font-semibold mb-1`}>👑 Queen Pair</p>
          <p className={textMain}>Q + same suit normal card (3-10, K)</p>
          <p className={`${textMuted} text-[10px]`}>No penalty! Next player matches either card.</p>
        </div>

        {/* Important */}
        <div className={`border-t ${borderColor} pt-2`}>
          <p className={`${isDarkTheme ? "text-green-400" : "text-green-600"} font-semibold mb-1`}>⚠️ Important</p>
          <p className={textMain}>Can&apos;t win with power card (A, 2, Q, J)</p>
          <p className={`${textMuted} text-[10px]`}>You&apos;ll draw 1 card instead.</p>
        </div>

        {/* Starting Card */}
        <div className={`border-t ${borderColor} pt-2`}>
          <p className={`${isDarkTheme ? "text-blue-400" : "text-blue-600"} font-semibold mb-1`}>🃏 First Card Effects</p>
          <div className={`${textMain} grid grid-cols-2 gap-x-2`}>
            <span><strong className={textStrong}>A</strong> → Pick suit</span>
            <span><strong className={textStrong}>2</strong> → +2 cards</span>
            <span><strong className={textStrong}>Q</strong> → +1 card</span>
            <span><strong className={textStrong}>J</strong> → Skip turn</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

