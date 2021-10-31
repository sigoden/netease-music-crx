import store from './store'
import { DOMAIN, log, parseCookies, serializeCookies } from '../utils'

const contextMenus = [
  {
    title: '播放/暂停',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.togglePlay')
      store.togglePlaying()
    }
  },
  {
    title: '上一首',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.playPrev')
      store.playPrev()
    }
  },
  {
    title: '下一首',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.playNext')
      store.playNext()
    }
  },
  {
    title: '退出登录',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.logout')
      store.logout()
    }
  }
]

chrome.contextMenus.removeAll()

contextMenus.forEach(menu => {
  chrome.contextMenus.create(menu)
})

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  const { action, params } = request
  const fn = store[action]
  if (fn) {
    (async () => {
      try {
        log(`${action}.params`, params)
        const change = (await fn.apply(store, request.params)) || {}
        log(`${action}.result`, change)
        sendResponse({ isErr: false, message: '', ...change })
      } catch (err) {
        log(`${action}.error`, err)
        sendResponse({ isErr: true, message: err.message })
      }
    })()
  } else {
    sendResponse({ isErr: true, message: '未知操作' })
  }
  return true
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
          log('webRequest.onHeadersReceived.cookie', storeCookieStr)
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
