import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import store from './delegatedStore'

store.popupInit().then(() => {
  ReactDOM.render(<App store={store} />, document.getElementById('root'));
})
