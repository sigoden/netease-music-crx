import React, { Component } from 'react'
import { observer } from 'mobx-react'
import Player from './Player'
import PlayList from './PlayList'
import Login from './Login'
import './App.css'
import classNames from 'classnames'

class App extends Component {
  render() {
    let {store} = this.props
    return (
      <div className="app">
        <ul className="list-group playlist-group">
          {
            store.playlistGroup.map(item => {
              return (
                <PlayList key={item.id} item={item} isPlaying={item.id === store.selectedPlaylistId} store={store}/>
              )
            })
          }
        </ul>
        {!store.userId && (<Login store={store}/>)}
        {store.message && 
            (
              <div className={classNames('alert border-0 rounded-0 my-1 py-0 message', {'alert-danger': store.msgIsError, 'alert-success': !store.msgIsError})}>
                {store.message}
              </div>
            )
        }
        {
          store.song && <Player store={store} />
        }
      </div>
    )
  }
}

export default observer(App)
