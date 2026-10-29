import React from 'react';
import ReactDOM from 'react-dom/client';
import { BannerApp } from './BannerApp';
import '../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BannerApp />
  </React.StrictMode>
);
