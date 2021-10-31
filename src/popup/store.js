import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { STORE_PROPS, log } from '../utils'

const store = proxy({
  message: '',
  isErr: true,
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
  load () {
    return store.doAction('load')
  },
  popupInit () {
    return store.doAction('popupInit')
  },
  clearMessage () {
    return store.doAction('clearMessage')
  },
  doAction (action, params = []) {
    log(action + '.req', params)
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action, params }, response => {
        log(action + '.res', response)
        log('store', store)
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
})

subscribeKey(store, 'message', () => {
  let timer
  if (store.message) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      store.clearMessage()
    }, store.isErr ? 5000 : 3000)
  }
})

chrome.runtime.onMessage.addListener((request) => {
  switch (request.action) {
    case 'changeAudioState':
      store.audioState = request.audioState
      break
    default:
  }
})

export default store
