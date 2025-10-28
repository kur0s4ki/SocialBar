import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [ledStates, setLedStates] = useState({});
  const ws = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    // Set page title based on state
    if (!isStarted) {
      document.title = 'Social Bar - Registration';
    } else if (teamName) {
      document.title = `Social Bar - Team: ${teamName}`;
    } else {
      document.title = 'Social Bar - Game';
    }
  }, [isStarted, teamName]);

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
          console.log('[FRONTEND] Game started - waiting for time updates from server');
          setIsStarted(true);
        } else if (data.type === 'reset') {
          console.log('[FRONTEND] Game reset received - resetting UI');
          resetGame();
        } else if (data.type === 'ledControl') {
          console.log('[FRONTEND] LED control received:', data);
          handleLEDControl(data);
        } else if (data.type === 'timeUpdate') {
          console.log('[FRONTEND] Time update received:', data);
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

  // Remove local countdown - now handled by server
  // const startCountdown = () => {
  //   Server now manages time and sends updates via WebSocket
  // };

  const resetGame = () => {
    setIsStarted(false);
    setShowSimulator(false);
    setLedStates({});
  };

  const handleStart = () => {
    if (teamName.trim() && !isStarted) {
      console.log('[FRONTEND] Starting game for team:', teamName);

      // Send start message to server
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'start',
          teamName: teamName
        }));
        console.log('[FRONTEND] Start message sent to server');
      }

      // Automatically show simulator
      setShowSimulator(true);
    }
  };

  const handleHardReset = () => {
    console.log('[FRONTEND] Hard reset requested');

    // Send hard reset message to server
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hardReset'
      }));
      console.log('[FRONTEND] Hard reset message sent to server');
    }
  };

  const handleCircleClick = (circleId) => {
    console.log('[FRONTEND] Circle clicked:', circleId);
    
    // Send circle click message to server
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'circleClick',
        circleId: circleId
      }));
      console.log('[FRONTEND] Circle click message sent to server for circle:', circleId);
    } else {
      console.log('[FRONTEND] WebSocket not connected, cannot send circle click');
    }
  };

  const handleLEDControl = (data) => {
    const { elementId, colorCode, colorValue } = data;
    
    console.log('[FRONTEND] LED control received:', { elementId, colorCode, colorValue });
    
    // Update LED state for the element with color info
    setLedStates(prev => {
      const newState = {
        ...prev,
        [elementId]: {
          colorCode: colorCode,
          colorValue: colorValue,
          active: colorCode !== 'o'
        }
      };
      console.log('[FRONTEND] Updated LED states:', newState);
      return newState;
    });
    
    // No auto-reset - all elements stay on until explicitly turned off
    // Both circles (1-13) and control buttons (14-22) persist their state
  };

  const getCircleColor = (elementId) => {
    const ledState = ledStates[elementId];
    if (ledState && ledState.active) {
      return ledState.colorValue;
    }

    // For control buttons (14-28), show their fixed hardware colors even when off
    if (elementId >= 14 && elementId <= 28) {
      // Button color mapping (hardware-defined)
      const buttonColors = {
        14: '#f1c40f',  // Yellow
        15: '#27ae60',  // Green
        16: '#3498db',  // Blue
        17: '#3498db',  // Blue
        18: '#ffffff',  // White
        19: '#ffffff',  // White
        20: '#f1c40f',  // Yellow
        21: '#27ae60',  // Green
        22: '#27ae60',  // Green
        23: '#f1c40f',  // Yellow
        24: '#3498db',  // Blue
        25: '#ffffff',  // White
        26: '#27ae60',  // Green
        27: '#3498db',  // Blue
        28: '#f1c40f'   // Yellow
      };
      return buttonColors[elementId] || '#4a4a4a';
    }

    return '#4a4a4a'; // Default dark gray for off state (was white, changed to distinguish from white LEDs)
  };

  const getSmallCircleColor = (elementId) => {
    // Small circles (9-13) are input-only, they have no LEDs
    // Always return a neutral gray color to indicate they're just holes
    return '#666666'; // Gray for input-only holes
  };

  const getCentralCircleBorderColor = () => {
    // Central circle border is controlled by output ID 9
    const ledState = ledStates[9];
    if (ledState && ledState.active) {
      return ledState.colorValue;
    }
    return '#ffffff'; // Default white when not active
  };

  const getButtonPulseClass = (elementId) => {
    const ledState = ledStates[elementId];
    return ledState && ledState.active ? 'pulsing' : '';
  };

  const getButtonOpacity = (elementId) => {
    const ledState = ledStates[elementId];
    if (elementId >= 14 && elementId <= 28) {
      // Control buttons: low opacity when off, high opacity when on
      return ledState && ledState.active ? 1.0 : 0.3;
    }
    return 1.0; // Circles always full opacity
  };

  const getElementTooltip = (elementId) => {
    if (elementId >= 1 && elementId <= 8) {
      return `Input ID: ${elementId} | Output ID: ${elementId}`;
    } else if (elementId >= 9 && elementId <= 13) {
      return `Input ID: ${elementId} | No LED (input only)`;
    } else if (elementId >= 14 && elementId <= 28) {
      return `Input ID: ${elementId} | Output ID: ${elementId}`;
    }
    return `Input ID: ${elementId}`;
  };

  return (
    <div className="App">
      <div className={`container ${showSimulator ? 'simulator-mode' : ''}`}>
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

              <div className="button-group">
                <button
                  type="button"
                  onClick={handleStart}
                  className="start-button"
                  disabled={!teamName.trim() || isStarted}
                >
                  Start Game
                </button>

                <button
                  type="button"
                  onClick={handleHardReset}
                  className="reset-button"
                >
                  Reset
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="simulator-container">
            <div className="simulator-header">
              <button
                type="button"
                onClick={handleHardReset}
                className="reset-button"
              >
                Reset Game
              </button>
            </div>
            <div className="simulator-panels">
              <div className="left-panel">
                <div className="control-buttons">
                  {/* Control buttons 14-28 (15 buttons total) */}
                  {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map(buttonId => (
                    <div
                      key={buttonId}
                      className={`control-button ${getButtonPulseClass(buttonId)}`}
                      style={{opacity: getButtonOpacity(buttonId), backgroundColor: getCircleColor(buttonId)}}
                      onClick={() => handleCircleClick(buttonId)}
                      title={getElementTooltip(buttonId)}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="right-panel">
                <div className="control-panel">
                  {/* Large circles */}
                  <div
                    className="circle large circle-1"
                    style={{
                      top: '10%',
                      left: '15%',
                      borderColor: getCircleColor(1)
                    }}
                    onClick={() => handleCircleClick(1)}
                    title={getElementTooltip(1)}
                  ></div>
                  <div
                    className="circle large circle-2"
                    style={{
                      top: '20%',
                      right: '20%',
                      borderColor: getCircleColor(2)
                    }}
                    onClick={() => handleCircleClick(2)}
                    title={getElementTooltip(2)}
                  ></div>
                  <div
                    className="circle large circle-3"
                    style={{
                      bottom: '25%',
                      left: '10%',
                      borderColor: getCircleColor(3)
                    }}
                    onClick={() => handleCircleClick(3)}
                    title={getElementTooltip(3)}
                  ></div>
                  <div
                    className="circle large circle-4"
                    style={{
                      bottom: '15%',
                      right: '15%',
                      borderColor: getCircleColor(4)
                    }}
                    onClick={() => handleCircleClick(4)}
                    title={getElementTooltip(4)}
                  ></div>

                  {/* Medium circles */}
                  <div
                    className="circle medium circle-5"
                    style={{
                      top: '35%',
                      left: '5%',
                      borderColor: getCircleColor(5)
                    }}
                    onClick={() => handleCircleClick(5)}
                    title={getElementTooltip(5)}
                  ></div>
                  <div
                    className="circle medium circle-6"
                    style={{
                      top: '45%',
                      right: '10%',
                      borderColor: getCircleColor(6)
                    }}
                    onClick={() => handleCircleClick(6)}
                    title={getElementTooltip(6)}
                  ></div>
                  <div
                    className="circle medium circle-7"
                    style={{
                      bottom: '40%',
                      left: '25%',
                      borderColor: getCircleColor(7)
                    }}
                    onClick={() => handleCircleClick(7)}
                    title={getElementTooltip(7)}
                  ></div>
                  <div
                    className="circle medium circle-8"
                    style={{
                      bottom: '35%',
                      right: '5%',
                      borderColor: getCircleColor(8)
                    }}
                    onClick={() => handleCircleClick(8)}
                    title={getElementTooltip(8)}
                  ></div>

                  {/* Central large circle with 5 small circles inside */}
                  {/* Border controlled by Output ID 9 - NOT clickable (output only) */}
                  <div
                    className="circle central-circle"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      borderColor: getCentralCircleBorderColor()
                    }}
                    title="Output ID: 9 (Central Circle Border - Output Only)"
                  >
                    <div
                      className="small-circle small-pos-1"
                      style={{ backgroundColor: getSmallCircleColor(9) }}
                      onClick={() => handleCircleClick(9)}
                      title={getElementTooltip(9)}
                    ></div>
                    <div
                      className="small-circle small-pos-2"
                      style={{ backgroundColor: getSmallCircleColor(10) }}
                      onClick={() => handleCircleClick(10)}
                      title={getElementTooltip(10)}
                    ></div>
                    <div
                      className="small-circle small-pos-3"
                      style={{ backgroundColor: getSmallCircleColor(11) }}
                      onClick={() => handleCircleClick(11)}
                      title={getElementTooltip(11)}
                    ></div>
                    <div
                      className="small-circle small-pos-4"
                      style={{ backgroundColor: getSmallCircleColor(12) }}
                      onClick={() => handleCircleClick(12)}
                      title={getElementTooltip(12)}
                    ></div>
                    <div
                      className="small-circle small-pos-5"
                      style={{ backgroundColor: getSmallCircleColor(13) }}
                      onClick={() => handleCircleClick(13)}
                      title={getElementTooltip(13)}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
