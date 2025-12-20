# 🎴 Take 2 Card Game

**A fast-paced, strategic card game** - also known as Switch! A toned-down version of the classic card game that's fun, addictive, and perfect for quick gaming sessions.

🎮 **Play Online**: [https://take-2-tau.vercel.app/](https://take-2-tau.vercel.app/)

## 🎯 What is Take 2?

Take 2 is an exciting card game similar to Uno but with unique strategic elements. Players compete to be the first to discard all their cards through smart plays, special card effects, and tactical decision-making.

### 🎲 Key Features
- **Fast-paced gameplay** (5-40 minutes depending on card count)
- **Strategic depth** with special card mechanics
- **Offline-capable** Progressive Web App (PWA)
- **Achievement system** with badges and statistics
- **Responsive design** for mobile and desktop

## 🎮 How to Play

### 🃏 Game Setup
1. **Choose your settings**:
   - **Players**: 2-4 total (1 human + 1-3 AI)
   - **Card Count**: 5, 7, 10, or 13 cards per player
   - **Enter your name** (saved for future games)

2. **Click "DEAL CARDS"** to start the game

### 🎴 Basic Rules

#### **Objective**
Be the **first player to discard all your cards**!

#### **Card Matching**
- Play cards that match the **color** or **number** of the top card on the discard pile
- **Example**: If ♠ 7 is on top, you can play any ♠ card or any 7

#### **Turn Structure**
1. **Play a card** if you can (must match color or number)
2. **Draw a card** if you can't play
3. **Special effects** may modify the next player's turn

### 🃏 Special Cards & Effects

#### **Power Cards**
- **🂡 Ace (A)**: **Change color** to any suit (♠♣♥♦)
- **🂢 Two (2)**: **Draw penalty** - next player draws 2 cards
- **🂭 Jack (J)**: **Skip turn** - next player loses their turn
- **🂫 Queen (Q)**: **Draw penalty** - next player draws 1 card

#### **Queen Pair Rule** 🂫🂫
- **Pair Queens** with any card of the same color
- **Example**: ♠ Q + ♠ 5 = play both cards as one move
- **Effect**: Only sheds cards, no special power

#### **Power Card Restrictions**
- **Cannot finish** with power cards (A, 2, J, Q)
- **Must draw** one card if you try to win with a power card
- **King (K)** is a normal card (no special effects)

### 🎯 Game Mechanics

#### **Penalty Stacking**
- **Multiple 2s**: Penalties accumulate (2+2=4 cards to draw)
- **Must play**: 2 to counter, or accept the penalty
- **Queen penalties**: Always 1 card (cannot stack)

#### **Skip Effects**
- **Jack**: Next player skips their turn
- **Cannot counter**: Unlike 2s, skips cannot be countered

#### **Color Changes**
- **Ace power**: Choose any color for next player
- **Visual indicator**: Active color shown in header

#### **Deck Management**
- **Recycle discard pile** when draw pile empties
- **Automatic shuffling** and recycling
- **Visual feedback** when deck recycles

### 🏆 Winning & Rankings

#### **Victory Conditions**
- **First to empty hand** wins the round
- **Point system**: Based on move count (fewer moves = better)
- **Multiple rounds**: Continue playing for rankings

#### **Badge System**
Earn prestigious badges based on victories (requires equal games played):
- **🎓 Rookie**: 0 wins (Getting started)
- **🛠️ Apprentice**: 1 win (First victory)
- **⚔️ Challenger**: 2 wins (Rising contender)
- **🧠 Strategist**: 3 wins (Tactical player)
- **🎯 Tactician**: 5 wins (Strategic master)
- **🧠 Mastermind**: 8 wins (Mental giant)
- **🎭 Virtuoso**: 12 wins (Artistic player)
- **👑 Legend**: 18 wins (Hall of fame)
- **⭐ Mythical**: 25 wins (Legendary status)
- **🔥 Grandmaster**: 35 wins (Supreme champion)
- **💎 Immortal**: 50 wins (Unbeatable)
- **✨ Juwade GOD**: 75 wins (Card game deity)

### 🎮 Controls & Interface

#### **Game Controls**
- **Click cards** to select them
- **Drag & drop** cards onto the play area
- **Draw button** when you can't play
- **Color picker** appears when playing Aces

#### **Multi-Select**
- **Queen pairing**: Select Q first, then same-color card
- **Visual feedback**: Selected cards highlight yellow
- **Play button**: Appears when valid selection made

### 📊 Statistics & Features

#### **Personal Stats**
- **Games played** and win/loss record
- **Win rate** percentage
- **Best completion time**
- **Current badge** and progress

#### **Global Leaderboards**
- **Most wins** across all players
- **Most losses** (for bragging rights!)
- **Longest game** duration
- **Total games** played globally

#### **Progressive Web App**
- **Offline play** with cached card images
- **Installable** on mobile devices
- **Push notifications** ready
- **Fast loading** with service worker

### 🛠️ Technical Details

#### **Built With**
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **Storage**: localStorage for persistence
- **PWA**: Service Worker for offline support

## 🎨 Favicon & PWA Assets

The app includes comprehensive favicon and PWA icon support. The following image assets are referenced but need to be created:

### **Required Images** (create these for production):
```
public/
├── favicon-16x16.png      # 16x16 standard favicon
├── favicon-32x32.png      # 32x32 standard favicon
├── apple-touch-icon.png   # 180x180 Apple touch icon
├── icon-192.png          # 192x192 PWA icon
├── icon-512.png          # 512x512 PWA icon
├── og-image.png          # 1200x630 Open Graph image
├── screenshot-mobile.png  # 390x844 PWA screenshot
├── screenshot-desktop.png # 1280x720 PWA screenshot
└── mstile-*.png          # Microsoft tile images (70x70, 144x144, 150x150, 310x310)
```

### **Design Suggestions:**
- **Primary**: Card with "2" and spade symbols
- **Colors**: Yellow (#fbbf24) background, black text/symbols
- **Style**: Poker table aesthetic with card elements
- **Text**: "TAKE 2" or "T2" prominently displayed

### **Current Setup:**
- ✅ **SVG favicon** for Safari pinned tabs
- ✅ **Manifest.json** with PWA icon specifications
- ✅ **Meta tags** for all platforms
- ✅ **Browser config** for Microsoft tiles

## 🚀 Getting Started

#### **Prerequisites**
- Node.js 18+
- npm, yarn, pnpm, or bun

#### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd take-2

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Start development server
npm run dev
```

#### **Development**
```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### 🎯 Game Strategy Tips

#### **Beginner Tips**
- **Save power cards** for when you need them most
- **Watch opponent card counts** to time your plays
- **Use Aces strategically** to change to your strongest color
- **Counter penalties** when possible rather than taking hits

#### **Advanced Tactics**
- **Queen pairing** to shed two cards at once
- **Color control** with Aces to force opponents into weak suits
- **Skip timing** to disrupt opponent momentum
- **Penalty stacking** awareness for big plays

### 📈 Roadmap

- [ ] **Online Multiplayer** mode
- [ ] **Custom card decks** and themes
- [ ] **Tournament mode** with multiple rounds
- [ ] **Daily challenges** and achievements
- [ ] **Social features** and leaderboards

### 🤝 Contributing

Contributions welcome! Please feel free to submit issues, feature requests, or pull requests.

### 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Enjoy Take 2 and may the best strategist win!** 🎴🏆
