import React, { useState, useEffect, useRef } from 'react';

function GameInProgress() {
  // WebSocket connection state
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState(null);
  const ws = useRef(null);
  const isConnecting = useRef(false);

  // Dynamic game data state
  const [gameData, setGameData] = useState({
    manche: 2,
    niveau: 1,
    score: 4270,
    missionNumber: 28,
    multiplier: 'x2',
    missionDescription: 'Touchez uniquement les trous BLEUS! Évitez les rouges!'
  });

  // Time state managed by server
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [timeString, setTimeString] = useState('15:00');

  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';
  }, []);

  useEffect(() => {
    const connect = () => {
      // Prevent duplicate connections
      if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
        return;
      }
      
      isConnecting.current = true;
      
      // Close existing connection if any
      if (ws.current) {
        ws.current.close();
      }
      
      console.log('[GAMEINPROGRESS] Attempting to connect to WebSocket server...');
      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        console.log('[GAMEINPROGRESS] Connected to WebSocket server as new client');
        setIsConnected(true);
        isConnecting.current = false;
        
        // Send identification message
        ws.current.send(JSON.stringify({
          type: 'clientConnect',
          clientType: 'gameInProgress',
          timestamp: Date.now()
        }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[GAMEINPROGRESS] Received from server:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'clientId':
              setClientId(data.clientId);
              console.log('[GAMEINPROGRESS] Assigned client ID:', data.clientId);
              break;
            case 'gameData':
              console.log('[GAMEINPROGRESS] Updating game data:', data.gameData);
              setGameData(prevData => ({ ...prevData, ...data.gameData }));
              break;
            case 'scoreUpdate':
              console.log('[GAMEINPROGRESS] Score update:', data.score);
              setGameData(prevData => ({ ...prevData, score: data.score }));
              break;
            case 'missionUpdate':
              console.log('[GAMEINPROGRESS] Mission update:', data.mission);
              setGameData(prevData => ({ 
                ...prevData, 
                missionNumber: data.mission.number,
                missionDescription: data.mission.description
              }));
              break;
            case 'timeUpdate':
              console.log('[GAMEINPROGRESS] Time update received:', data);
              setTimeLeft(data.timeLeft);
              setTimeString(data.timeString);
              break;
            case 'reset':
              console.log('[GAMEINPROGRESS] Game reset received');
              // Reset to default values
              setGameData({
                manche: 1,
                niveau: 1,
                score: 0,
                missionNumber: 1,
                multiplier: 'x1',
                missionDescription: 'Waiting for mission...'
              });
              setTimeLeft(15 * 60);
              setTimeString('15:00');
              break;
            default:
              console.log('[GAMEINPROGRESS] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[GAMEINPROGRESS] Error parsing message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('[GAMEINPROGRESS] Disconnected from WebSocket server');
        setIsConnected(false);
        setClientId(null);
        isConnecting.current = false;
        // Retry connection after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('[GAMEINPROGRESS] WebSocket connection error:', error);
        setIsConnected(false);
        setClientId(null);
        isConnecting.current = false;
      };
    };

    connect();

    return () => {
      if (ws.current) {
        console.log('[GAMEINPROGRESS] Component unmounting, closing WebSocket connection');
        ws.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 px-8 py-2 font-sans flex items-center justify-center">
      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-4 py-2 rounded-lg text-white font-bold ${
          isConnected ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {isConnected ? `✔️ Connected ${clientId ? `(ID: ${clientId})` : ''}` : '🔴 Disconnected'}
        </div>
      </div>
      

      <div className="max-w-[90vw] w-full space-y-12">
        {/* Top Row - Score Section */}
        <div className="flex gap-8">
          {/* Left Panel - Round and Score */}
          <div className="flex-1 bg-slate-900 border-8 border-cyan-400 rounded-2xl p-10">
            <h2 className="text-yellow-400 text-6xl font-bold text-center">
              MANCHE {gameData.manche}-NIVEAU {gameData.niveau}
            </h2>
            <h2 className="text-yellow-400 text-6xl font-bold text-center mt-2">SCORE</h2>
          </div>

          {/* Right Panel - Score Number */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-10 flex items-center justify-center min-w-[250px]">
            <span className="text-yellow-400 text-9xl font-bold">{gameData.score}</span>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-16 relative min-h-[35vh] flex items-center justify-center">
          {/* Mission Badge */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-slate-900 border-8 border-yellow-400 rounded-2xl px-16 py-6">
              <span className="text-yellow-400 text-6xl font-bold">MISSION</span>
            </div>
          </div>

          {/* Game Timer Circle */}
          <div className="absolute top-1/2 right-12 transform -translate-y-1/2">
            <div className="w-64 h-64 bg-slate-900 border-8 border-red-500 rounded-full flex items-center justify-center relative">
              {/* Game timer display */}
              <span className="text-white text-6xl font-bold font-mono">{timeString}</span>
              {/* Inner Circle */}
              <div className="absolute w-60 h-60 bg-transparent border-8 border-transparent border-t-cyan-400 border-r-cyan-400 rounded-full z-10"></div>
            </div>
          </div>

          {/* Mission Text */}
          <div className="text-center pr-80">
            <p className="text-white text-7xl font-medium">
              {gameData.missionDescription}
            </p>
          </div>
        </div>

        {/* Bottom Row - Game Controls */}
        <div className="grid grid-cols-3 gap-8">
          {/* Multiplier */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex items-center justify-center">
            <span className="text-yellow-400 text-9xl font-bold">{gameData.multiplier}</span>
          </div>

          {/* Bonus Central */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 border-8 border-white rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-full"></div>
            </div>
            <span className="text-cyan-400 text-3xl font-bold">BONUS CENTRAL</span>
          </div>

          {/* Buttons */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex flex-col items-center justify-center space-y-5">
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


