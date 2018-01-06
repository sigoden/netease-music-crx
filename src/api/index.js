import * as encrypt from './encrypt'

import {parse as parseCookie} from 'cookie'

// 网易 API 请求路径前缀
const API_PREFIX = 'https://music.163.com/weapi'

const requester = createRequester()

let csrf = ''

export function setCookie (_cookies) {
  document.cookie = _cookies
  if (_cookies) {
    let _cookiesObj = parseCookie(_cookies)
    csrf = _cookiesObj.__csrf
  } else {
    csrf = ''
  }
}

// 手机登录
export function cellphoneLogin (phone, password) {
  const data = {
    phone: phone,
    password: encrypt.hashPasswd(password),
    rememberLogin: 'true'
  }
  return requester.cellphoneLogin(data)
}

// 获取歌单
export function getUserPlaylist (uid) {
  const data = {
    offset: 0,
    uid,
    limit: 1000,
  }
  return requester.getUserPlaylist(data)
}

// 获取歌单详情
export function getPlaylistDetail (id) {
  const data = {
    id,
    offset: 0,
    total: true,
    limit: 1000,
    n: 1000,
  }
  return requester.getPlaylistDetail(data)
}


// 获取每日推荐歌曲
export function getRecommendSongs () {
  const data = {
    offset: 0,
    total: true,
    limit: 20,
  }
  return requester.getRecommendSongs(data)
}

// 获取歌曲详情
export function getSongDetail (ids) {
  let idsHash = ids.map(id => ({id}))
  let idsStringify = JSON.stringify(ids)
  const data = {
    c: JSON.stringify(idsHash),
    ids: idsStringify,
  }
  return requester.getSongDetail(data)
}

// 刷新登录态
export function loginRefresh () {
  const data = {}
  return requester.loginRefresh(data)
}


// 获取音乐 url
export function getSongUrls (ids) {
  const data = {
    ids,
    br: 999000,
  }
  return requester.getSongUrls(data)
}

function createRequester () {
  function createRequest(reqInfo) {
    let {
      method = 'post',
      baseURL = API_PREFIX,
      url,
      data
    } = reqInfo
    url = baseURL + url
    url += '?csrf_token=' + csrf
    data.csrf_token = csrf
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      credentials: 'same-origin',
      body: createQueryParams(data),
    }).then(res => {
      return res.json()
    })
  }
  return {
    cellphoneLogin: (data) => {
      return createRequest({
        url: '/login/cellphone',
        data
      })
    },
    loginRefresh: (data) => {
      return createRequest({
        url: '/login/token/refresh',
        data
      })
    },
    getUserPlaylist: (data) => {
      return createRequest({
        url: '/user/playlist',
        data
      })
    },
    getPlaylistDetail: (data) => {
      return createRequest({
        url: '/v3/playlist/detail',
        data
      })
    },
    getRecommendSongs: (data) => {
      return createRequest({
        url: '/v2/discovery/recommend/songs',
        data
      })
    },
    getSongDetail: (data) => {
      return createRequest({
        url: '/v3/song/detail',
        data
      })
    },
    getSongUrls: (data) => {
      return createRequest({
        url: '/song/enhance/player/url',
        data
      })
    }
  }
}

function createQueryParams (data) {
  const cryptoReq = encrypt.encryptData(data)
  let body = new URLSearchParams()
  body.append('params', cryptoReq.params)
  body.append('encSecKey', cryptoReq.encSecKey)
  return body
}
