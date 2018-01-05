import * as API from './api'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'weapi':
      let {func, args} = request
      API[func].apply(API, args).then(res => {
        sendResponse(null, res)
      })
  }
})
