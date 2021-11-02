import * as storeUtils from './store'
import { DOMAIN, log, parseCookies, serializeCookies } from '../utils'

const contextMenus = [
  {
    title: '播放/暂停',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.togglePlay')
      storeUtils.togglePlaying()
    }
  },
  {
    title: '上一首',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.playPrev')
      storeUtils.playPrev()
    }
  },
  {
    title: '下一首',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.playNext')
      storeUtils.playNext()
    }
  },
  {
    title: '退出登录',
    contexts: ['browser_action'],
    onclick: function () {
      log('contextMenu.logout')
      storeUtils.logout()
    }
  }
]

chrome.contextMenus.removeAll()

contextMenus.forEach(menu => {
  chrome.contextMenus.create(menu)
})

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  const { action, params } = request
  const fn = storeUtils[action]
  if (fn) {
    (async () => {
      try {
        log(`${action}.params`, params)
        const change = (await fn.apply(storeUtils, request.params)) || {}
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

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (details.initiator.startsWith('chrome-extension://')) {
      log('webRequest.onBeforeSendHeaders', details.requestHeaders)
      for (let i = 0; i < details.requestHeaders.length; ++i) {
        const header = details.requestHeaders[i]
        if (header.name === 'Origin') {
          header.value = DOMAIN
        } else if (header.name === 'Cookie') {
          if (/\/weapi\/login/.test(details.url)) {
            const cookieObj = parseCookies(['os=pc; ' + header.value])
            header.value = serializeCookies(cookieObj)
          }
        }
      }
      details.requestHeaders.push({ name: 'Referer', value: DOMAIN })
    }
    return { requestHeaders: details.requestHeaders }
  },
  {
    urls: [
      `${DOMAIN}/weapi/*`
    ]
  },
  ['requestHeaders', 'blocking', 'extraHeaders']
)
