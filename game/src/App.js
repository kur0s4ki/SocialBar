import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import soundManager from './SoundManager';

function App() {
  // WebSocket connection state
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState(null);
  const ws = useRef(null);
  const isConnecting = useRef(false);

  // Dynamic game data state
  const [gameData, setGameData] = useState({
    round: 1,
    level: 1,
    score: 0,
    missionNumber: 1,
    multiplier: 'x1',
    missionDescription: 'EN ATTENTE DE JOUEURS...'
  });

  // Round state managed by server
  const [currentRound, setCurrentRound] = useState({
    round: 1,
    level: 1,
    mission: 'EN ATTENTE DE JOUEURS...',
    duration: 0,
    timeLeft: 0,
    timeString: '00:00',
    totalTimeLeft: 0,
    totalTimeString: '00:00',
    goalScore: 1000
  });

  // Cumulative score tracking
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const previousLevel = useRef(1);
  const lastScore = useRef(0); // Store last score before it gets reset
  const previousRound = useRef(0); // Track previous round for narration (0 = no round yet)

  // Bonus section state
  const [bonusActive, setBonusActive] = useState(false);

  // Team name state
  const [teamName, setTeamName] = useState('TEST');

  // Narration state
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);

  // Dynamic font sizing for mission text
  const [missionFontSize, setMissionFontSize] = useState('text-7xl');

  // Convert number to Roman numerals
  const toRoman = (num) => {
    const romanNumerals = [
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ];

    let result = '';
    for (let i = 0; i < romanNumerals.length; i++) {
      while (num >= romanNumerals[i].value) {
        result += romanNumerals[i].numeral;
        num -= romanNumerals[i].value;
      }
    }
    return result;
  };

  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';

    // Initialize sound system
    soundManager.init().then(() => {
      console.log('[APP] Sound system initialized');
    }).catch(err => {
      console.error('[APP] Failed to initialize sound system:', err);
    });

    // Cleanup on unmount
    return () => {
      soundManager.cleanup();
    };
  }, []);

  // Adjust mission text font size based on length
  useEffect(() => {
    const textLength = currentRound.mission.length;
    if (textLength > 100) {
      setMissionFontSize('text-4xl');
    } else if (textLength > 70) {
      setMissionFontSize('text-5xl');
    } else if (textLength > 50) {
      setMissionFontSize('text-6xl');
    } else {
      setMissionFontSize('text-7xl');
    }
  }, [currentRound.mission]);

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

      console.log('[GAMEINPROGRESS] Attempting to connect to Display WebSocket server...');
      ws.current = new WebSocket('ws://localhost:8081'); // Display WebSocket server

      ws.current.onopen = () => {
        console.log('[GAMEINPROGRESS] Connected to WebSocket server as new client');
        setIsConnected(true);
        isConnecting.current = false;

        // Display clients don't need to send identification messages
        // The server automatically recognizes them as display clients
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
            case 'gameStarted':
              console.log('[GAMEINPROGRESS] Game started - starting background music');
              soundManager.startBackgroundMusic();
              break;
            case 'roundUpdate':
              console.log('[GAMEINPROGRESS] Round update received:', data);

              // Check if level changed - accumulate score BEFORE updating state
              if (data.level !== previousLevel.current) {
                const scoreToAdd = lastScore.current;
                console.log(`[GAMEINPROGRESS] Level changed from ${previousLevel.current} to ${data.level}, adding ${scoreToAdd} to cumulative`);
                setCumulativeScore(prev => {
                  const newCumulative = prev + scoreToAdd;
                  console.log(`[GAMEINPROGRESS] Cumulative score: ${prev} + ${scoreToAdd} = ${newCumulative}`);
                  return newCumulative;
                });
                previousLevel.current = data.level;

                // Reset sound manager's score tracking for new level
                soundManager.resetScoreTracking();
              }

              // Handle round change for narration (force play on first round update)
              const isFirstRound = previousRound.current === 0;
              soundManager.handleRoundChange(
                data.round,
                isFirstRound,
                () => setIsNarrationPlaying(true),  // onStart
                () => setIsNarrationPlaying(false)  // onEnd
              );
              previousRound.current = data.round;

              setCurrentRound(prev => ({
                ...prev,
                round: data.round,
                level: data.level,
                duration: data.duration || prev.duration,
                goalScore: data.goalScore || prev.goalScore
              }));
              setGameData(prevData => ({
                ...prevData,
                round: data.round,
                level: data.level
              }));
              break;
            case 'missionUpdate':
              console.log('[GAMEINPROGRESS] Mission update received:', data);
              setCurrentRound(prev => ({
                ...prev,
                mission: data.description
              }));
              setGameData(prevData => ({
                ...prevData,
                missionNumber: data.number,
                missionDescription: data.description
              }));
              break;
            case 'multiplierUpdate':
              console.log('[GAMEINPROGRESS] Multiplier update received:', data);
              setGameData(prevData => ({
                ...prevData,
                multiplier: data.multiplier
              }));
              break;
            case 'scoreUpdate':
              console.log('[GAMEINPROGRESS] Score update:', data.score);
              lastScore.current = data.score; // Store score in ref

              // Handle score-based sounds (point and levelup)
              soundManager.handleScoreUpdate(data.score, currentRound.goalScore);

              setGameData(prevData => ({ ...prevData, score: data.score }));
              break;
            case 'soundEffect':
              console.log('[GAMEINPROGRESS] Sound effect:', data.effect);
              // Play the specific sound effect
              switch(data.effect) {
                case 'trap':
                  soundManager.playTrap();
                  break;
                case 'bonus':
                  soundManager.playBonus();
                  break;
                case 'correct':
                  soundManager.playCorrect();
                  break;
                default:
                  console.warn('[GAMEINPROGRESS] Unknown sound effect:', data.effect);
              }
              break;
            case 'timeUpdate':
              console.log('[DEBUG] timeUpdate:', JSON.stringify(data));
              setCurrentRound(prev => ({
                ...prev,
                timeLeft: data.timeLeft,
                timeString: data.timeString,
                totalTimeLeft: data.totalTimeLeft,
                totalTimeString: data.totalTimeString
              }));
              break;
            case 'bonusActive':
              console.log('[GAMEINPROGRESS] Bonus active update:', data.active);
              setBonusActive(data.active);
              break;
            case 'teamName':
              console.log('[GAMEINPROGRESS] Team name update:', data.name);
              setTeamName(data.name || 'TEST');
              break;
            case 'reset':
              console.log('[GAMEINPROGRESS] Game reset received');
              // Stop all sounds including narration
              soundManager.stopAllSounds();
              // Reset to default values
              setGameData({
                round: 1,
                level: 1,
                score: 0,
                missionNumber: 1,
                multiplier: 'x1',
                missionDescription: 'EN ATTENTE DE JOUEURS...'
              });
              setCurrentRound({
                round: 1,
                level: 1,
                mission: 'EN ATTENTE DE JOUEURS...',
                duration: 0,
                timeLeft: 0,
                timeString: '00:00',
                totalTimeLeft: 0,
                totalTimeString: '00:00',
                goalScore: 1000
              });
              setCumulativeScore(0);
              previousLevel.current = 1;
              previousRound.current = 0;
              lastScore.current = 0;
              setBonusActive(false);
              setTeamName('TEST');
              setIsNarrationPlaying(false);
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
      <div className="max-w-[90vw] w-full space-y-12">
        {/* Top Row - Three Separate Rectangles */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Rectangle - Team Name */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4">
            <span className="text-white text-6xl font-bold">ÉQUIPE</span>
            <span className="text-yellow-400 text-6xl font-bold uppercase">{teamName}</span>
          </div>

          {/* Middle Rectangle - Round and Level */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-white text-6xl font-bold">MANCHE</span>
              <span className="text-yellow-400 text-6xl font-bold">{toRoman(currentRound.round)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white text-6xl font-bold">NIVEAU</span>
              <span className="text-yellow-400 text-6xl font-bold">{currentRound.level}</span>
            </div>
          </div>

          {/* Right Rectangle - Score */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4">
            <span className="text-white text-6xl font-bold">SCORE</span>
            <span className={`${gameData.score >= currentRound.goalScore ? 'text-green score-shine' : 'text-yellow-400'} text-6xl font-bold`}>{gameData.score}</span>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-16 relative mission-container flex items-center justify-center">
          {/* Mission Badge */}
          <div className="absolute -top-8 left-half transform translate-x-neg-half z-50">
            <div className="bg-slate-900 border-8 border-yellow-400 rounded-2xl px-16 py-6">
              <span className="text-yellow-400 text-6xl font-bold">MISSION</span>
            </div>
          </div>

          {/* Game Timer Circle */}
          <div className="absolute top-half right-12 transform translate-y-neg-half">
            <div className="w-64 h-64 bg-slate-900 border-8 border-red-500 rounded-full flex items-center justify-center relative">
              {/* Round timer display - seconds only */}
              <span className="text-white text-8xl font-bold font-mono">{currentRound.timeLeft}</span>
              {/* Inner Circle */}
              <div className="absolute w-60 h-60 bg-transparent border-8 border-transparent border-t-cyan-400 border-r-cyan-400 rounded-full z-10"></div>
            </div>
          </div>

          {/* Mission Text */}
          <div className="text-center pr-80">
            <p className={`text-white ${missionFontSize} font-medium mt-8 uppercase`}>
              {currentRound.mission}
            </p>
          </div>

          {/* Progress Bar - moved under mission */}
          <div className="absolute bottom-6 left-16 right-16 pr-80">
            <div className="w-full bg-slate-700 h-8">
              <div
                className="h-full transition-all duration-300 ease-out progress-glow"
                style={{
                  width: `${Math.min((gameData.score / currentRound.goalScore) * 100, 100)}%`,
                  backgroundColor: '#22c55e'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Game Controls */}
        <div className="grid grid-cols-3 gap-8">
          {/* Session Timer */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
            <span className="text-cyan-400 text-4xl font-bold">TEMPS SESSION</span>
            <span className="text-yellow-400 text-7xl font-bold font-mono">{currentRound.totalTimeString || '00:00'}</span>
          </div>

          {/* Bonus Central */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
            <div className={`w-20 h-20 border-8 ${bonusActive ? 'border-yellow-400' : 'border-white'} rounded-full flex items-center justify-center`}>
              <div className={`w-5 h-5 ${bonusActive ? 'bg-yellow-400' : 'bg-white'} rounded-full`}></div>
            </div>
            <span className="text-cyan-400 text-3xl font-bold">BONUS CENTRAL</span>
          </div>

          {/* Overall Score */}
          <div className="bg-slate-900 border-8 border-cyan-400 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
            <span className="text-cyan-400 text-4xl font-bold">SCORE GLOBAL</span>
            <span className="text-yellow-400 text-7xl font-bold">{cumulativeScore}</span>
          </div>
        </div>

        {/* Narration Overlay - Shows during round description audio */}
        {isNarrationPlaying && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-95 flex flex-col items-center justify-center z-50 space-y-12">
            {/* Session Timer */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-cyan-400 text-6xl font-bold">TEMPS SESSION</span>
              <span className="text-yellow-400 text-9xl font-bold font-mono">{currentRound.totalTimeString || '00:00'}</span>
            </div>

            {/* Narration Message */}
            <div className="text-center space-y-8">
              <div className="animate-pulse">
                <span className="text-white text-8xl font-bold">🎧</span>
              </div>
              <h2 className="text-yellow-400 text-7xl font-bold uppercase">
                Écoutez la description de la manche
              </h2>
              <p className="text-cyan-400 text-5xl font-medium">
                Lisez les instructions de niveau dès la fin de l'audio
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App;