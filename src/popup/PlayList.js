import React from 'react'
import { useSnapshot } from 'valtio'
import store from './store'
import "./PlayList.css"

export default function PlayList({ item, isPlaying }) {
  let {id, coverImgUrl, name, creator, songsCount} = item
  const snap = useSnapshot(store)
  return (
    <div className='playlist container-fluid list-group-item p-1' onClick={_ => snap.changePlaylist(id)}>
      <div className="d-flex align-items-end">
        <div className="media">
          <img src={coverImgUrl} alt="album pic" className="rounded img-thumbnail p-0 mr-2" width="64" />
          <div className="info media-body" style={{minWidth: 0}}>
            <p className="name font-weight-bold text-truncate">
              {name}
            </p>
            <p className="m-0 text-muted text-truncate">
              {songsCount}首 by {creator}
            </p>
          </div>
        </div>
        {isPlaying && 
            <div className="indicator ml-auto mr-1 mb-1">
              <ul className="grafica">
                <li><span>&nbsp;</span></li>
                <li><span>&nbsp;</span></li>
                <li><span>&nbsp;</span></li>
                <li><span>&nbsp;</span></li>
                <li><span>&nbsp;</span></li>
              </ul>
            </div>
        }
      </div>
    </div>
  )
}
