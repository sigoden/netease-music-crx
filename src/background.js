import store  from './store'

store.bootstrap()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'storeAction':
      console.log(request)
      let fun = store[request.storeFunc]
      if (fun) {
        fun.apply(store, request.params).then(change => {
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
      }, [])
    if (cookies.length > 0) {
      document.cookies = cookies
      chrome.storage.sync.set({cookies})
    }
  }
},  {urls: ["https://music.163.com/weapi/login/*"]}, ['responseHeaders'])
