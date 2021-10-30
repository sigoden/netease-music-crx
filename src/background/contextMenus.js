import store from './store'

const contextMenus = [
  {
    title: '退出登录',
    contexts: ['browser_action'],
    onclick: function () {
      store.logout()
    }
  },
  {
    title: '播放/暂停',
    contexts: ['browser_action'],
    onclick: function () {
      store.togglePlaying()
    }
  },
  {
    title: '上一首',
    contexts: ['browser_action'],
    onclick: function () {
      store.playPrev()
    }
  },
  {
    title: '下一首',
    contexts: ['browser_action'],
    onclick: function () {
      store.playNext()
    }
  }
]

chrome.contextMenus.removeAll()
contextMenus.forEach(menu => {
  chrome.contextMenus.create(menu)
})
