import React from 'react';
import './App.css';
import { Link, Outlet } from 'react-router-dom';

function App() {
  return (
    <>
      <div data-testid="app-1">
        {process.env.ASDF}
        test Hello
      </div>
      <nav>
        {/* <Link to="main">main</Link> */}
        <Link to="main/1">main/1</Link>
        <br />
        <Link to="main/1/item/2">main/1/item/2</Link>
        <br />
        <Link to="main/1/item/3">main/1/item/3</Link>
        <br />
        <Link to="main/1/image">main/1/image</Link>
        <br />
        <Link to="/">Dashboard</Link>
      </nav>
      <Outlet />
    </>
  );
}

export default App;
