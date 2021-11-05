import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { COMMON_PROPS, EMPTY_AUDIO_STATE, logger } from '../utils'

const store = proxy({
  message: '',
  isErr: true,
  songsMapChanged: null,
  audioState: { ...EMPTY_AUDIO_STATE },
  ...COMMON_PROPS,
})

export function updateAudioTime (currentTime) {
  return doAction('updateAudioTime', [currentTime])
}

export function togglePlaying () {
  return doAction('togglePlaying')
}

export function updateVolume (volume) {
  return doAction('updateVolume', [volume])
}

export function playPrev () {
  return doAction('playPrev')
}

export function playNext () {
  return doAction('playNext')
}

export function playSong (songId) {
  return doAction('playSong', [songId])
}

export function updatePlayMode () {
  return doAction('updatePlayMode')
}

export function changePlaylist (playlistId) {
  return doAction('changePlaylist', [playlistId])
}

export function loadSongsMap () {
  store.songsMapChanged = null
  return doAction('loadSongsMap')
}

export function likeSong (playlistId) {
  return doAction('likeSong', [playlistId])
}

export function unlikeSong () {
  return doAction('unlikeSong')
}

export function login (phone, captcha) {
  return doAction('login', [phone, captcha])
}

export function captchaSent (phone) {
  return doAction('captchaSent', [phone])
}

export function refreshPlaylists () {
  return doAction('refreshPlaylists')
}

export function popupInit () {
  return doAction('popupInit')
}

function doAction (action, params = []) {
  logger.debug(action + '.req', params)
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, params }, response => {
      logger.debug(action + '.res', response)
      if (action === 'popupInit') {
        logger.debug('store', store)
      }
      if (!response.isErr) {
        Object.assign(store, response)
        return resolve(response)
      } else {
        Object.assign(store, response)
        return reject(response.message)
      }
    })
  })
}

subscribeKey(store, 'message', () => {
  let timer
  if (store.message) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      Object.assign(store, { message: '', isErr: false })
    }, store.isErr ? 5000 : 3000)
  }
})

chrome.runtime.onMessage.addListener((request) => {
  switch (request?.topic) {
    case 'sync':
      logger.debug('sync', request.change)
      Object.assign(store, request.change)
      break
    case 'error':
      Object.assign(store, { message: request.message, isErr: true })
      break
    case 'info':
      Object.assign(store, { message: request.message, isErr: false })
      break
    case 'audioState':
      Object.assign(store, { audioState: request.audioState })
      break
    case 'changeSongsMap':
      logger.debug('sync', request)
      Object.assign(store, { songsMapChanged: { songId: request.songId, op: request.op } })
      break
    default:
      break
  }
})

export default store
