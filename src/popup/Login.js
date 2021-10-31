import React, { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'
import { useHistory } from 'react-router'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import store from './store'
import { sleep } from '../utils'

export default function Login () {
  const snap = useSnapshot(store)
  const history = useHistory()
  const [state, setState] = useState({
    phone: '',
    captcha: ''
  })
  const [count, setCount] = useState(0)
  const formFieldUpdate = (field, value) => {
    setState({ ...state, [field]: value })
  }
  useEffect(() => {
    if (count > 0) {
      sleep(1000).then(() => {
        setCount(count - 1)
      })
    }
  }, [count])
  const handleSendSms = (e) => {
    e.preventDefault()
    if (count > 0 || !state.phone) return
    (async () => {
      await store.captchaSent(state.phone)
      setCount(59)
    })()
  }
  const submit = async (e) => {
    e.preventDefault()
    const { phone, captcha } = state
    try {
      await store.login(phone, captcha)
      await store.load()
      setTimeout(() => {
        history.push('/')
      }, 2000)
    } catch {}
  }
  return (
    <Box sx={{ width: 400, m: 4 }}>
      <Box sx={{ m: 3, textAlign: 'center' }}>
        <Typography variant='h5'>
          手机号登录
        </Typography>
      </Box>
      <form onSubmit={e => submit(e)}>
        <Grid container spacing={2} alignItems='center' justifyContent='space-around'>
          <Grid item xs={12}>
            <TextField
              variant='outlined'
              required
              fullWidth
              id='phone'
              label='手机号'
              name='phone'
              autoComplete='phone'
              onChange={e => formFieldUpdate('phone', e.target.value)}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              variant='outlined'
              required
              fullWidth
              id='captcha'
              label='验证码'
              name='captcha'
              onChange={e => formFieldUpdate('captcha', e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              fullWidth
              variant='outlined'
              size='large'
              disabled={count > 0}
              sx={{ p: '14px' }}
              onClick={e => handleSendSms(e)}
            >
              {count === 0 ? '获取验证码' : `${count}s`}
            </Button>
          </Grid>
        </Grid>
        {snap.message &&
          <Box sx={{ my: 2 }}>
            <Alert severity={snap.isErr ? 'error' : 'success'}>{snap.message}</Alert>
          </Box>
        }
        <Box sx={{ my: 4 }}>
          <Button
            type='submit'
            fullWidth
            size='large'
            variant='contained'
            color='secondary'
            sx={{ fontSize: '1.2rem' }}
          >
            登录
          </Button>
        </Box>
      </form>
    </Box>
  )
}
