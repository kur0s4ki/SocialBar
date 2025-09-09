import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        console.log('Connected to WebSocket server');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        console.log('Received:', event.data);
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
    }
  };

  return (
    <div className="App">
      <div className="container">
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
      </div>
    </div>
  );
}

export default App;
