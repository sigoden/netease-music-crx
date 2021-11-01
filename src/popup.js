import React from 'react'
import ReactDOM from 'react-dom'

import App from './popup/App'
import { popupInit } from './popup/store'

popupInit().then(() => {
  ReactDOM.render(<App />, document.getElementById('root'))
})

if (module.hot) module.hot.accept()
