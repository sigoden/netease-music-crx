import React, { Component } from 'react'
import { observer } from 'mobx-react'
import classNames from 'classnames'

import './Player.css'
import {
  PLAY_MODE
} from '../constants'

class Player extends Component {
  constructor (props) {
    super(props)
    this.state = {
      currentTimeStr: '0:00',
      durationTimeStr: '0:00',
      percentPlayed: 0,
      percentBuffered: 0,
      isVolumeBarVisiable: false
    }
  }

  onLoadedData () {
    let player = this.refs.player
    this.duration = player.duration
    this.setState({
      durationTimeStr: formatScondTime(this.duration)
    })
  }

  moveAudioThumb (e) {
    let bb = e.currentTarget.getBoundingClientRect()
    let player = this.refs.player
    let percent = (e.pageX - bb.x) / bb.width
    let {playing}  = this.props.store
    this.setState({
      percentPlayed: percent * 100
    })
    player.currentTime = percent * player.duration
    if (!playing) {
      this.togglePlay()
    }
  }

  toggleVolumeBarVisibility () {
    this.setState({
      isVolumeBarVisiable: !this.state.isVolumeBarVisiable
    })
  }

  updateVolume (e) {
    let player = this.refs.player
    this.props.store.updateVolume(e.target.value)
    player.volume = e.target.value
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
    let {
      playing,
      song,
      playNext,
      playPrev,
      volume,
      playMode,
      updatePlayMode
    } = this.props.store
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
              <button className="btn btn-light rounded-circle" onClick={_ => playPrev()}>
                <i className="fas fa-step-backward" />
              </button>
              <button className="btn btn-light rounded-circle" onClick={_ => this.togglePlay()} >
                {playing ?
                    (<i className="fas fa-pause" />) :
                    (<i className="fas fa-play" />)
                }
              </button>
              <button className="btn btn-light rounded-circle" onClick={_ => playNext()}>
                <i className="fas fa-step-forward" />
              </button>
            </div>
            <div className="divider mx-2" />
            <div className="btns">
              <button className="btn btn-light rounded-circle" onClick={_ => updatePlayMode()}>
                {playMode === PLAY_MODE.SHUFFLE ?
                    (<i className="fas fa-random" />) :
                    (playMode === PLAY_MODE.LOOP ?
                      (<i className="fas fa-sync" />) :
                      (<i className="fas fa-redo" />)
                    )
                }
              </button>
              <div className="volume">
                <button className="btn btn-light rounded-circle" onClick={_ => this.toggleVolumeBarVisibility()}>
                  <i className="fas fa-volume-down" />
                </button>
                <input
                  min="0"
                  max="1"
                  value={volume}
                  step="0.1"
                  className={classNames('progress-volume', {'d-none': !this.state.isVolumeBarVisiable})}
                  type="range"
                  onChange={e => this.updateVolume(e)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row align-items-center">
          <div className='curtime m-1'>
            {this.state.currentTimeStr}
          </div>
          <div className="progress progress-audio" style={{flexGrow: 2}} onClick={e => this.moveAudioThumb(e)}>
            <div className="progress-bar bg-secondary progress-bar-buffered " style={{width: this.state.percentBuffered + '%'}}></div>
            <div className="progress-bar bg-primary progress-bar-played" style={{width: this.state.percentPlayed + '%'}}></div>
            <div className="thumb" style={{zIndex: 3}}>
              <i className="fas fa-dot-circle" />
            </div>
          </div>
          <div className='totaltime m-1'>
            {this.state.durationTimeStr}
          </div>
        </div>
        <audio
          autoPlay={playing}
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
          onTimeUpdate={e => {
            this.progress(e.target.currentTime);
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
