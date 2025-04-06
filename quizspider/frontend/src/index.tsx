import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';  // App.tsx をインポート
import './index.css';      // 必要に応じてCSSをインポート

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')  // このIDを持つHTML要素にReactコンポーネントをレンダリング
);
