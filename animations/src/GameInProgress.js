import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function GameInProgress() {
  const [isConnected, setIsConnected] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [timeString, setTimeString] = useState('15:00');
  const [ledStates, setLedStates] = useState({});
  const ws = useRef(null);
  const countdownInterval = useRef(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';
  }, []);

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
          startCountdown();
        } else if (data.type === 'reset') {
          resetGame();
        } else if (data.type === 'ledControl') {
          handleLEDControl(data);
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

  const handleLEDControl = (data) => {
    const { elementId, colorCode, colorValue } = data;
    setLedStates(prev => ({
      ...prev,
      [elementId]: {
        colorCode,
        colorValue,
        active: colorCode !== 'o'
      }
    }));
  };

  const getCentralCircleColor = () => {
    const ledState = ledStates[9];
    if (ledState && ledState.active) {
      return ledState.colorValue;
    }
    return '#ffffff';
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Game In Progress</h1>
        <div className="status">Status: {isConnected ? '✔️ Connected' : '🔴 Disconnected'}</div>
        {isStarted ? (
          <>
            <div className="countdown-container">
              <div className="countdown-timer">{timeString}</div>
              <div className="countdown-label">Time Remaining</div>
            </div>
            <div
              className="circle central-circle"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderColor: getCentralCircleColor()
              }}
              title="Output ID: 9 (Central Circle)"
            ></div>
          </>
        ) : (
          <p>Waiting for game to start...</p>
        )}
      </div>
    </div>
  );
}

export default GameInProgress;


