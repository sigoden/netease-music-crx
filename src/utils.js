import * as cookieUtils from '@tinyhttp/cookie'

export const DOMAIN = 'https://music.163.com'

// 网易新歌榜的歌单 ID
export const TOP_NEW_ID = 3779629

// 播放模式
export const PLAY_MODE = {
  LOOP: 'LOOP', // 循环
  SHUFFLE: 'SHUFFLE', // 随机
  ONE: 'ONE' // 单曲循环
}

export const STORE_PROPS = {
  playing: false,
  userId: null,
  songId: null,
  volume: 1,
  audioState: {
    duration: 0,
    currentTime: 0,
    loadPercentage: 0
  },
  playMode: PLAY_MODE.LOOP,
  playlistGroup: [
    {
      id: TOP_NEW_ID,
      creator: '网易云音乐',
      name: '新歌榜',
      songsCount: 0,
      coverImgUrl: 'http://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg?param=150y150',
      songsMap: {},
      normalSongsIndex: [],
      shuffleSongsIndex: []
    }
  ],
  selectedPlaylistId: TOP_NEW_ID,
  song: null
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
