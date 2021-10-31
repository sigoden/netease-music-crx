import * as cookieUtils from '@tinyhttp/cookie'

export const DOMAIN = 'https://music.163.com'

// 榜单
export const PLAYLIST_TOP = [
  {
    id: 19723756,
    name: '飙升榜',
    type: '榜单',
    picUrl: 'https://p1.music.126.net/DrRIg6CrgDfVLEph9SNh7w==/18696095720518497.jpg'
  },
  {
    id: 3779629,
    name: '新歌榜',
    type: '榜单',
    picUrl: 'https://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg'
  },
  {
    id: 3778678,
    name: '热歌榜',
    type: '榜单',
    picUrl: 'https://p1.music.126.net/GhhuF6Ep5Tq9IEvLsyCN7w==/18708190348409091.jpg'
  }
]

export const PLAYLIST_REC_SONGS = {
  id: 1,
  name: '每日歌曲推荐',
  type: '每日推荐',
  picUrl: ''
}

// 播放模式
export const PLAY_MODE = {
  LOOP: 'LOOP', // 循环
  SHUFFLE: 'SHUFFLE', // 随机
  ONE: 'ONE' // 单曲循环
}

export const STORE_PROPS = {
  cookies: '',
  playing: false,
  userId: null,
  songId: null,
  volume: 1,
  audioState: {
    duration: 0,
    currentTime: 0,
    loadPercentage: 0
  },
  playlists: [],
  playMode: PLAY_MODE.LOOP,
  song: null,
  selectedPlaylistId: null,
  selectedPlaylist: null
}

export function log (...args) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

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
