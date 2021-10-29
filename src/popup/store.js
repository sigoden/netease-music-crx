import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import { STORE_PROPS } from '../constants'

// 由于 popup 页面不支持后台运行，所以音乐的播放托管给　background 页面处理，
// 而 popup 页面需要同步 background 页面的状态

const MSG_TIMEOUT = 3000
let messageTimer

const store = proxy({
  message: '',
  msgIsError: true,
  ...STORE_PROPS,
  updateAudioTime(currentTime) {
    return store.doAction("updateAudioTime", currentTime)
  },
  togglePlaying() {
    return store.doAction("togglePlaying")
  },
  updateVolume(volume) {
    return store.doAction("togglePlaying", [volume])
  },
  playPrev() {
    return store.doAction("playPrev")
  },
  playNext() {
    return store.doAction("playNext")
  },
  updatePlayMode() {
    return store.doAction("updatePlayMode")
  },
  changePlaylist(playlistId) {
    return store.doAction("changePlaylist", [playlistId])
  },
  likeSong() {
    return store.doAction("likeSong")
  },
  login(phone, password) {
    return store.doAction("login", [phone, password])
  },
  loadPlaylists() {
    return store.doAction("loadPlaylists")
  },
  fetchTopNew() {
    return store.doAction("fetchTopNew")
  },
  popupInit() {
    return store.doAction("popupInit")
  },
  doAction(action, params = []) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'storeAction',
        storeFunc: action,
        params,
      }, response => {
        console.log(action, params, response)
        if (response.ok) {
          if (typeof response.change === 'object') {
            Object.assign(store, response.change)
          } 
          if (response.message) {
            store.message = response.message
            store.msgIsError = false
          }
          return resolve(response.change)
        }  else {
          store.message = response.errorMessage
          store.msgIsError = true
          return reject(response.errorMessage)
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
      return
  }
})

export default store