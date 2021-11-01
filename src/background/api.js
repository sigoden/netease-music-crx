import { DOMAIN, log } from '../utils'
import * as encrypt from './encrypt'

export default createRequester()

function createRequester () {
  function createRequest (reqInfo) {
    let {
      method = 'post',
      baseURL = DOMAIN,
      url,
      data
    } = reqInfo
    url = baseURL + url
    log('api.fetch', url, data)
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      credentials: 'same-origin',
      body: createQueryParams(data)
    }).then(res => {
      return res.json()
    })
  }
  return {
    // 手机登录
    cellphoneLogin (phone, captcha) {
      return createRequest({
        url: '/weapi/login/cellphone',
        data: {
          phone,
          captcha,
          countrycode: '86',
          rememberLogin: 'true'
        }
      })
    },
    // 刷新登录态
    loginRefresh () {
      return createRequest({
        url: '/weapi/login/token/refresh',
        data: {}
      })
    },
    // 发送验证码
    captchaSent (phone) {
      return createRequest({
        url: '/weapi/sms/captcha/sent',
        data: {
          cellphone: phone,
          ctcode: '86'
        }
      })
    },
    // 获取歌单
    getUserPlaylist (uid) {
      return createRequest({
        url: '/weapi/user/playlist',
        data: {
          offset: 0,
          uid,
          limit: 50
        }
      })
    },
    // 获取歌单详情
    getPlaylistDetail (id) {
      return createRequest({
        url: '/weapi/v3/playlist/detail',
        data: {
          id,
          n: 1000,
          s: 8
        }
      })
    },
    // 获取每日推荐歌曲
    getRecommendSongs () {
      return createRequest({
        url: '/weapi/v2/discovery/recommend/songs',
        data: {
          offset: 0,
          total: true,
          limit: 50
        }
      })
    },
    // 个性化推荐歌单
    getRecommendResource () {
      return createRequest({
        url: '/weapi/discovery/recommend/resource',
        data: {}
      })
    },
    // 获取歌曲详情
    getSongDetail (ids) {
      const idsHash = ids.map(id => ({ id }))
      const idsStringify = JSON.stringify(ids)
      return createRequest({
        url: '/weapi/v3/song/detail',
        data: {
          c: JSON.stringify(idsHash),
          ids: idsStringify
        }
      })
    },
    // 获取音乐 url
    getSongUrls (ids) {
      return createRequest({
        url: '/weapi/song/enhance/player/url/v1',
        data: {
          ids,
          level: 'standard',
          encodeType: 'aac'
        }
      })
    },
    // 喜欢音乐
    likeSong (playlistId, songId) {
      return createRequest({
        url: '/weapi/playlist/manipulate/tracks',
        data: {
          tracks: '[object Object]',
          pid: playlistId,
          trackIds: `[${songId}]`,
          op: 'add'
        }
      })
    }
  }
}

function createQueryParams (data) {
  const cryptoReq = encrypt.encryptData(data)
  const body = new URLSearchParams()
  body.append('params', cryptoReq.params)
  body.append('encSecKey', cryptoReq.encSecKey)
  return body
}
