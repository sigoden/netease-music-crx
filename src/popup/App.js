import React from 'react'
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import theme from './theme'

import '@fontsource/roboto'

import Home from './Home'
import Login from './Login'

export default function App () {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
      <CssBaseline />
      <Router>
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route path="/login">
            <Login />
          </Route>
        </Switch>
      </Router>
    </ThemeProvider>
  )
}
