import React, { Component } from 'react';
import { observer } from 'mobx-react'

class App extends Component {
  componentDidMount () {
    let {fetchNewSongs} = this.props.store
    fetchNewSongs()
  }
  render() {
    let {store} = this.props
    return (
      <div>
      </div>
    )
  }
}

export default observer(App)
