import React, { useEffect, useRef } from 'react';

function App() {
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8080');

    ws.current.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    ws.current.onmessage = (event) => {
      console.log('Received:', event.data);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <div className="App">
      <h1>WebSocket Client</h1>
    </div>
  );
}

export default App;
