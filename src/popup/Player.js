import React, { Component } from 'react'
import { observer } from 'mobx-react'
import classNames from 'classnames'

import './Player.css'

// 播放模式
const PLAY_MODE = {
  LOOP: 'LOOP', // 循环
  SHUFFLE: 'SHUFFLE', // 随机
  ONE: 'ONE' // 单曲循环
}

class Player extends Component {
  constructor (props) {
    super(props)
    this.state = {
      isVolumeBarVisiable: false
    }
  }

  moveAudioThumb (e) {
    let bb = e.currentTarget.getBoundingClientRect()
    let percent = (e.pageX - bb.x) / bb.width
    let {
      updateAudioCurrentTime,
      audioState: {
        duration
      }
    } = this.props.store
    let currentTime = percent * duration
    updateAudioCurrentTime(currentTime)
  }

  toggleVolumeBarVisibility () {
    this.setState({
      isVolumeBarVisiable: !this.state.isVolumeBarVisiable
    })
  }


  render () {
    let {
      userId,
      playing,
      song,
      playNext,
      playPrev,
      volume,
      playMode,
      togglePlaying,
      updateVolume,
      updatePlayMode,
      likeSong,
      audioState: {
        currentTime,
        duration,
        loadPercentage,
      },
    } = this.props.store
    
    let currentTimeStr = formatScondTime(currentTime)
    let durationTimeStr = formatScondTime(duration)
    let percentPlayed = currentTime / duration * 100

    return (
      <div className="player container-fluid mt-3">
        <div className="row align-items-center">
          <div className="media" style={{maxWidth: '250px'}}>
            <img src={song.picUrl} alt="album pic" className="rounded img-thumbnail p-0 mr-2" width="64" />
            <div className="info media-body" style={{minWidth: 0}}>
              <p className="name font-weight-bold text-truncate">
                {song.name}
              </p>
              <p className="artist m-0 text-muted text-truncate">
                {song.artists}
              </p>
            </div>
          </div>
          <div className="ctls d-flex ml-auto" style={{minWidth: userId ? '260px' : '230px'}}>
            <div className="btns">
              <button className="btn btn-light rounded-circle" onClick={_ => playPrev()}>
                <span className="icon-step-backward" / >
              </button>
              <button className="btn btn-light rounded-circle" onClick={_ => togglePlaying()} >
                {playing ?
                    (<span className="icon-pause" / >) :
                    (<span className="icon-play" / >)
                }
              </button>
              <button className="btn btn-light rounded-circle" onClick={_ => playNext()}>
                <span className="icon-step-forward" / >
              </button>
            </div>
            <div className="divider mx-2" />
            <div className="btns mr-1">
              {userId && (
                <button className="btn btn-light rounded-circle">
                  <span className="icon-heart" onClick={_ => likeSong()} />
                </button>
              )}
              <button className="btn btn-light rounded-circle" onClick={_ => updatePlayMode()}>
                {playMode === PLAY_MODE.SHUFFLE ?
                  (<span className="icon-random" / >) :
                    (playMode === PLAY_MODE.LOOP ?
                      (<span className="icon-loop" / >) :
                      (<span className="icon-one" / >)
                    )
                }
              </button>
              <div className="volume">
                <button className="btn btn-light rounded-circle" onClick={_ => this.toggleVolumeBarVisibility()}>
                  <span className="icon-volume" />
                </button>
                <input
                  min="0"
                  max="1"
                  value={volume}
                  step="0.1"
                  className={classNames('progress-volume', {'d-none': !this.state.isVolumeBarVisiable})}
                  type="range"
                  onChange={e => updateVolume(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row align-items-center">
          <div className='curtime m-1'>
            {currentTimeStr}
          </div>
          <div className="progress progress-audio" style={{flexGrow: 2}} onClick={e => this.moveAudioThumb(e)}>
            <div className="progress-bar progress-bar-buffered " style={{width: loadPercentage + '%'}}></div>
            <div className="progress-bar progress-bar-played" style={{width: percentPlayed + '%'}}></div>
            <div className="thumb" style={{zIndex: 3}}>
              <span className="icon-circle" />
            </div>
          </div>
          <div className='totaltime m-1'>
            {durationTimeStr}
          </div>
        </div>
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

