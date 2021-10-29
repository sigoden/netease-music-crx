import store from './background/store'
import './background/contextMenus'
import { log } from './utils'

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

// capture login cooke
chrome.webRequest.onHeadersReceived.addListener((details) => {
  if (details.tabId === -1) { // only capture the request sent by extensions
    const cookies = details.responseHeaders
      .filter(header => header.name.toLowerCase() === 'set-cookie')
      .reduce((cookies, header) => {
        cookies.push(header.value)
        return cookies
      }, []).join('; ')
    if (cookies) {
      store.setCookie(cookies)
    }
  }
}, { urls: ['https://music.163.com/weapi/login/*'] }, ['responseHeaders'])
