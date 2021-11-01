import crypto from 'crypto'
import bigInt from 'big-integer'
import { DOMAIN, log } from '../utils'

export default createRequester()

const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const NONCE = '0CoJUm6Qyw8W8jud'
const PUBKEY = '010001'

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
    likeSong (playlistId, songId, isLike) {
      return createRequest({
        url: '/weapi/playlist/manipulate/tracks',
        data: {
          tracks: '[object Object]',
          pid: playlistId,
          trackIds: `[${songId}]`,
          op: isLike ? 'add' : 'del'
        }
      })
    }
  }
}

function createQueryParams (data) {
  const cryptoReq = encryptData(data)
  const body = new URLSearchParams()
  body.append('params', cryptoReq.params)
  body.append('encSecKey', cryptoReq.encSecKey)
  return body
}

function encryptData (obj) {
  const text = JSON.stringify(obj)
  const secKey = createSecretKey(16)
  const encText = aesEncrypt(aesEncrypt(text, NONCE), secKey)
  const encSecKey = rsaEncrypt(secKey, PUBKEY, MODULUS)
  return {
    params: encText,
    encSecKey: encSecKey
  }
}

function createSecretKey (size) {
  const keys = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = ''
  for (let i = 0; i < size; i++) {
    let pos = Math.random() * keys.length
    pos = Math.floor(pos)
    key = key + keys.charAt(pos)
  }
  return key
}

function aesEncrypt (text, secKey) {
  const _text = text
  const lv = Buffer.from('0102030405060708', 'binary')
  const _secKey = Buffer.from(secKey, 'binary')
  const cipher = crypto.createCipheriv('AES-128-CBC', _secKey, lv)
  let encrypted = cipher.update(_text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return encrypted
}

function rsaEncrypt (text, pubKey, modulus) {
  const _text = text.split('').reverse().join('')
  const biText = bigInt(Buffer.from(_text).toString('hex'), 16)
  const biEx = bigInt(pubKey, 16)
  const biMod = bigInt(modulus, 16)
  const biRet = biText.modPow(biEx, biMod)
  return zfill(biRet.toString(16), 256)
}

function zfill (str, size) {
  while (str.length < size) str = '0' + str
  return str
}
