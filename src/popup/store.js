import {observable, extendObservable} from 'mobx'

// 由于 popup 页面不支持后台运行，所以音乐的播放托管给　background 页面处理，
// 而 popup 页面需要同步 background 页面的状态

const store = observable({})

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
  'updateAudioCurrentTime',
]

for (let action of ACTIONS) {
  store[action] = (...params) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'storeAction',
        storeFunc: action,
        params,
      }, response => {
        if (response.ok) {
          if (typeof response.change === 'object') {
            extendObservable(store, response.change)
          } 
          resolve()
          return
        }
        reject()
      })
    })
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'audioState':
      console.log(request.audioState)
      extendObservable(store.audioState, request.audioState)
      break
    default:
      return
  }
})

export default store
