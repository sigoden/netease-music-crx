import * as encrypt from './encrypt'

import { parse as parseCookie } from 'cookie'

// 网易 API 请求路径前缀
const API_PREFIX = 'https://music.163.com/weapi'

export default createRequester()

function createRequester () {
  let csrf = ''
  function createRequest (reqInfo) {
    let {
      method = 'post',
      baseURL = API_PREFIX,
      url,
      data
    } = reqInfo
    url = baseURL + url
    url += (isAlreadyExistQuerystring(url) ? '&' : '?') + 'csrf_token=' + csrf
    data.csrf_token = csrf
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      credentials: 'same-origin',
      body: createQueryParams(data)
    }).then(res => {
      return res.json()
    })
  }
  return {
    setCookie (_cookies) {
      document.cookie = _cookies
      if (_cookies) {
        const _cookiesObj = parseCookie(_cookies)
        csrf = _cookiesObj.__csrf
      } else {
        csrf = ''
      }
    },
    clearCookie () {
      delete document.cookie
      csrf = ''
    },
    // 手机登录
    cellphoneLogin (phone, password) {
      return createRequest({
        url: '/login/cellphone',
        data: {
          phone: phone,
          password: encrypt.hashPasswd(password),
          rememberLogin: 'true'
        }
      })
    },
    // 刷新登录态
    loginRefresh () {
      return createRequest({
        url: '/login/token/refresh',
        data: {}
      })
    },
    // 获取歌单
    getUserPlaylist (uid) {
      return createRequest({
        url: '/user/playlist',
        data: {
          offset: 0,
          uid,
          limit: 100
        }
      })
    },
    // 获取歌单详情
    getPlaylistDetail (id) {
      return createRequest({
        url: '/v3/playlist/detail',
        data: {
          id,
          offset: 0,
          total: true,
          limit: 1000,
          n: 1000
        }
      })
    },
    // 获取每日推荐歌曲
    getRecommendSongs () {
      return createRequest({
        url: '/v2/discovery/recommend/songs',
        data: {
          offset: 0,
          total: true,
          limit: 20
        }
      })
    },
    // 获取歌曲详情
    getSongDetail (ids) {
      const idsHash = ids.map(id => ({ id }))
      const idsStringify = JSON.stringify(ids)
      return createRequest({
        url: '/v3/song/detail',
        data: {
          c: JSON.stringify(idsHash),
          ids: idsStringify
        }
      })
    },
    // 获取音乐 url
    getSongUrls (ids) {
      return createRequest({
        url: '/song/enhance/player/url',
        data: {
          ids,
          br: 999000
        }
      })
    },
    // 喜欢音乐
    likeSong (id, isLike) {
      return createRequest({
        url: `/like?id=${id}&like=${isLike}`,
        data: {}
      })
    }
  }
}

function isAlreadyExistQuerystring (url) {
  return url.indexOf('?') > -1
}

function createQueryParams (data) {
  const cryptoReq = encrypt.encryptData(data)
  const body = new URLSearchParams()
  body.append('params', cryptoReq.params)
  body.append('encSecKey', cryptoReq.encSecKey)
  return body
}
