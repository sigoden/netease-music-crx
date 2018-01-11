import React from 'react';
import ReactDOM from 'react-dom';
import App from './popup/App';
import store from './popup/store'
import 'bootstrap/dist/css/bootstrap.min.css'

store.popupInit().then(() => {
  ReactDOM.render(<App store={store} />, document.getElementById('root'));
})
