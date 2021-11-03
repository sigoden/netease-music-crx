import * as cookieUtils from '@tinyhttp/cookie'

export const DOMAIN = 'https://music.163.com'

// 剪裁图片
export const IMAGE_CLIP = '?param=40y40'

// 图片占位
export const DEFAULT_IMAGE = 'http://p1.music.126.net/_-PWshFwqO5nFkOMpM2K4w==/109951166515653261.jpg' + IMAGE_CLIP

// 推荐歌单数量
export const LEN_PLAYLIST_REC = 3

// 歌单类型
export const PLAYLIST_TYPE = {
  TOP: 1,
  RECOMMEND: 2,
  CRATE: 3,
  FAVORIATE: 4
}

// 榜单
export const PLAYLIST_TOP = [
  {
    id: 19723756,
    name: '飙升榜',
    type: PLAYLIST_TYPE.TOP,
    picUrl: 'https://p1.music.126.net/DrRIg6CrgDfVLEph9SNh7w==/18696095720518497.jpg' + IMAGE_CLIP
  },
  {
    id: 3779629,
    name: '新歌榜',
    type: PLAYLIST_TYPE.TOP,
    picUrl: 'https://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg' + IMAGE_CLIP
  },
  {
    id: 2884035,
    name: '原创榜',
    type: PLAYLIST_TYPE.TOP,
    picUrl: 'http://p2.music.126.net/sBzD11nforcuh1jdLSgX7g==/18740076185638788.jpg' + IMAGE_CLIP
  },
  {
    id: 3778678,
    name: '热歌榜',
    type: PLAYLIST_TYPE.TOP,
    picUrl: 'https://p1.music.126.net/GhhuF6Ep5Tq9IEvLsyCN7w==/18708190348409091.jpg' + IMAGE_CLIP
  }
]

export const PLAYLIST_NEW_SONGS = {
  id: 10,
  name: '新歌速递',
  type: PLAYLIST_TYPE.RECOMMEND,
  picUrl: ''
}

export const PLAYLIST_REC_SONGS = {
  id: 20,
  name: '每日推荐',
  type: PLAYLIST_TYPE.RECOMMEND,
  picUrl: ''
}

export const EMPTY_AUDIO_STATE = {
  duration: 0,
  currentTime: 0,
  loadPercentage: 0
}

// 播放模式
export const PLAY_MODE = {
  LOOP: 'LOOP', // 循环
  SHUFFLE: 'SHUFFLE', // 随机
  ONE: 'ONE' // 单曲循环
}

export const COMMON_PROPS = {
  userId: null,
  vip: false,
  dir: 1,
  playing: false,
  volume: 1,
  playMode: PLAY_MODE.LOOP,
  playlists: [],
  selectedPlaylist: null,
  selectedSong: null
}

const LOG_LEVEL = {
  verbose: 0,
  debug: 1,
  info: 2,
  error: 3
}

export const logger = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  log (level, ...args) {
    if (level === 'error') {
      console.error(...args)
    }
    const levelValue = LOG_LEVEL[level]
    const configLevelValue = LOG_LEVEL[logger.level]
    if (levelValue >= configLevelValue) {
      console.log(...args)
    }
  },
  verbose (...args) {
    logger.log('verbose', ...args)
  },
  debug (...args) {
    logger.log('debug', ...args)
  },
  info (...args) {
    logger.log('info', ...args)
  },
  error (...args) {
    logger.log('error', ...args)
  }
}

globalThis.logger = logger

// 格式化秒 90 -> 1:30
export function formatScondTime (timeInSeconds) {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = (timeInSeconds % 60).toFixed()
  return minutes + ':' + ('00' + seconds).slice(-2)
}

export async function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export function race (values) {
  return new Promise((resolve, reject) => {
    let rejected = 0
    const errors = Array.from(Array(values.length))

    values.forEach((value, index) => {
      Promise.resolve(value)
        .then(resolve)
        .catch(error => {
          rejected += 1
          errors[index] = error
          if (rejected === values.length) {
            reject(errors)
          }
        })
    })
  })
}

const OMIT_COOKIE_KEYS = ['Expires', 'Max-Age', 'Domain', 'Path', 'Secure', 'HttpOnly', 'SameSite', 'SameSite', 'Domain']

export function parseCookies (cookieValues) {
  return cookieValues.reduce((acc, cur) => {
    const obj = cookieUtils.parse(cur)
    OMIT_COOKIE_KEYS.forEach(k => delete obj[k])
    return Object.assign(acc, obj)
  }, {})
}

export function serializeCookies (cookieObj, withOptions = false) {
  let result = Object.keys(cookieObj).map(k => cookieUtils.serialize(k, cookieObj[k])).join('; ')
  if (!result) return result
  if (withOptions) {
    const maxAge = 2147483647
    const date = new Date()
    date.setTime(date.getTime() + maxAge * 1000)
    result += cookieUtils.serialize('k', 'v', {
      expires: date,
      path: '/',
      domain: '.music.163.com'
    }).slice(3)
  }
  return result
}

export function chunkArr (arr, len) {
  const chunks = []
  let i = 0
  const n = arr.length

  while (i < n) {
    chunks.push(arr.slice(i, i += len))
  }

  return chunks
}

export function shuffleArr (array) {
  const _array = array.slice()
  for (let i = _array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_array[i], _array[j]] = [_array[j], _array[i]]
  }
  return _array
}
