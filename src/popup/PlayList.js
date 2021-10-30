import React from 'react'
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
import { useTheme } from '@mui/material/styles'
import { formatScondTime } from '../utils'

import store from './store'

export default function PlayList () {
  const theme = useTheme()
  const snap = useSnapshot(store)
  let songs = []
  if (snap.selectedPlaylistId) {
    const selectedPlaylist = snap.playlistGroup.find(playlist => playlist.id === snap.selectedPlaylistId)
    songs = selectedPlaylist?.normalSongsIndex.map(idx => selectedPlaylist.songsMap[idx]) || []
  }
  return (
    <Grid container>
      <Grid item xs={4} sx={{ background: theme.palette.background.playlist }}>
        <List sx={{ maxHeight: 400, overflowY: 'auto', py: 0 }}>
        {snap.playlistGroup.map(playlist => {
          const selected = playlist.id === snap.selectedPlaylistId
          return (
            <ListItemButton
              key={playlist.id}
              selected={selected}
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
      <Grid item xs={8} sx={{ maxHeight: 400, overflowY: 'auto' }}>
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
                  selected={song.id === snap.song.id}
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
