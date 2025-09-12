import React, { useEffect } from 'react';
import './App.css';

// Dynamic UI components
function GipTitle({ roundLabel = 'MANCHE 2 - NIVEAU', secondLine = 'SCORE' }) {
  return (
    <div className="gip-box gip-title">
      <div className="gip-title-line1">{roundLabel}</div>
      <div className="gip-title-line2">{secondLine}</div>
    </div>
  );
}

function GipScore({ value = 4270 }) {
  return <div className="gip-box gip-score">{value}</div>;
}

function GipMission({
  leftText = 'Touchez uniquement les trous',
  blueWord = 'BLEUS',
  rightText = 'Évitez les',
  redWord = 'rouges',
  showBadge = true
}) {
  return (
    <div className="gip-box gip-mission">
      {showBadge && <div className="gip-mission-badge gip-mission-badge--inset">MISSION</div>}
      <p className="gip-mission-text">
        {leftText} <span className="gip-blue">{blueWord}</span> !
        <span className="gip-sep" />
        {rightText} <span className="gip-red">{redWord}</span> !
      </p>
    </div>
  );
}

function GipMultiplier({ value = 2 }) {
  return <div className="gip-box gip-bonus">x{value}</div>;
}

function GipTimer({ value = 28 }) {
  return (
    <div className="gip-timer">
      <div className="gip-timer-ring">
        <span>{value}</span>
      </div>
    </div>
  );
}

function GameInProgress() {
  useEffect(() => {
    document.title = 'Social Bar - Game In Progress';
  }, []);

  return (
    <div className="App gip-bg">
      <div className="gip-root">
        <div className="gip-top">
          <GipTitle />
          <div className="gip-right">
            <GipScore />
            <GipTimer />
          </div>
        </div>

        <GipMission />

        <div className="gip-bottom">
          <GipMultiplier />
          <div className="gip-box gip-bonus-central">
            <div className="gip-icon">
              <div className="gip-icon-circle" />
              <div className="gip-icon-base" />
            </div>
            <div className="gip-box-label">BONUS CENTRAL</div>
          </div>
          <div className="gip-box gip-buttons">
            <div className="gip-dots">
              <span /><span /><span />
              <span /><span /><span />
            </div>
            <div className="gip-box-label">BOUTONS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameInProgress;


