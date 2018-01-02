import React, { Component } from 'react';
import { observer } from 'mobx-react'
import Player from './Player'

class App extends Component {
  componentDidMount () {
    let {fetchNewSongs} = this.props.store
    fetchNewSongs()
  }
  render() {
    let {store} = this.props
    return (
      <div>
        <Player store={store} />
      </div>
    )
  }
}

export default observer(App)
