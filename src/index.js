import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import Store from './store'

const store = new Store()

ReactDOM.render(<App store={store} />, document.getElementById('root'));
registerServiceWorker();
