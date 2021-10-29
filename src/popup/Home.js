import React from 'react'
import { useSnapshot } from 'valtio'
import { useHistory } from 'react-router-dom'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Link from '@mui/material/Link'
import Player from './Player'
import PlayList from './PlayList'
import store from './store'

export default function Home () {
  const snap = useSnapshot(store)
  const history = useHistory()
  return (
    <Box sx={{ width: 800 }}>
      {snap.song && <Player />}
      {snap.message &&
        <Alert severity={snap.msgIsError ? 'error' : 'success'}>{snap.message}</Alert>
      }
      {snap.playlistGroup.length && <PlayList />}
      {!snap.userId &&
        <Box sx={{ p: 3, textAlign: 'center', background: 'white' }}>
          <Link href="#" onClick={() => history.push('/login')}>
            登录
          </Link>
          获取每日推荐和我的歌单
        </Box>
      }
    </Box>
  )
}