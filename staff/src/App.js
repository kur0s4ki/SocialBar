import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentView, setCurrentView] = useState('registration'); // 'registration', 'dashboard', 'simulation'
  const [ledStates, setLedStates] = useState({});

  // Score and time tracking
  const [currentScore, setCurrentScore] = useState(0);
  const [goalScore, setGoalScore] = useState(0);
  const [levelTimeRemaining, setLevelTimeRemaining] = useState('--:--');
  const [totalTimeRemaining, setTotalTimeRemaining] = useState('--:--');
  const [levelTimeSeconds, setLevelTimeSeconds] = useState(0);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);

  const ws = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    if (currentView === 'registration') {
      document.title = 'Social Bar - Staff Console';
    } else if (currentView === 'dashboard') {
      document.title = `Social Bar - ${teamName} Dashboard`;
    } else {
      document.title = `Social Bar - ${teamName} Simulation`;
    }
  }, [currentView, teamName]);

  useEffect(() => {
    const connect = () => {
      if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.OPEN)) {
        return;
      }

      isConnecting.current = true;

      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        setIsConnected(true);
        isConnecting.current = false;
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'gameStarted') {
          setIsStarted(true);
        } else if (data.type === 'reset') {
          resetGame();
        } else if (data.type === 'ledControl') {
          handleLEDControl(data);
        } else if (data.type === 'timeUpdate') {
          setLevelTimeRemaining(data.timeString || '--:--');
          setTotalTimeRemaining(data.totalTimeString || '--:--');
          setLevelTimeSeconds(data.timeLeft || 0);
          setTotalTimeSeconds(data.totalTimeLeft || 0);
        } else if (data.type === 'scoreUpdate') {
          setCurrentScore(data.score || 0);
          setGoalScore(data.goalScore || 0);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        isConnecting.current = false;
        setTimeout(connect, 3000);
      };

      ws.current.onerror = () => {
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

  const resetGame = () => {
    setIsStarted(false);
    setCurrentView('registration');
    setLedStates({});
    setCurrentScore(0);
    setGoalScore(0);
    setLevelTimeRemaining('--:--');
    setTotalTimeRemaining('--:--');
    setLevelTimeSeconds(0);
    setTotalTimeSeconds(0);
    setTeamName('');
  };

  const handleStart = () => {
    if (teamName.trim() && !isStarted) {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'start',
          teamName: teamName
        }));
      }
      setCurrentView('dashboard');
    }
  };

  const handleHardReset = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hardReset'
      }));
    }
  };

  const handleCircleClick = (circleId) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'circleClick',
        circleId: circleId
      }));
    }
  };

  const handleLEDControl = (data) => {
    const { elementId, colorCode, colorValue } = data;
    setLedStates(prev => ({
      ...prev,
      [elementId]: {
        colorCode: colorCode,
        colorValue: colorValue,
        active: colorCode !== 'o'
      }
    }));
  };

  const getCircleColor = (elementId) => {
    const ledState = ledStates[elementId];
    if (ledState && ledState.active) {
      return ledState.colorValue;
    }

    if (elementId >= 14 && elementId <= 28) {
      const buttonColors = {
        14: '#f1c40f', 15: '#27ae60', 16: '#3498db', 17: '#3498db',
        18: '#ffffff', 19: '#ffffff', 20: '#f1c40f', 21: '#27ae60',
        22: '#27ae60', 23: '#f1c40f', 24: '#3498db', 25: '#ffffff',
        26: '#27ae60', 27: '#3498db', 28: '#f1c40f'
      };
      return buttonColors[elementId] || '#4a4a4a';
    }
    return '#4a4a4a';
  };

  const getSmallCircleColor = () => '#666666';

  const getCentralCircleBorderColor = () => {
    const ledState = ledStates[9];
    return (ledState && ledState.active) ? ledState.colorValue : '#ffffff';
  };

  const getButtonPulseClass = (elementId) => {
    const ledState = ledStates[elementId];
    return ledState && ledState.active ? 'pulsing' : '';
  };

  const getButtonOpacity = (elementId) => {
    const ledState = ledStates[elementId];
    if (elementId >= 14 && elementId <= 28) {
      return ledState && ledState.active ? 1.0 : 0.3;
    }
    return 1.0;
  };

  const getElementTooltip = (elementId) => {
    if (elementId >= 1 && elementId <= 8) {
      return `Input ID: ${elementId} | Output ID: ${elementId}`;
    } else if (elementId >= 9 && elementId <= 13) {
      return `Input ID: ${elementId} | No LED (input only)`;
    }
    return `Input ID: ${elementId} | Output ID: ${elementId}`;
  };

  // Calculate score progress percentage
  const scoreProgress = goalScore > 0 ? Math.min((currentScore / goalScore) * 100, 100) : 0;

  // ========================================
  // REGISTRATION VIEW
  // ========================================
  if (currentView === 'registration') {
    return (
      <div className="app">
        <div className="registration-page">
          <div className="reg-card">
            <div className="reg-logo">
              <div className="reg-logo-icon">⚡</div>
              <h1>Social Bar</h1>
              <p className="reg-tagline">Staff Console</p>
            </div>

            <div className="reg-status">
              <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
              <span className="status-text">{isConnected ? 'System Online' : 'Connecting...'}</span>
            </div>

            <div className="reg-form">
              <label htmlFor="teamName">Team Name</label>
              <input
                type="text"
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name..."
                onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              />

              <button
                className="btn btn-primary btn-lg"
                onClick={handleStart}
                disabled={!teamName.trim() || !isConnected}
              >
                Start Session
              </button>

              <button
                className="btn btn-ghost"
                onClick={handleHardReset}
              >
                System Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // DASHBOARD VIEW
  // ========================================
  if (currentView === 'dashboard') {
    return (
      <div className="app">
        <div className="dashboard-page">
          {/* Top Navigation Bar */}
          <header className="dash-header">
            <div className="dash-header-left">
              <span className="dash-logo">⚡</span>
              <span className="dash-title">Social Bar</span>
            </div>
            <div className="dash-header-center">
              <span className={`conn-badge ${isConnected ? 'online' : 'offline'}`}>
                <span className="conn-dot"></span>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="dash-header-right">
              <button className="btn btn-danger-outline btn-sm" onClick={handleHardReset}>
                Reset Game
              </button>
            </div>
          </header>

          {/* Main Dashboard Content */}
          <main className="dash-main">
            {/* Team Banner */}
            <section className="team-banner">
              <div className="team-banner-content">
                <span className="team-label">Active Team</span>
                <h2 className="team-name">{teamName}</h2>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="stats-grid">
              {/* Score Card */}
              <div className="stat-card stat-card-score">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <span className="stat-label">Current Score</span>
                  <span className="stat-value">{currentScore}</span>
                  {goalScore > 0 && (
                    <div className="stat-progress-container">
                      <div className="stat-progress-bar">
                        <div
                          className="stat-progress-fill"
                          style={{ width: `${scoreProgress}%` }}
                        ></div>
                      </div>
                      <span className="stat-goal">Goal: {goalScore}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Level Time Card */}
              <div className="stat-card stat-card-time">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <span className="stat-label">Level Time</span>
                  <span className="stat-value stat-value-time">{levelTimeRemaining}</span>
                  <span className="stat-sublabel">remaining</span>
                </div>
              </div>

              {/* Total Time Card */}
              <div className="stat-card stat-card-total">
                <div className="stat-icon">🕐</div>
                <div className="stat-content">
                  <span className="stat-label">Total Time</span>
                  <span className="stat-value stat-value-total">{totalTimeRemaining}</span>
                  <span className="stat-sublabel">remaining</span>
                </div>
              </div>
            </section>

            {/* Action Buttons */}
            <section className="action-section">
              <button
                className="btn btn-primary btn-xl"
                onClick={() => setCurrentView('simulation')}
              >
                <span className="btn-icon">🎮</span>
                Open Simulation Panel
              </button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // ========================================
  // SIMULATION VIEW
  // ========================================
  return (
    <div className="app">
      <div className="simulation-page">
        {/* Simulation Header */}
        <header className="sim-header">
          <div className="sim-header-left">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentView('dashboard')}
            >
              ← Back to Dashboard
            </button>
          </div>
          <div className="sim-header-center">
            <span className="sim-title">Simulation Panel</span>
            <span className="sim-team">Team: {teamName}</span>
          </div>
          <div className="sim-header-right">
            <div className="sim-live-stats">
              <span className="sim-stat">
                <span className="sim-stat-label">Score:</span>
                <span className="sim-stat-value">{currentScore}</span>
              </span>
              <span className="sim-stat">
                <span className="sim-stat-label">Time:</span>
                <span className="sim-stat-value">{levelTimeRemaining}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Simulation Content */}
        <main className="sim-main">
          <div className="sim-panels">
            {/* Control Buttons Panel */}
            <div className="sim-left-panel">
              <h3 className="panel-title">Control Buttons</h3>
              <div className="control-buttons">
                {[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map((buttonId) => (
                  <div
                    key={buttonId}
                    className={`control-button ${getButtonPulseClass(buttonId)}`}
                    style={{ opacity: getButtonOpacity(buttonId), backgroundColor: getCircleColor(buttonId) }}
                    onClick={() => handleCircleClick(buttonId)}
                    title={getElementTooltip(buttonId)}
                  >
                    <span className="button-number">{buttonId}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Board Panel */}
            <div className="sim-right-panel">
              <h3 className="panel-title">Game Board</h3>
              <div className="game-board">
                {/* Large circles */}
                <div
                  className="circle large"
                  style={{ top: '10%', left: '15%', borderColor: getCircleColor(1) }}
                  onClick={() => handleCircleClick(1)}
                  title={getElementTooltip(1)}
                ></div>
                <div
                  className="circle large"
                  style={{ top: '20%', right: '20%', borderColor: getCircleColor(2) }}
                  onClick={() => handleCircleClick(2)}
                  title={getElementTooltip(2)}
                ></div>
                <div
                  className="circle large"
                  style={{ bottom: '25%', left: '10%', borderColor: getCircleColor(3) }}
                  onClick={() => handleCircleClick(3)}
                  title={getElementTooltip(3)}
                ></div>
                <div
                  className="circle large"
                  style={{ bottom: '15%', right: '15%', borderColor: getCircleColor(4) }}
                  onClick={() => handleCircleClick(4)}
                  title={getElementTooltip(4)}
                ></div>

                {/* Medium circles */}
                <div
                  className="circle medium"
                  style={{ top: '35%', left: '5%', borderColor: getCircleColor(5) }}
                  onClick={() => handleCircleClick(5)}
                  title={getElementTooltip(5)}
                ></div>
                <div
                  className="circle medium"
                  style={{ top: '45%', right: '10%', borderColor: getCircleColor(6) }}
                  onClick={() => handleCircleClick(6)}
                  title={getElementTooltip(6)}
                ></div>
                <div
                  className="circle medium"
                  style={{ bottom: '40%', left: '25%', borderColor: getCircleColor(7) }}
                  onClick={() => handleCircleClick(7)}
                  title={getElementTooltip(7)}
                ></div>
                <div
                  className="circle medium"
                  style={{ bottom: '35%', right: '5%', borderColor: getCircleColor(8) }}
                  onClick={() => handleCircleClick(8)}
                  title={getElementTooltip(8)}
                ></div>

                {/* Central circle with small circles */}
                <div
                  className="circle central-circle"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderColor: getCentralCircleBorderColor()
                  }}
                  title="Output ID: 9 (Central Circle Border)"
                >
                  {[9, 10, 11, 12, 13].map((id, index) => (
                    <div
                      key={id}
                      className={`small-circle small-pos-${index + 1}`}
                      style={{ backgroundColor: getSmallCircleColor() }}
                      onClick={() => handleCircleClick(id)}
                      title={getElementTooltip(id)}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
