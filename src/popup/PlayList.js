import React, { useEffect, useMemo } from 'react'
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
import { formatScondTime } from '../utils'

import store from './store'

export default function PlayList ({ maxHeight }) {
  const snap = useSnapshot(store)
  const playlistRefs = createRefs(snap.playlistGroup)
  const { song: currentSong, selectedPlaylistId, playlistGroup } = snap
  const [songs, songRefs] = useMemo(() => {
    const selectedPlaylist = playlistGroup.find(playlist => playlist.id === selectedPlaylistId)
    const songs = selectedPlaylist?.normalSongsIndex.map(idx => selectedPlaylist.songsMap[idx]) || []
    const songRefs = createRefs(songs)
    return [songs, songRefs]
  }, [selectedPlaylistId, playlistGroup])
  useEffect(() => {
    scrollListItemToView(playlistRefs, selectedPlaylistId)
    scrollListItemToView(songRefs, currentSong?.id, { behavior: 'smooth', block: 'center' })
  }, [currentSong, selectedPlaylistId, songRefs, playlistRefs])
  return (
    <Grid container>
      <Grid item xs={4} sx={{ background: '#f3f0f0' }}>
        <List sx={{ maxHeight, overflowY: 'auto', py: 0 }}>
        {snap.playlistGroup.filter(playlist => playlist?.normalSongsIndex.length > 0).map(playlist => {
          const selected = playlist.id === snap.selectedPlaylistId
          return (
            <ListItemButton
              key={playlist.id}
              selected={selected}
              ref={playlistRefs[playlist.id]}
              onClick={_ => store.changePlaylist(playlist.id)}
            >
              <ListItemIcon sx={{ minWidth: 30 }}>
                <Avatar src={playlist.coverImgUrl} sx={{ width: 24, height: 24 }} />
              </ListItemIcon>
              <ListItemText primary={playlist.name} sx={{ maxWidth: 150, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} />
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
                  selected={song.id === snap.song?.id}
                  ref={songRefs[song.id]}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row" sx={{ maxWidth: 200, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '4px 16px' }}>
                    <IconButton onClick={() => store.playSong(song.id)}>
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
