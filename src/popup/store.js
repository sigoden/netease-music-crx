import {observable, observe, extendObservable} from 'mobx'

// 由于 popup 页面不支持后台运行，所以音乐的播放托管给　background 页面处理，
// 而 popup 页面需要同步 background 页面的状态

class Store {
  @observable message = ''

  @observable msgIsError = true
}

const store = new Store()

const MSG_TIMEOUT = 3000
let messageT
observe(store, 'message', () => {
  if (store.message) {
    clearTimeout(messageT)
    messageT = setTimeout(() => {
      store.msgIsError = true
      store.message = ''
    }, MSG_TIMEOUT)
  }
})


const ACTIONS = [
  'togglePlaying',
  'updateVolume',
  'playPrev',
  'playNext',
  'updatePlayMode',
  'changePlaylist',
  'login',
  'fetchTopNew',
  'popupInit',
  'loadRecommandAndUserPlaylists',
  'updateAudioCurrentTime',
  'likeSong',
]

for (let action of ACTIONS) {
  store[action] = (...params) => {
    return new Promise((resolve, reject) => {
      // console.log(action, params)
      chrome.runtime.sendMessage({
        action: 'storeAction',
        storeFunc: action,
        params,
      }, response => {
        if (response.ok) {
          if (typeof response.change === 'object') {
            extendObservable(store, response.change)
          } 
          if (response.message) {
            store.message = response.message
            store.msgIsError = false
          }
          return resolve()
        }
        if (response.errorMessage) {
            store.message = response.errorMessage
            store.msgIsError = true
        }
        reject()
      })
    })
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'audioState':
      extendObservable(store.audioState, request.audioState)
      break
    default:
      return
  }
})

export default store
