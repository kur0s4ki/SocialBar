import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [timeString, setTimeString] = useState('15:00');
  const ws = useRef(null);
  const countdownInterval = useRef(null);
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
      
      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        console.log('[FRONTEND] Connected to WebSocket server');
        setIsConnected(true);
        isConnecting.current = false;
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[FRONTEND] Received from server:', data);
        
        if (data.type === 'gameStarted') {
          console.log('[FRONTEND] Game started - starting countdown');
          startCountdown();
        } else if (data.type === 'reset') {
          console.log('[FRONTEND] Game reset received');
          resetGame();
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
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  const startCountdown = () => {
    setIsStarted(true);
    setTimeLeft(15 * 60);
    setTimeString('15:00');
    
    countdownInterval.current = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        const minutes = Math.floor(newTime / 60);
        const seconds = newTime % 60;
        setTimeString(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        if (newTime <= 0) {
          clearInterval(countdownInterval.current);
          return 0;
        }
        return newTime;
      });
    }, 1000);
  };

  const resetGame = () => {
    setIsStarted(false);
    setTimeLeft(15 * 60);
    setTimeString('15:00');
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
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
            <h1>Team: {teamName}</h1>
            
            <div className="status">
              Status: {isConnected ? '✔️ Connected' : '🔴 Disconnected'}
            </div>

            <div className="countdown-container">
              <div className="countdown-timer">
                {timeString}
              </div>
              <div className="countdown-label">
                Time Remaining
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
