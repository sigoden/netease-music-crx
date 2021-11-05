import React, { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import store from './store'
import { PLAYLIST_TYPE } from '../utils'

export default function SelectPlaylist ({ open, onClose, onChange, title }) {
  const { playlists } = useSnapshot(store)
  const myPlaylists = useMemo(() => playlists.filter(v => v.type === PLAYLIST_TYPE.CRATE), [playlists])
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
    >
      <Box sx={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}
      >
        <Typography id='modal-modal-title' variant='h6' component='h2'>
          {title}到歌单
        </Typography>
        <Box
          id='modal-modal-description'
          sx={{
            mt: 2,
            maxHeight: 300,
            overflowY: 'auto',
            '.MuiTypography-root': {
              maxWidth: 350,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            },
          }}
        >
          <RadioGroup
            onChange={e => onChange(parseInt(e.target.value))}
            aria-label='gender'
            defaultValue='female'
            name='radio-buttons-group'
          >
            {myPlaylists.map(playlist => (
              <FormControlLabel key={playlist.id} value={playlist.id} control={<Radio />} label={playlist.name} />
            ))}
          </RadioGroup>
        </Box>
      </Box>
    </Modal>
  )
}
