import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeString, setTimeString] = useState('15:00');
  const ws = useRef(null);

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        console.log('Connected to WebSocket server');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
        
        if (data.type === 'countdownUpdate') {
          setTimeLeft(data.timeLeft);
          setTimeString(data.timeString);
        } else if (data.type === 'reset') {
          setIsStarted(false);
          setTimeLeft(0);
          setTimeString('15:00');
        }
      };

      ws.current.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setIsConnected(false);
        // Retry connection after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.current.onerror = () => {
        console.log('WebSocket connection error');
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleStart = () => {
    if (teamName.trim()) {
      console.log('Starting with team:', teamName);
      setIsStarted(true);
      
      // Send start message to server
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'start',
          teamName: teamName
        }));
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
