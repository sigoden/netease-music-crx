import React, { useState } from 'react'
import { useSnapshot } from 'valtio'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Slider from '@mui/material/Slider'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import LoopIcon from '@mui/icons-material/Loop'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import store from './store'
import { PLAY_MODE, formatScondTime } from '../utils'

export default function Player () {
  const snap = useSnapshot(store)
  const [showVolumeBar, setShowVolumeBar] = useState(false)

  const handleTimeChange = (e, percent) => {
    const { audioState: { duration } } = snap
    const currentTime = percent * duration / 100
    store.updateAudioTime(currentTime)
  }

  const handleVolumeChange = (e) => {
    store.updateVolume(1 - e.target.value)
  }

  const {
    userId,
    playing,
    song,
    volume,
    playMode,
    audioState: {
      currentTime,
      duration
    }
  } = snap

  const currentTimeStr = formatScondTime(currentTime)
  const durationTimeStr = formatScondTime(duration)
  const percentPlayed = currentTime ? currentTime / duration * 100 : 0
  let playModeIcon, playModeTitle
  switch (playMode) {
    case PLAY_MODE.SHUFFLE:
      playModeIcon = <ShuffleIcon />
      playModeTitle = '随机'
      break
    case PLAY_MODE.ONE:
      playModeIcon = <CompareArrowsIcon />
      playModeTitle = '单曲循环'
      break
    default:
      playModeIcon = <LoopIcon />
      playModeTitle = '循环'
      break
  }

  return (
    <Grid container alignItems='center' sx={{ background: 'white', p: 1 }}>
      <Grid item alignItems='center'>
        <IconButton onClick={store.playPrev} title='上一首'>
          <SkipPreviousIcon />
        </IconButton>
        <IconButton onClick={store.togglePlaying} title='播放/暂停'>
            {playing
              ? <PauseIcon />
              : <PlayArrowIcon />
            }
        </IconButton>
        <IconButton onClick={store.playNext} title='下一首'>
          <SkipNextIcon />
        </IconButton>
      </Grid>
      <Grid item alignItems='center' sx={{ flexGrow: 1, display: 'flex', mx: 1 }}>
        <Avatar src={song?.picUrl || ''} alt='song pic' />
        <Grid container direction='column' sx={{ mx: 1 }}>
          <Grid item sx={{ display: 'flex' }}>
            <Box sx={{ maxWidth: 175, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song?.name || ''}</Box>
            <Box sx={{ ml: 2, maxWidth: 175, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', opacity: 0.6 }}>{song?.artists || ''}</Box>
          </Grid>
          <Grid item alignItems='center' sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%', mx: 1 }}>
              <Slider value={percentPlayed} min={0} step={1} max={100} onChange={handleTimeChange} />
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ whiteSpace: 'nowrap' }}>{currentTimeStr} / {durationTimeStr}</Box>
      </Grid>
      <Grid item alignItems='center'>
        {userId &&
          <IconButton onClick={store.likeSong} title='收藏'>
            <FavoriteBorderIcon />
          </IconButton>
        }
        <IconButton onClick={store.updatePlayMode} title={playModeTitle}>
          {playModeIcon}
        </IconButton>
        <IconButton onClick={() => setShowVolumeBar(!showVolumeBar)} title='音量'>
          <VolumeUpIcon />
        </IconButton>
        <Box sx={{
          height: 100, display: showVolumeBar ? 'block' : 'none', position: 'absolute', zIndex: 99, right: 6
        }}>
          <Slider
            value={1 - volume}
            orientation='vertical'
            track='inverted'
            step={0.01}
            min={0}
            max={1}
            onChange={e => handleVolumeChange(e)}
          />
        </Box>
      </Grid>

    </Grid>
  )
}
