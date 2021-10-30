import store from './background/store'
import './background/contextMenus'
import { DOMAIN, log } from './utils'

store.bootstrap()

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
      `${DOMAIN}/weapi/login/*`,
      `${DOMAIN}/weapi/sms/*`
    ]
  },
  ['requestHeaders', 'blocking', 'extraHeaders']
)
