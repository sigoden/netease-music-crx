import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { STORE_PROPS, log } from '../utils'

const MSG_TIMEOUT = 3000
let messageTimer

const store = proxy({
  message: '',
  msgIsError: true,
  ...STORE_PROPS,
  updateAudioTime (currentTime) {
    return store.doAction('updateAudioTime', [currentTime])
  },
  togglePlaying () {
    return store.doAction('togglePlaying')
  },
  updateVolume (volume) {
    return store.doAction('updateVolume', [volume])
  },
  playPrev () {
    return store.doAction('playPrev')
  },
  playNext () {
    return store.doAction('playNext')
  },
  playSong (songId) {
    return store.doAction('playSong', [songId])
  },
  updatePlayMode () {
    return store.doAction('updatePlayMode')
  },
  changePlaylist (playlistId) {
    return store.doAction('changePlaylist', [playlistId])
  },
  likeSong () {
    return store.doAction('likeSong')
  },
  login (phone, captcha) {
    return store.doAction('login', [phone, captcha])
  },
  captchaSent (phone) {
    return store.doAction('captchaSent', [phone])
  },
  loadPlaylists () {
    return store.doAction('loadPlaylists')
  },
  fetchTopNew () {
    return store.doAction('fetchTopNew')
  },
  popupInit () {
    return store.doAction('popupInit')
  },
  doAction (action, params = []) {
    log(action + '.req', params)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'storeAction',
        storeFunc: action,
        params
      }, response => {
        log(action + '.res', response)
        log(store)
        if (response.ok) {
          if (typeof response.change === 'object') {
            Object.assign(store, response.change)
          }
          if (response.message) {
            store.message = response.message
            store.msgIsError = false
          }
          return resolve(response.change)
        } else {
          store.message = response.message
          store.msgIsError = true
          return reject(response.message)
        }
      })
    })
  }
})

subscribeKey(store, 'message', () => {
  if (store.message) {
    clearTimeout(messageTimer)
    messageTimer = setTimeout(() => {
      store.msgIsError = true
      store.message = ''
    }, MSG_TIMEOUT)
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'audioState':
      store.audioState = request.audioState
      break
    default:
  }
})

export default store
