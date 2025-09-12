import React, { useEffect } from 'react';

function GameInProgress() {
  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 px-8 py-2 font-sans flex items-start justify-center pt-16">
      <div className="max-w-[90vw] w-full space-y-12">
        {/* Top Row - Score Section */}
        <div className="flex gap-8">
          {/* Left Panel - Round and Score */}
          <div className="flex-1 bg-slate-900 border-4 border-cyan-400 rounded-lg p-6">
            <h1 className="text-yellow-400 text-6xl font-bold text-center">MANCHE 2-NIVEAU</h1>
            <h2 className="text-yellow-400 text-5xl font-bold text-center mt-2">SCORE</h2>
          </div>

          {/* Right Panel - Score Number */}
          <div className="bg-slate-900 border-4 border-cyan-400 rounded-lg p-6 flex items-center justify-center min-w-[250px]">
            <span className="text-yellow-400 text-9xl font-bold">4270</span>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-slate-900 border-4 border-cyan-400 rounded-lg p-16 relative min-h-[45vh] flex items-center justify-center">
          {/* Mission Badge */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-slate-900 border-4 border-yellow-400 rounded-lg px-16 py-6">
              <span className="text-yellow-400 text-6xl font-bold">MISSION</span>
            </div>
          </div>

          {/* Mission Number Circle */}
          <div className="absolute -top-10 right-16">
            <div className="w-40 h-40 bg-slate-900 border-4 border-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-8xl font-bold">28</span>
            </div>
          </div>

          {/* Mission Text */}
          <div className="text-center">
            <p className="text-white text-7xl font-medium">
              Touchez uniquement les trous <span className="text-cyan-400 font-bold">BLEUS</span>
              {"! "}
              Évitez les <span className="text-red-500 font-bold">rouges</span>
              {"!"}
            </p>
          </div>
        </div>

        {/* Bottom Row - Game Controls */}
        <div className="grid grid-cols-3 gap-8">
          {/* Multiplier */}
          <div className="bg-slate-900 border-4 border-cyan-400 rounded-lg p-8 flex items-center justify-center">
            <span className="text-yellow-400 text-8xl font-bold">x2</span>
          </div>

          {/* Bonus Central */}
          <div className="bg-slate-900 border-4 border-cyan-400 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full"></div>
            </div>
            <span className="text-cyan-400 text-3xl font-bold">BONUS CENTRAL</span>
          </div>

          {/* Buttons */}
          <div className="bg-slate-900 border-4 border-cyan-400 rounded-lg p-8 flex flex-col items-center justify-center space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-10 h-10 bg-yellow-400 rounded-full"></div>
              ))}
            </div>
            <span className="text-cyan-400 text-3xl font-bold">BOUTONS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameInProgress;


