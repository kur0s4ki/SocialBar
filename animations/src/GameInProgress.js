import React, { useEffect } from 'react';

function GameInProgress() {
  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Row - Score Section */}
        <div className="flex gap-6">
          {/* Left Panel - Round and Score */}
          <div className="flex-1 bg-slate-800 border-2 border-cyan-400 rounded-lg p-6">
            <h1 className="text-yellow-400 text-3xl font-bold text-center">MANCHE 2-NIVEAU</h1>
            <h2 className="text-yellow-400 text-2xl font-bold text-center mt-2">SCORE</h2>
          </div>

          {/* Right Panel - Score Number */}
          <div className="bg-slate-800 border-2 border-cyan-400 rounded-lg p-6 flex items-center justify-center min-w-[200px]">
            <span className="text-yellow-400 text-6xl font-bold">4270</span>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-slate-800 border-2 border-cyan-400 rounded-lg p-6 relative">
          {/* Mission Badge */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-slate-900 border-2 border-yellow-400 rounded-lg px-6 py-2">
              <span className="text-yellow-400 text-xl font-bold">MISSION</span>
            </div>
          </div>

          {/* Mission Number Circle */}
          <div className="absolute -top-6 right-8">
            <div className="w-20 h-20 bg-slate-900 border-4 border-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-3xl font-bold">28</span>
            </div>
          </div>

          {/* Mission Text */}
          <div className="pt-8 text-center">
            <p className="text-white text-2xl font-medium">
              Touchez uniquement les trous <span className="text-cyan-400 font-bold">BLEUS</span>
              {"! "}
              Évitez les <span className="text-red-500 font-bold">rouges</span>
              {"!"}
            </p>
          </div>
        </div>

        {/* Bottom Row - Game Controls */}
        <div className="grid grid-cols-3 gap-6">
          {/* Multiplier */}
          <div className="bg-slate-800 border-2 border-cyan-400 rounded-lg p-8 flex items-center justify-center">
            <span className="text-yellow-400 text-5xl font-bold">x2</span>
          </div>

          {/* Bonus Central */}
          <div className="bg-slate-800 border-2 border-cyan-400 rounded-lg p-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 border-4 border-white rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <span className="text-cyan-400 text-lg font-bold">BONUS CENTRAL</span>
          </div>

          {/* Buttons */}
          <div className="bg-slate-800 border-2 border-cyan-400 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-6 h-6 bg-yellow-400 rounded-full"></div>
              ))}
            </div>
            <span className="text-cyan-400 text-lg font-bold">BOUTONS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameInProgress;


