import React, { Component } from 'react';
import { observer } from 'mobx-react'
import classNames from 'classnames'

import './Player.css'

class Player extends Component {
  constructor (props) {
    super(props)
    this.state = {
      currentTimeStr: '0:00',
      durationTimeStr: '0:00',
      percentPlayed: 0,
      percentBuffered: 0
    }
  }

  onLoadedData () {
    let player = this.refs.player
    this.duration = player.duration
    this.setState({
      durationTimeStr: formatScondTime(this.duration)
    })
  }

  progress (currentTime = 0) {
    this.setState({
      percentPlayed: (currentTime / this.duration) * 100
    })
    this.buffering()
    this.passed = currentTime
  }

  buffering () {
    let player = this.refs.player

    if (player.buffered.length) {  // Player has started
      let buffered = player.buffered.end(player.buffered.length - 1)

      if (buffered >= 100) {
        buffered = 100
      }
      this.setState({
        percentBuffered: buffered
      })
    }
  }

  togglePlay () {
    let {togglePlaying, playing} = this.props.store
    togglePlaying()
    this.refs.player[playing ? 'pause' : 'play']()
  }

  resetProgress () {
    this.passed = 0
  }

  render () {
    let { playing, song, playNext } = this.props.store
    return (
      <div className="player container-fluid mt-3">
        <div className="row align-items-center flex-nowrap">
          <div className="media">
            <img src={song.picUrl} alt="album pic" className="rounded img-thumbnail p-0 mr-2" width="64" />
            <div className="info media-body" style={{minWidth: 0}}>
              <p className="name font-weight-bold text-truncate">
                {song.name}
              </p>
              <p className="artist m-0 text-muted">
                {song.artists}
              </p>
            </div>
          </div>
          <div className="ctls d-flex ml-auto" style={{minWidth: '230px'}}>
            <div className="btns">
              <button className="btn btn-light rounded-circle">
                <i className="fas fa-step-backward" />
              </button>
              <button className="btn btn-light rounded-circle" onClick={_ => this.togglePlay()} >
                {playing ?
                    (<i className="fas fa-pause-circle" />) :
                    (<i className="fas fa-play" />)
                }
              </button>
              <button className="btn btn-light rounded-circle">
                <i className="fas fa-step-forward" />
              </button>
            </div>
            <div className="divider mx-2" />
            <div className="btns">
              <button className="btn btn-light rounded-circle">
                <i className="fas fa-random" />
              </button>
              <button className="btn btn-light rounded-circle">
                <i className="fas fa-volume-down" />
              </button>
            </div>
          </div>
        </div>
        <div className="row align-items-center">
          <div className='curtime m-1'>
            {this.state.currentTimeStr}
          </div>
          <div className="progress"  style={{flexGrow: 2}}>
            <div className="progress-bar bg-secondary" role="progressbar" style={{width: this.state.percentPlayed + '%'}} aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
            <div className="dot">
              <i className="fas fa-dot-circle" />
            </div>
          </div>
          <div className='totaltime m-1'>
            {this.state.durationTimeStr}
          </div>
        </div>
        <audio
          onLoadedData={e => this.onLoadedData()}
          onAbort={e => {
            this.passed = 0
            this.progress()
          }}
          onEnded={e => {
            this.passed = 0
            playNext()
          }}
          onError={e => console.log(e)}
          onProgress={e => this.buffering(e)}
          onSeeked={e => this.resetProgress()}
          onTimeUpdate={e => {
            this.progress(e.target.currentTime)
          }}
          ref="player"
          src={song.url}
          style={{
            display: 'none'
          }} />
      </div>
    )
  }
}

// 格式化秒 90 -> 1:30
function formatScondTime (timeInSeconds) {
  let minutes = Math.floor(timeInSeconds / 60)
  let seconds = (timeInSeconds % 60).toFixed()
  return minutes + ':' + ('00' + seconds).slice(-2)
}

export default observer(Player)
