import React from 'react'
import { useSnapshot } from 'valtio'
import classNames from 'classnames'
import Player from './Player'
import PlayList from './PlayList'
import Login from './Login'
import store from './store'
import './App.css'

export default function App () {
  const snap = useSnapshot(store)
  return (
    <div className="app">
      <ul className="list-group playlist-group">
        {
          snap.playlistGroup.map(item => {
            return (
              <PlayList key={item.id} item={item} isPlaying={item.id === snap.selectedPlaylistId} />
            )
          })
        }
      </ul>
      {!snap.userId && (<Login />)}
      {snap.message &&
          (
            <div className={classNames('alert border-0 rounded-0 my-1 py-0 message', { 'alert-danger': snap.msgIsError, 'alert-success': !snap.msgIsError })}>
              {snap.message}
            </div>
          )
      }
      {
        snap.song && <Player />
      }
    </div>
  )
}
