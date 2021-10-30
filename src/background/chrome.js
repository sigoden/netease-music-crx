import store from './store'
import { DOMAIN, log, parseCookies, serializeCookies } from '../utils'

const contextMenus = [
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
  },
  {
    title: '退出登录',
    contexts: ['browser_action'],
    onclick: function () {
      store.logout()
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

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    if (details.tabId === -1) {
      log('webRequest.onHeadersReceived', details.responseHeaders)
      const cookieValues = details.responseHeaders.filter(h => h.name === 'set-cookie').map(h => h.value)
      if (cookieValues.length > 0) {
        const newCookieObj = parseCookies(cookieValues)
        store.saveCookies(newCookieObj)
        const storeCookieObj = parseCookies([store.cookies])
        Object.keys(newCookieObj).forEach(k => delete storeCookieObj[k])
        const storeCookieStr = serializeCookies(storeCookieObj, true)
        if (storeCookieStr) {
          details.responseHeaders.push({ name: 'set-cookie', value: storeCookieStr })
          log('webRequest.onHeadersReceived.cookie', storeCookieStr, newCookieObj)
        }
      }
    }
    return { responseHeaders: details.responseHeaders }
  },
  {
    urls: [
      `${DOMAIN}/weapi/login/*`
    ]
  },
  ['responseHeaders', 'blocking', 'extraHeaders']
)

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (details.tabId === -1) {
      log('webRequest.onBeforeSendHeaders', details.requestHeaders)
      for (let i = 0; i < details.requestHeaders.length; ++i) {
        const header = details.requestHeaders[i]
        if (header.name === 'Origin') {
          header.value = DOMAIN
        } else if (header.name === 'Cookie') {
          const cookieObj = parseCookies([store.cookies + '; os=pc; ' + header.value])
          header.value = serializeCookies(cookieObj)
        }
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
