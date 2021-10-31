import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

import {
  STORE_PROPS,
  PLAY_MODE,
  log,
  parseCookies,
  serializeCookies,
  PLAYLIST_REC_SONGS,
  PLAYLIST_TOP,
  PLAYLIST_TYPE
} from '../utils'

// 剪裁图片
const IMAGE_CLIP = '?param=150y150'
// 不需要同步的键
const PERSIST_KEYS = ['userId', 'volume', 'playMode', 'selectedPlaylistId', 'cookies', 'selectedSongId']
// 推荐歌单数量
const LEN_PLAYLIST_REC = 5

// 播放器
let audio
// 上次加载推荐歌单时间
let lastLoadAt = 0

const store = proxy({
  ...STORE_PROPS,
  async bootstrap () {
    await store.syncPersistData()
    await store.load()
  },
  syncPersistData () {
    return new Promise((resolve) => {
      chrome.storage.sync.get(persistData => {
        if (persistData) {
          persistData = PERSIST_KEYS.reduce((acc, k) => {
            const v = persistData[k]
            if (typeof v !== 'undefined') acc[k] = v
            return acc
          }, {})
          log('storage.sync', persistData)
          Object.assign(store, persistData)
        }
        resolve(store)
      })
    })
  },
  updateAudioTime (currentTime) {
    if (audio) {
      audio.currentTime = currentTime
    }
    store.applyChange({ audioState: { ...store.audioState, currentTime } })
    if (!store.playing) {
      store.togglePlaying()
    }
  },
  togglePlaying () {
    const { playing } = store
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    return store.applyChange({ playing: !playing })
  },
  updateVolume (volume) {
    audio.volume = volume
    return store.applyChange({ volume })
  },
  async playPrev () {
    const selectedSong = await getSong(store.selectedPlaylist, store.selectedSongId, -1, true)
    return store.applyChange({ selectedSong, playing: true })
  },
  async playNext () {
    const selectedSong = await getSong(store.selectedPlaylist, store.selectedSongId, 1, true)
    return store.applyChange({ selectedSong, playing: true })
  },
  async playSong (songId) {
    const selectedSong = await getSong(store.selectedPlaylist, songId, 0, false)
    return store.applyChange({ selectedSong, playing: true })
  },
  async updatePlayMode () {
    const modeKeys = Object.keys(PLAY_MODE)
    const modeKeyIndex = modeKeys.findIndex(key => PLAY_MODE[key] === store.playMode)
    const nextModeKeyIndex = (modeKeyIndex + 1 + modeKeys.length) % modeKeys.length
    const playMode = PLAY_MODE[modeKeys[nextModeKeyIndex]]
    return store.applyChange({ playMode })
  },
  async changePlaylist (playlistId) {
    let songId
    if (!playlistId) {
      playlistId = store.selectedPlaylistId
      songId = store.selectedSongId
    }
    let playlist = store.playlists.find(playlist => playlist.id === playlistId)
    if (!playlist) playlist = store.playlists[0]
    const selectedPlaylist = await loadPlaylist(playlist)
    if (selectedPlaylist.normalSongsIndex.indexOf(v => v === songId) === -1) {
      songId = store.playMode === PLAY_MODE.SHUFFLE ? selectedPlaylist.shuffleSongsIndex[0] : selectedPlaylist.normalSongsIndex[0]
    }
    const selectedSong = await getSong(selectedPlaylist, songId, 0, true)
    return store.applyChange({ selectedPlaylist, selectedSong })
  },
  async likeSong () {
    const { selectedSong, playlists } = store
    if (!selectedSong) throw new Error('无选中歌曲')
    const playlistId = playlists.find(v => v.type === PLAYLIST_TYPE.CRATE)?.id
    if (!playlistId) throw new Error('无法收藏')
    const res = await api.likeSong(playlistId, selectedSong.id)
    if (res.code === 200) {
      return store.applyChange({ message: '收藏成功' })
    } else {
      throw new Error('收藏到我喜欢的音乐失败')
    }
  },
  async login (phone, password) {
    const res = await api.cellphoneLogin(phone, password)
    if (res.code === 200) {
      const { userId } = res.profile
      return store.applyChange({ userId, message: '登录成功' })
    } else {
      throw new Error(res.message)
    }
  },
  async captchaSent (phone) {
    const res = await api.captchaSent(phone)
    if (res.code === 200) {
      return store.applyChange({ message: '短信发送成功' })
    } else {
      throw new Error(res.message)
    }
  },
  async logout () {
    store.applyChange(STORE_PROPS)
    await store.load()
    log('logout', store)
  },
  async clearMessage () {
    return store.applyChange({ message: '' })
  },
  async load () {
    lastLoadAt = Date.now()
    if (store.userId) {
      const res = await api.loginRefresh()
      if (res.code === 200) {
        const playlists = await loadPlaylists()
        store.applyChange({ playlists })
        await store.changePlaylist()
      } else if (res.code === 301) { // cookie 失效
        await store.logout()
      }
    } else {
      const playlists = PLAYLIST_TOP
      store.applyChange({ playlists })
      await store.changePlaylist()
    }
    return store
  },
  popupInit () {
    return store
  },
  saveCookies (cookieObj) {
    const currentCookieObj = parseCookies([store.cookies])
    const newCookieObj = { ...currentCookieObj, ...cookieObj }
    store.applyChange({ cookies: serializeCookies(newCookieObj) })
  },
  applyChange (change) {
    if (change.selectedSong) change.selectedSongId = change.selectedSong.id
    if (change.selectedPlaylist) change.selectedPlaylistId = change.selectedPlaylist.id
    persistStore(change)
    Object.assign(store, change)
    return change
  }
})

function tracksToSongs (tracks) {
  const songs = tracks.map(track => {
    const { id, name, al: { picUrl }, ar, dt } = track
    return { id, name, picUrl: picUrl + IMAGE_CLIP, artists: compactArtists(ar), duration: dt }
  })
  const songsMap = songs.reduce((songsMap, song) => {
    songsMap[song.id] = song
    return songsMap
  }, {})
  const normalSongsIndex = songs.map(song => song.id)
  return { normalSongsIndex, songsMap }
}

function compactArtists (artists) {
  return artists.map(artist => artist.name).join('/')
}

async function getSong (playlistDetail, currentSongId, dir, retry) {
  const { playMode } = store
  const { songsMap, shuffleSongsIndex, normalSongsIndex } = playlistDetail
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? shuffleSongsIndex : normalSongsIndex
  const len = songsIndex.length
  const currentSongIndex = songsIndex.findIndex(index => index === currentSongId)
  const nextSongIndex = currentSongIndex === -1 ? 0 : (len + currentSongIndex + dir) % len
  const song = songsMap[songsIndex[nextSongIndex]]
  if (song.url !== '') {
    const url = await getSongUrl(song.id)
    if (!url) {
      playlistDetail.songsCount -= 1
      if (retry && playlistDetail.songsCount > 0) {
        return getSong(playlistDetail, song.id, dir || 1)
      } else {
        throw new Error('无法播放歌曲')
      }
    }
    song.url = url
  }
  return song
}

async function getSongUrl (id) {
  const res = await api.getSongUrls([id])
  if (res.code !== 200) return ''
  const { url } = res.data[0]
  return url || ''
}

function shuffleArray (array) {
  const _array = array.slice()
  for (let i = _array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_array[i], _array[j]] = [_array[j], _array[i]]
  }
  return _array
}

async function loadPlaylists () {
  const result = await Promise.all([loadRecommendResourcePlaylist(), loadUserPlaylist()])
  const [recommendResourcePlaylist, userPlaylists] = result
  return [...PLAYLIST_TOP, PLAYLIST_REC_SONGS, ...recommendResourcePlaylist, ...userPlaylists]
}

async function loadRecommendResourcePlaylist () {
  try {
    const res = await api.getRecommendResource()
    if (res.code !== 200) {
      log('loadRecommendResourcePlaylist.error', res.message)
      throw new Error(res.message)
    }
    return res.recommend.slice(0, LEN_PLAYLIST_REC).map(({ id, picUrl, name }) => ({ id, picUrl, name, type: PLAYLIST_TYPE.RECOMMEND }))
  } catch {
    throw new Error('获取推荐歌单失败')
  }
}

async function loadUserPlaylist () {
  try {
    const res = await api.getUserPlaylist(store.userId)
    if (res.code !== 200) {
      log('loadUserPlaylist.error', res.message)
      throw new Error(res.message)
    }
    return res.playlist.map(({ id, coverImgUrl, name, userId }) => {
      let type = PLAYLIST_TYPE.FAVORIATE
      if (userId === store.userId) {
        type = PLAYLIST_TYPE.CRATE
      }
      return { id, picUrl: coverImgUrl, name, type }
    })
  } catch {
    throw new Error('获取我的歌单失败')
  }
}

async function loadPlaylist (playlist) {
  try {
    let tracks
    if (playlist.id === PLAYLIST_REC_SONGS.id) {
      const res = await api.getRecommendSongs()
      if (res.code === 200) {
        tracks = res.recommend.map(song => {
          const { id, name, album: al, artists: ar, duration } = song
          return { id, name, al, ar, dt: duration }
        })
      } else {
        log('getRecommendSongs.error', res.message)
        throw new Error(res.message)
      }
    } else {
      const res = await api.getPlaylistDetail(playlist.id)
      if (res.code === 200) {
        tracks = res.playlist.tracks
      } else {
        log('getPlaylistDetail.error', playlist.id, res.message)
        throw new Error(res.message)
      }
    }
    const { id, name } = playlist
    const { normalSongsIndex, songsMap } = tracksToSongs(tracks)
    const shuffleSongsIndex = shuffleArray(normalSongsIndex)
    return {
      id,
      name,
      songsCount: normalSongsIndex.length,
      songsMap,
      normalSongsIndex,
      shuffleSongsIndex
    }
  } catch {
    throw new Error('获取歌单失败')
  }
}

function persistStore (change) {
  const changePersistKeys = Object.keys(change).filter(key => PERSIST_KEYS.indexOf(key) > -1)
  if (changePersistKeys.length === 0) return
  const persistData = PERSIST_KEYS.reduce((acc, k) => {
    acc[k] = store[k]
    return acc
  }, {})
  chrome.storage.sync.set(persistData)
}

subscribeKey(store, 'selectedSong', song => {
  if (!song) {
    if (audio) audio.pause()
    return
  }
  if (audio) {
    audio.src = song.url
  } else {
    audio = createAudio(song)
  }
  if (store.playing) {
    audio.play()
  } else {
    audio.pause()
  }
  if (Date.now() - lastLoadAt > 86400000) {
    log('load.daily')
    store.load()
  }
})

function createAudio (song) {
  const audio = new Audio(song.url)
  audio.onprogress = () => {
    if (audio.buffered.length) {
      const loadPercentage = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100
      updateAudioState({
        loadPercentage
      })
    }
  }
  audio.oncanplay = () => {
    audio.onprogress()
    updateAudioState({
      duration: audio.duration
    })
  }
  audio.onabort = () => {
    updateAudioState({
      currentTime: 0
    })
  }
  audio.onended = () => {
    updateAudioState({
      currentTime: 0
    })
    store.playNext()
  }
  audio.onerror = (e) => {
    log('audio.error', e)
  }
  audio.ontimeupdate = () => {
    updateAudioState({
      currentTime: audio.currentTime
    })
  }
  return audio
}

function updateAudioState (state) {
  const { audioState } = store
  const newAudioState = { ...audioState, ...state }
  store.audioState = newAudioState
  chrome.runtime.sendMessage({
    action: 'changeAudioState',
    audioState: newAudioState
  })
}

export default store
