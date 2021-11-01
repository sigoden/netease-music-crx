import React, { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import IconButton from '@mui/material/IconButton'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import LinearProgress from '@mui/material/LinearProgress'
import { formatScondTime } from '../utils'
import store, * as storeUtils from './store'

export default function PlayList ({ maxHeight }) {
  const snap = useSnapshot(store)
  const [loading, setLoading] = useState(false)
  const { selectedSong, selectedPlaylist, playlists } = snap
  const playlistRefs = createRefs(playlists)
  const [songs, songRefs] = useMemo(() => {
    const songs = selectedPlaylist?.normalSongsIndex.map(idx => selectedPlaylist.songsMap[idx]) || []
    const songRefs = createRefs(songs)
    return [songs, songRefs]
  }, [selectedPlaylist])
  const changePlaylist = async id => {
    setLoading(true)
    await storeUtils.changePlaylist(id)
    setLoading(false)
  }
  useEffect(() => {
    scrollListItemToView(playlistRefs, selectedPlaylist?.id)
    scrollListItemToView(songRefs, selectedSong?.id, { behavior: 'smooth', block: 'center' })
  }, [selectedSong, selectedPlaylist, songRefs, playlistRefs])
  return (
    <Grid container>
      <Grid item xs={4} sx={{ background: '#f3f0f0' }}>
        <List sx={{ maxHeight, overflowY: 'auto', py: 0 }}>
        {playlists.map((playlist, index) => {
          const selected = playlist.id === selectedPlaylist?.id
          const isNewCat = playlists[index - 1] && playlists[index - 1].type !== playlist.type
          return (
            <ListItemButton
              key={playlist.id}
              sx={isNewCat ? { borderTop: '1px solid #e0e0e0' } : {}}
              selected={selected}
              ref={playlistRefs[playlist.id]}
              onClick={_ => changePlaylist(playlist.id)}
            >
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Avatar src={playlist.picUrl} sx={{ width: 24, height: 24 }} />
              </ListItemIcon>
              <ListItemText primary={playlist.name} sx={{ '.MuiTypography-root': { maxWidth: 180, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' } }} />
            </ListItemButton>
          )
        })}
        </List>
      </Grid>
      <Grid item xs={8} sx={{ maxHeight, overflowY: 'auto' }}>
        {songs.length > 0 &&
          <Table stickyHeader size="small">
            <TableHead sx={{ height: '48px' }}>
              <TableRow>
                <TableCell><Box sx={{ paddingLeft: '14px' }}>歌名</Box></TableCell>
                <TableCell>作者</TableCell>
                <TableCell align="right" style={{ minWidth: 64 }}>时长</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {songs.map((song) => (
                <TableRow
                  key={song.id}
                  selected={song.id === snap.selectedSong?.id}
                  ref={songRefs[song.id]}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row" sx={{ maxWidth: 200, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '4px 16px' }}>
                    <IconButton onClick={() => storeUtils.playSong(song.id)}>
                      <PlayArrowIcon />
                    </IconButton>
                    {song.name}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.artists}</TableCell>
                  <TableCell align="right">{formatScondTime(song.duration / 1000)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      </Grid>
      {loading &&
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      }
    </Grid>
  )
}

function createRefs (list) {
  return list.reduce((acc, cur) => {
    acc[cur.id] = React.createRef()
    return acc
  }, {})
}

function scrollListItemToView (refs, id, opts) {
  if (id && refs[id]) {
    const el = refs[id].current
    if (!isInViewport(el)) {
      el.scrollIntoView(opts)
    }
  }
}

function isInViewport (el) {
  const rect = el.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}
