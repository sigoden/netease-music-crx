import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

import {
  STORE_PROPS,
  PLAY_MODE,
  IMAGE_CLIP,
  log,
  parseCookies,
  serializeCookies,
  PLAYLIST_REC_SONGS,
  PLAYLIST_TOP,
  PLAYLIST_TYPE,
  NEXT_SONG_STRATEGY,
  EMPTY_AUDIO_STATE
} from '../utils'

// 不需要同步的键
const PERSIST_KEYS = ['userId', 'volume', 'playMode', 'selectedPlaylistId', 'cookies', 'selectedSongId']
// 推荐歌单数量
const LEN_PLAYLIST_REC = 5

// 播放器
let audio
// 上次加载推荐歌单时间
let lastLoadAt = 0
// 下一首策略
let nextSongStrategy = NEXT_SONG_STRATEGY.CURRENT

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
    const selectedSong = await getSong(store.selectedPlaylist, store.selectedSongId, NEXT_SONG_STRATEGY.PREV)
    return store.applyChange({ selectedSong, playing: true })
  },
  async playNext () {
    const selectedSong = await getSong(store.selectedPlaylist, store.selectedSongId, NEXT_SONG_STRATEGY.NEXT)
    return store.applyChange({ selectedSong, playing: true })
  },
  async playSong (songId) {
    const selectedSong = await getSong(store.selectedPlaylist, songId, NEXT_SONG_STRATEGY.CURRENT)
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
    const selectedSong = await getSong(selectedPlaylist, songId, NEXT_SONG_STRATEGY.CURRENT_RETRY)
    return store.applyChange({ selectedPlaylist, selectedSong })
  },
  async likeSong (playlistId) {
    const { selectedSong, playlists } = store
    if (!selectedSong) throw new Error('无选中歌曲')
    if (!playlistId) {
      playlistId = playlists.find(v => v.primary)?.id
    } else {
      playlistId = playlists.find(v => v.id === playlistId)?.id
    }
    if (!playlistId) throw new Error('无法收藏')
    const res = await api.likeSong(playlistId, selectedSong.id, true)
    if (res.code === 200) {
      return store.applyChange({ message: '收藏成功' })
    } else {
      throw new Error('收藏歌曲失败')
    }
  },
  async unlikeSong () {
    const { selectedSong, selectedPlaylist, selectedPlaylistId } = store
    if (!selectedSong) throw new Error('无选中歌曲')
    const currentIdx = selectedPlaylist.normalSongsIndex.findIndex(id => id === selectedSong.id)
    const nextIdx = getNextSongIndex(nextSongStrategy, selectedPlaylist.normalSongsIndex.len, currentIdx)
    const res = await api.likeSong(selectedPlaylistId, selectedSong.id, false)
    if (res.code === 200) {
      store.sendToPopup({ message: '取消收藏成功', isErr: false })
      await refreshPlaylist(selectedPlaylist.normalSongsIndex[nextIdx])
    } else {
      throw new Error('取消收藏歌曲失败')
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
    if (!store.message) return
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
    store.applyChange({ message: '' })
    return store
  },
  popupInit () {
    return store
  },
  sendToPopup (obj) {
    chrome.runtime.sendMessage(obj)
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

async function getSong (playlistDetail, currentSongId, strategy) {
  nextSongStrategy = strategy
  const { playMode } = store
  const { songsMap, shuffleSongsIndex, normalSongsIndex } = playlistDetail
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? shuffleSongsIndex : normalSongsIndex
  const currentIdx = songsIndex.findIndex(index => index === currentSongId)
  const nextIdx = getNextSongIndex(strategy, songsIndex.len, currentIdx)
  const retry = strategy !== NEXT_SONG_STRATEGY.CURRENT
  const song = songsMap[songsIndex[nextIdx]]
  if (song.url !== '') {
    const url = await getSongUrl(song.id)
    if (!url) {
      playlistDetail.songsCount -= 1
      if (retry && playlistDetail.songsCount > 0) {
        return getSong(playlistDetail, song.id, strategy)
      } else {
        throw new Error('无法播放歌曲')
      }
    }
    song.url = url
  }
  return song
}

function getNextSongIndex (strategy, len, currentIdx) {
  let nextIds = currentIdx
  switch (strategy) {
    case NEXT_SONG_STRATEGY.PREV:
      if (currentIdx === 0) {
        nextIds = len - 1
      } else {
        nextIds = currentIdx - 1
      }
      break
    case NEXT_SONG_STRATEGY.NEXT:
      if (currentIdx === len - 1) {
        nextIds = 0
      } else {
        nextIds = currentIdx + 1
      }
      break
    default:
  }
  return nextIds
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
    return res.recommend.slice(0, LEN_PLAYLIST_REC).map(
      ({ id, picUrl, name }) => ({ id, picUrl: picUrl + IMAGE_CLIP, name, type: PLAYLIST_TYPE.RECOMMEND })
    )
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
    return res.playlist.map(({ id, coverImgUrl, name, userId, specialType }) => {
      let type = PLAYLIST_TYPE.FAVORIATE
      if (userId === store.userId) {
        type = PLAYLIST_TYPE.CRATE
      }
      return { id, picUrl: coverImgUrl + IMAGE_CLIP, name, type, primary: specialType === 5 }
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
    const { id, name, type } = playlist
    const { normalSongsIndex, songsMap } = tracksToSongs(tracks)
    const shuffleSongsIndex = shuffleArray(normalSongsIndex)
    return {
      id,
      name,
      type,
      songsCount: normalSongsIndex.length,
      songsMap,
      normalSongsIndex,
      shuffleSongsIndex
    }
  } catch {
    throw new Error('获取歌单失败')
  }
}

async function refreshPlaylist (songId) {
  const playlist = store.playlists.find(v => v.id === store.selectedPlaylistId)
  const selectedPlaylist = await loadPlaylist(playlist)
  const selectedSong = await getSong(selectedPlaylist, songId, nextSongStrategy)
  return store.applyChange({ selectedPlaylist, selectedSong })
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
    updateAudioState({ ...EMPTY_AUDIO_STATE })
  }
  audio.onended = () => {
    updateAudioState({ ...EMPTY_AUDIO_STATE })
    playNextSong()
  }
  audio.onerror = (e) => {
    log('audio.error', song.name, e.message)
    if (nextSongStrategy === NEXT_SONG_STRATEGY.CURRENT) {
      store.sendToPopup({
        message: '歌曲无法该播放',
        isErr: true
      })
    } else {
      playNextSong()
    }
  }
  audio.ontimeupdate = () => {
    updateAudioState({
      currentTime: audio.currentTime
    })
  }
  return audio
}

async function playNextSong () {
  if (nextSongStrategy === NEXT_SONG_STRATEGY.PREV) {
    await store.playPrev()
  } else {
    await store.playNext()
  }
  store.sendToPopup({
    selectedSong: store.selectedSong
  })
}

function updateAudioState (state) {
  const { audioState } = store
  const newAudioState = { ...audioState, ...state }
  store.applyChange({
    audioState: newAudioState
  })
  store.sendToPopup({
    audioState: newAudioState
  })
}

export default store
