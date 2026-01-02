import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './logo.svg';

function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

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

  // Round and level tracking
  const [currentRound, setCurrentRound] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);

  const ws = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    if (currentView === 'registration') {
      document.title = 'Social Bar - Console Staff';
    } else if (currentView === 'dashboard') {
      document.title = `Social Bar - ${teamName} Tableau de Bord`;
    } else {
      document.title = `Social Bar - ${teamName} Simulation`;
    }
  }, [currentView, teamName]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

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
        } else if (data.type === 'roundUpdate') {
          setCurrentRound(data.round || 0);
          setCurrentLevel(data.level || 0);
          if (data.goalScore) setGoalScore(data.goalScore);
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

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    // Simple client-side authentication - admin only
    if (loginUsername === 'admin' && loginPassword === 'admin') {
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
      setCurrentView('simulation');
    } else {
      setLoginError('Invalid credentials. Admin access only.');
    }
  };

  const handleSimulationAccess = () => {
    setShowLoginModal(true);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleRebootConfirm = () => {
    setShowRebootModal(false);
    // Dummy action - just show it was triggered
    console.log('System reboot confirmed');
  };

  const handleShutdownConfirm = () => {
    setShowShutdownModal(false);
    // Dummy action - just show it was triggered
    console.log('System shutdown confirmed');
  };

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
    setCurrentRound(0);
    setCurrentLevel(0);
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
              <div className="logo-row">
                <img src={logo} alt="Social Bar" className="logo-icon" />
                <h1>Social Bar</h1>
              </div>
              <p className="reg-tagline">Console Staff</p>
            </div>

            <div className="reg-status">
              <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
              <span className="status-text">{isConnected ? 'Système En Ligne' : 'Connexion...'}</span>
            </div>

            <div className="reg-form">
              <label htmlFor="teamName">Nom de l'Équipe</label>
              <input
                type="text"
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Entrez le nom de l'équipe..."
                onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              />

              <button
                className="btn btn-primary btn-md"
                onClick={handleStart}
                disabled={!teamName.trim() || !isConnected}
              >
                Démarrer la Session
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
              <img src={logo} alt="Social Bar" className="logo-icon-sm" />
              <span className="dash-title">Social Bar</span>
            </div>
            <div className="dash-header-center">
              <span className={`conn-badge ${isConnected ? 'online' : 'offline'}`}>
                <span className="conn-dot"></span>
                {isConnected ? 'En Direct' : 'Hors Ligne'}
              </span>
            </div>
            <div className="dash-header-right">
              <button className="btn btn-theme btn-sm" onClick={toggleTheme}>
                {isDarkTheme ? '☀️' : '🌙'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSimulationAccess}>
                Simulation
              </button>
              <button className="btn btn-reset btn-sm" onClick={handleHardReset}>
                Réinitialiser
              </button>
            </div>
          </header>

          {/* Main Dashboard Content */}
          <main className="dash-main">
            {/* Main Stats Card */}
            <div className="main-stats-card">
              <div className="stats-header">
                <h2 className="team-display-name">{teamName}</h2>
              </div>

              <div className="stats-content">
                <div className="stat-row">
                  <span className="stat-label">Score</span>
                  <span className="stat-value">{currentScore}</span>
                </div>

                {goalScore > 0 && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">Objectif</span>
                      <span className="stat-value">{goalScore}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${scoreProgress}%` }}></div>
                      </div>
                    </div>
                  </>
                )}

                <div className="stat-row-group">
                  <div className="stat-row">
                    <span className="stat-label">Manche</span>
                    <span className="stat-value">{currentRound || '-'} / 3</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Niveau</span>
                    <span className="stat-value">{currentLevel || '-'} / 10</span>
                  </div>
                </div>

                <div className="stat-row-group">
                  <div className="stat-row">
                    <span className="stat-label">Temps Niveau</span>
                    <span className="stat-value stat-time">{levelTimeRemaining}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Temps Total</span>
                    <span className="stat-value stat-time">{totalTimeRemaining}</span>
                  </div>
                </div>
              </div>

              <div className="stats-footer">
                <button className="btn btn-reboot btn-md" onClick={() => setShowRebootModal(true)}>
                  Redémarrer
                </button>
                <button className="btn btn-shutdown btn-md" onClick={() => setShowShutdownModal(true)}>
                  Arrêter
                </button>
              </div>
            </div>
          </main>

          {/* Reboot Confirmation Modal */}
          {showRebootModal && (
            <div className="modal-overlay" onClick={() => setShowRebootModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-icon modal-icon-warning">⚠️</div>
                  <h2 className="modal-title">Redémarrer le Système</h2>
                </div>
                <div className="modal-body">
                  <p>Êtes-vous sûr de vouloir redémarrer le système ?</p>
                  <p className="modal-subtitle">Cette action va interrompre la session en cours.</p>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost btn-md" onClick={() => setShowRebootModal(false)}>
                    Annuler
                  </button>
                  <button className="btn btn-warning btn-md" onClick={handleRebootConfirm}>
                    Redémarrer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shutdown Confirmation Modal */}
          {showShutdownModal && (
            <div className="modal-overlay" onClick={() => setShowShutdownModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-icon modal-icon-danger">🔴</div>
                  <h2 className="modal-title">Arrêter le Système</h2>
                </div>
                <div className="modal-body">
                  <p>Êtes-vous sûr de vouloir arrêter le système ?</p>
                  <p className="modal-subtitle">Cette action va éteindre complètement le système.</p>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost btn-md" onClick={() => setShowShutdownModal(false)}>
                    Annuler
                  </button>
                  <button className="btn btn-danger btn-md" onClick={handleShutdownConfirm}>
                    Arrêter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Login Modal for Simulation Access */}
          {showLoginModal && (
            <div className="modal-overlay" onClick={() => {
              setShowLoginModal(false);
              setLoginUsername('');
              setLoginPassword('');
              setLoginError('');
            }}>
              <div className="modal-content modal-login" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-icon">🔐</div>
                  <h2 className="modal-title">Accès Simulation</h2>
                  <p className="modal-subtitle" style={{ marginTop: '8px' }}>Authentification administrateur requise</p>
                </div>
                <form className="modal-body" onSubmit={handleLogin}>
                  <div className="form-group">
                    <label htmlFor="modal-username">Username</label>
                    <input
                      type="text"
                      id="modal-username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter admin username..."
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-password">Password</label>
                    <input
                      type="password"
                      id="modal-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter admin password..."
                    />
                  </div>

                  {loginError && (
                    <div className="login-error">
                      {loginError}
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-md"
                      onClick={() => {
                        setShowLoginModal(false);
                        setLoginUsername('');
                        setLoginPassword('');
                        setLoginError('');
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-md"
                      disabled={!loginUsername.trim() || !loginPassword.trim()}
                    >
                      Se Connecter
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
              onClick={handleBackToDashboard}
            >
              Tableau de Bord
            </button>
          </div>
          <div className="sim-header-center">
            <span className="sim-title">Panneau de Simulation</span>
            <span className="sim-team">Équipe: {teamName}</span>
          </div>
          <div className="sim-header-right">
            <div className="sim-live-stats">
              <span className="sim-stat">
                <span className="sim-stat-label">Score:</span>
                <span className="sim-stat-value">{currentScore}</span>
              </span>
              <span className="sim-stat">
                <span className="sim-stat-label">Temps:</span>
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
              <h3 className="panel-title">Boutons de Contrôle</h3>
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
              <h3 className="panel-title">Plateau de Jeu</h3>
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
