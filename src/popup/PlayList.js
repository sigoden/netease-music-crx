import React, { Component } from 'react'
import { observer } from 'mobx-react'

class PlayList extends Component {
  render() {
    let isPlaying = this.props.isPlaying
    let {changePlaylist} = this.props.store
    let {id, coverImgUrl, name, creator, songsCount} = this.props.item
    return (
      <div className='playlist container-fluid list-group-item p-1' onClick={_ => changePlaylist(id)}>
        <div className="d-flex align-items-center">
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
              <div className="indicator ml-auto">
                <span className="icon-music" / >
              </div>
          }
        </div>
      </div>
    )
  }
}

export default observer(PlayList)
