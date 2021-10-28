import React from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css'

import App from './popup/App';
import store from './popup/store'

store.popupInit().then(() => {
  ReactDOM.render(<App store={store} />, document.getElementById('root'));
})

if (module.hot) module.hot.accept();