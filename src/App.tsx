import React from 'react';
import './App.css';
import ha from './assets/ha.jpeg';

function App() {
  return (
    <>
      <img src={ha} alt="화평씨 얼굴" style={{ width: 300 }} />
      <div data-testid="app-1">{process.env.ASDF}</div>
    </>
  );
}

export default App;
