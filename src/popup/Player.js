import React, { useState } from 'react'
import { useSnapshot } from 'valtio'
import store from './store'
import classNames from 'classnames'
import { PLAY_MODE } from '../constants'

import './Player.css'

export default function Player () {
  const snap = useSnapshot(store)
  const [state, setState] = useState({
    isVolumeBarVisiable: false
  })
  const moveAudioThumb = (e) => {
    const bb = e.currentTarget.getBoundingClientRect()
    const percent = (e.pageX - bb.x) / bb.width
    const { audioState: { duration } } = snap
    const currentTime = percent * duration
    snap.updateAudioTime(currentTime)
  }
  const toggleVolumeBarVisibility = () => {
    setState({ isVolumeBarVisiable: !state.isVolumeBarVisiable })
  }

  const {
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
      loadPercentage
    }
  } = snap

  const currentTimeStr = formatScondTime(currentTime)
  const durationTimeStr = formatScondTime(duration)
  const percentPlayed = currentTime / duration * 100

  return (
    <div className="player container-fluid mt-3">
      <div className="row align-items-center">
        <div className="media" style={{ maxWidth: '250px' }}>
          <img src={song.picUrl} alt="album pic" className="rounded img-thumbnail p-0 mr-2" width="64" />
          <div className="info media-body" style={{ minWidth: 0 }}>
            <p className="name font-weight-bold text-truncate">
              {song.name}
            </p>
            <p className="artist m-0 text-muted text-truncate">
              {song.artists}
            </p>
          </div>
        </div>
        <div className="ctls d-flex ml-auto" style={{ minWidth: userId ? '260px' : '230px' }}>
          <div className="btns">
            <button className="btn btn-light rounded-circle" onClick={_ => playPrev()}>
              <span className="icon-step-backward" / >
            </button>
            <button className="btn btn-light rounded-circle" onClick={_ => togglePlaying()} >
              {playing
                ? (<span className="icon-pause" / >)
                : (<span className="icon-play" / >)
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
              {playMode === PLAY_MODE.SHUFFLE
                ? (<span className="icon-random" / >)
                : (playMode === PLAY_MODE.LOOP
                    ? (<span className="icon-loop" / >)
                    : (<span className="icon-one" / >)
                  )
              }
            </button>
            <div className="volume">
              <button className="btn btn-light rounded-circle" onClick={_ => toggleVolumeBarVisibility()}>
                <span className="icon-volume" />
              </button>
              <input
                min="0"
                max="1"
                value={volume}
                step="0.1"
                className={classNames('progress-volume', { 'd-none': !state.isVolumeBarVisiable })}
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
        <div className="progress progress-audio" style={{ flexGrow: 2 }} onClick={e => moveAudioThumb(e)}>
          <div className="progress-bar progress-bar-buffered " style={{ width: loadPercentage + '%' }}></div>
          <div className="progress-bar progress-bar-played" style={{ width: percentPlayed + '%' }}></div>
          <div className="thumb" style={{ zIndex: 3 }}>
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

// 格式化秒 90 -> 1:30
function formatScondTime (timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = (timeInSeconds % 60).toFixed()
  return minutes + ':' + ('00' + seconds).slice(-2)
}
