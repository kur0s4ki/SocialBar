import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState({
    round: 1,
    level: 1,
    mission: 'Waiting for game to start...',
    timeLeft: 0,
    timeString: '00:00'
  });
  const ws = useRef(null);
  const isConnecting = useRef(false);

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
      
      ws.current = new WebSocket('ws://localhost:8080'); // Staff WebSocket server

      ws.current.onopen = () => {
        console.log('[FRONTEND] Connected to WebSocket server');
        setIsConnected(true);
        isConnecting.current = false;
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[FRONTEND] Received from server:', data);

        switch (data.type) {
          case 'gameStarted':
            console.log('[FRONTEND] Game started');
            setIsStarted(true);
            break;

          case 'roundUpdate':
            console.log('[FRONTEND] Round update received:', data);
            setCurrentRound({
              round: data.round,
              level: data.level,
              mission: data.mission,
              timeLeft: data.timeLeft,
              timeString: data.timeString
            });
            break;

          case 'timeUpdate':
            console.log('[FRONTEND] Time update received:', data.timeString);
            setCurrentRound(prev => ({
              ...prev,
              timeLeft: data.timeLeft,
              timeString: data.timeString
            }));
            break;

          case 'reset':
            console.log('[FRONTEND] Game reset received');
            resetGame();
            break;

          default:
            console.log('[FRONTEND] Unknown message type:', data.type);
        }
      };

      ws.current.onclose = () => {
        console.log('[FRONTEND] Disconnected from WebSocket server');
        setIsConnected(false);
        isConnecting.current = false;
        // Retry connection after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = () => {
        console.log('[FRONTEND] WebSocket connection error');
        setIsConnected(false);
        isConnecting.current = false;
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // This function is no longer needed as timing is handled by the server
  // Kept for backward compatibility but does nothing
  const startCountdown = () => {
    // Server now handles all timing logic
    console.log('[FRONTEND] Game timing is now managed by the server');
  };

  const resetGame = () => {
    setIsStarted(false);
    setCurrentRound({
      round: 1,
      level: 1,
      mission: 'Waiting for game to start...',
      timeLeft: 0,
      timeString: '00:00'
    });
  };

  const handleStart = () => {
    if (teamName.trim()) {
      console.log('[FRONTEND] Starting game for team:', teamName);
      
      // Send start message to server
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'start',
          teamName: teamName
        }));
        console.log('[FRONTEND] Start message sent to server');
      }
    }
  };

  return (
    <div className="App">
      <div className="container">
        {!isStarted ? (
          <>
            <h1>Team Registration</h1>
            
            <div className="status">
              Status: {isConnected ? '✔️ Connected' : '🔴 Disconnected'}
            </div>

            <form className="team-form">
              <div className="form-group">
                <label htmlFor="teamName">Team Name:</label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                />
              </div>
              
              <button 
                type="button" 
                onClick={handleStart}
                className="start-button"
              >
                Start
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Game Control - Team: {teamName}</h1>

            <div className="status">
              Status: {isConnected ? '✔️ Connected' : '🔴 Disconnected'}
            </div>

            <div className="simulator-container">
              <h2>Game Simulator</h2>
              <p>Game is running. Use the display screen to monitor progress.</p>
              <p>LED controls and Arduino inputs are active.</p>

              <div className="simulator-note">
                💡 <strong>Note:</strong> This is the control interface.
                View game progress on the <strong>/game-in-progress</strong> display screen.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
