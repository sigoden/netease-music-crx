import React, { Component } from 'react';
import { observer } from 'mobx-react'
import classNames from 'classnames'

import './PlayList.css'

class PlayList extends Component {
  render() {
    let isPlaying = this.props.isPlaying
    let {coverImgUrl, name, creator, songsCount} = this.props.item
    return (
      <div className={classNames('playlist container-fluid list-group-item p-0', {'list-group-item-secondary': isPlaying})}>
        <div className="d-flex align-items-center">
          <div className="media">
            <img src={coverImgUrl} alt="album pic" className="rounded img-thumbnail p-0 mr-2" width="64" />
            <div className="info media-body" style={{minWidth: 0}}>
              <p className="name font-weight-bold text-truncate">
                {name}
              </p>
              <p className="m-0 text-muted">
                {songsCount}首 by {creator}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default observer(PlayList)
