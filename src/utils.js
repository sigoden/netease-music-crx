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
      name: '云音乐新歌榜',
      songsCount: 0,
      coverImgUrl: 'http://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg?param=150y150',
      songsHash: {},
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
