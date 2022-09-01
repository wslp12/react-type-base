import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import App from './App';
import Hello from './components/Hello';
import Image from './components/Image';
import Item from './components/Item';
import './index.css';

const id = 'root';
const rootElem = document.getElementById(id);
if (rootElem) {
  console.log(process.env.R_MODE);
  const root = ReactDOM.createRoot(rootElem);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route path="main/:1" element={<Outlet />}>
              <Route path="item/:itemParam" element={<Item />} />
              <Route path="image" element={<Image />} />
            </Route>
            <Route element={<Hello />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </React.StrictMode>,
  );
} else {
  console.error(
    `${rootElem} 가 존재하지 않습니다. (${id} 가 존재하지 않을 수도 있습니다)`,
  );
}
