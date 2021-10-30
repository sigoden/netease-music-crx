import store from './store'
import { DOMAIN, log } from '../utils'

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'storeAction':
    {
      const fun = store[request.storeFunc]
      if (fun) {
        (async () => {
          try {
            log(`${request.storeFunc}.req`, request.params)
            const change = await fun.apply(store, request.params)
            log(`${request.storeFunc}.res`, change)
            let message = ''
            if (change && change.message) {
              message = change.message
              delete change.message
            }
            sendResponse({ ok: true, change, message })
          } catch (err) {
            log(`${request.storeFunc}.err`, err)
            sendResponse({ ok: false, message: err.message })
          }
        })()
      }
      return true
    }
    default:
  }
})

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    log('webRequest.onBeforeSendHeaders', details.requestHeaders)
    for (let i = 0; i < details.requestHeaders.length; ++i) {
      const header = details.requestHeaders[i]
      if (header.name === 'Origin') {
        header.value = DOMAIN
      } else if (header.name === 'Cookie') {
        header.value = header.value + '; os=pc'
      }
    }
    return { requestHeaders: details.requestHeaders }
  },
  {
    urls: [
      `${DOMAIN}/weapi/login/*`
    ]
  },
  ['requestHeaders', 'blocking', 'extraHeaders']
)
