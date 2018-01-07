import store  from './background/store'
import './background/contextMenus'

store.bootstrap()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'storeAction':
      let fun = store[request.storeFunc]
      if (fun) {
        let result
        try {
          result = fun.apply(store, request.params)
        } catch (err) {
          sendResponse({ok: false, errorMessage: err.message})
        }
        if (result instanceof Promise) {
          result.then(change => {
            sendResponse({ok: true, change})
          }).catch(err => {
            sendResponse({ok: false, errorMessage: err.message})
          })
        } else {
          sendResponse({ok: true, change: result || {}})
        }
      }
      return true
    default:
      return
  }
})

// capture login cooke
chrome.webRequest.onHeadersReceived.addListener((details) => {
  if (details.tabId === -1) { // only capture the request sent by extensions
    let cookies = details.responseHeaders
      .filter(header => header.name.toLowerCase() === 'set-cookie')
      .reduce((cookies, header) => {
        cookies.push(header.value)
        return cookies
      }, []).join('; ')
    if (cookies) {
      store.setCookie(cookies)
    }
  }
},  {urls: ["https://music.163.com/weapi/login/*"]}, ['responseHeaders'])

