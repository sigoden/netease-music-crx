import * as API from './api'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'weapi':
      let {func, args} = request
      API[func].apply(API, args).then(res => {
        sendResponse(res)
      })
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
    document.cookies = cookies
  }
},  {urls: ["https://music.163.com/weapi/login/*"]}, ['responseHeaders'])
