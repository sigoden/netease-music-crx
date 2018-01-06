import store  from './background/store'

store.bootstrap()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'storeAction':
      let fun = store[request.storeFunc]
      if (fun) {
        fun.apply(store, request.params).then(change => {
          console.log(request)
          console.log(change)
          sendResponse({ok: true, change})
        })
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
