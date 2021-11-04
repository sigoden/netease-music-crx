import * as storeUtils from './store'
import { DOMAIN, logger, parseCookies, serializeCookies } from '../utils'
import { KUWO_DOMAIN, KUWO_MOBI_DOMAIN } from './kuwo'
import { MIGU_DOMAIN } from './migu'

export function init () {
  initContextMenu()
  initMessageHandler()
  initRequestHook()
  initResponseHook()
}

export function sendToPopup (data) {
  chrome.runtime.sendMessage(data)
}

export function saveData (data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve)
  })
}

export function loadData () {
  return new Promise(resolve => {
    chrome.storage.local.get(resolve)
  })
}

function initContextMenu () {
  const contextMenus = [
    {
      title: '播放/暂停',
      contexts: ['browser_action'],
      onclick: function () {
        logger.debug('contextMenu.togglePlay')
        storeUtils.togglePlaying()
      }
    },
    {
      title: '上一首',
      contexts: ['browser_action'],
      onclick: function () {
        logger.debug('contextMenu.playPrev')
        storeUtils.playPrev()
      }
    },
    {
      title: '下一首',
      contexts: ['browser_action'],
      onclick: function () {
        logger.debug('contextMenu.playNext')
        storeUtils.playNext()
      }
    },
    {
      title: '静音/取消静音',
      contexts: ['browser_action'],
      onclick: function () {
        logger.debug('contextMenu.mute')
        storeUtils.toggleMute()
      }
    },
    {
      title: '退出登录',
      contexts: ['browser_action'],
      onclick: function () {
        logger.debug('contextMenu.logout')
        storeUtils.logout()
      }
    }
  ]

  chrome.contextMenus.removeAll()

  contextMenus.forEach(menu => {
    chrome.contextMenus.create(menu)
  })
}

function initMessageHandler () {
  chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    const { action, params } = request
    const fn = storeUtils[action]
    if (fn) {
      (async () => {
        try {
          logger.debug(`${action}.params`, params)
          const change = (await fn.apply(storeUtils, request.params)) || {}
          if (action !== 'loadSongsMap') {
            logger.debug(`${action}.result`, change)
          }
          sendResponse({ isErr: false, message: '', ...change })
        } catch (err) {
          logger.debug(`${action}.error`, err)
          sendResponse({ isErr: true, message: err.message })
        }
      })()
    } else {
      sendResponse({ isErr: true, message: '未知操作' })
    }
    return true
  })
}

function initRequestHook () {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
      if (details?.initiator && details.initiator.startsWith('chrome-extension://')) {
        if (details.url.startsWith(DOMAIN)) {
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
          logger.verbose('requestHook.163', details.requestHeaders)
          details.requestHeaders.push({ name: 'Referer', value: DOMAIN })
        } else if (details.url.startsWith(KUWO_DOMAIN)) {
          let token = ''
          for (let i = 0; i < details.requestHeaders.length; ++i) {
            const header = details.requestHeaders[i]
            if (header.name === 'Origin') {
              header.value = KUWO_DOMAIN
            } else if (header.name === 'Cookie') {
              token = parseCookies([header.value]).kw_token
            }
          }
          if (token) details.requestHeaders.push({ name: 'csrf', value: token })
          details.requestHeaders.push({ name: 'Referer', value: KUWO_DOMAIN })
          logger.verbose('requestHook.kuwo', details.requestHeaders)
        } else if (details.url.startsWith(KUWO_MOBI_DOMAIN)) {
          for (let i = 0; i < details.requestHeaders.length; ++i) {
            const header = details.requestHeaders[i]
            if (header.name === 'Origin') {
              header.value = KUWO_DOMAIN
            }
          }
          details.requestHeaders.push({ name: 'user-agent', value: 'okhttp/3.10.0' })
          details.requestHeaders.push({ name: 'Referer', value: KUWO_DOMAIN })
          logger.verbose('requestHook.kuwo.mobi', details.requestHeaders)
        } else if (details.url.startsWith(MIGU_DOMAIN)) {
          for (let i = 0; i < details.requestHeaders.length; ++i) {
            const header = details.requestHeaders[i]
            if (header.name === 'Origin') {
              header.value = MIGU_DOMAIN
            }
          }
          details.requestHeaders.push({ name: 'Referer', value: MIGU_DOMAIN })
          logger.verbose('requestHook.migu', details.requestHeaders)
        }
      }
      return { requestHeaders: details.requestHeaders }
    },
    {
      urls: [
        `${DOMAIN}/weapi/*`,
        '*://*.kuwo.cn/*',
        '*://*.migu.cn/*'
      ]
    },
    ['requestHeaders', 'blocking', 'extraHeaders']
  )
}

function initResponseHook () {
  chrome.webRequest.onHeadersReceived.addListener(
    function (details) {
      if (details?.initiator && details.initiator.startsWith('chrome-extension://')) {
        if (details.url.startsWith(MIGU_DOMAIN)) {
          details.responseHeaders.push({ name: 'Access-Control-Allow-Origin', value: '*' })
          logger.verbose('responseHook.migu', details.requestHeaders)
        }
      }
      return { responseHeaders: details.responseHeaders }
    },
    {
      urls: [
        '*://*.migu.cn/*'
      ]
    },
    ['responseHeaders', 'blocking', 'extraHeaders']
  )
}
