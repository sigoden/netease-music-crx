import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

import { STORE_PROPS, PLAY_MODE, log, parseCookies, serializeCookies, TOPLIST } from '../utils'
// 剪裁图片
const IMAGE_CLIP = '?param=150y150'
// store 中不需要存储的键
const PERSIST_KEYS = ['userId', 'volume', 'playMode', 'selectedPlaylistId', 'cookies', 'songId']

// 播放器
let audio

const store = proxy({
  ...STORE_PROPS,
  myPlaylistId: null,
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
    const { playlist, songId } = getCurrentPlaylistAndSong()
    const song = await getSong(playlist, store.playMode, songId, -1)
    return store.applyChange({ song, playing: true })
  },
  async playNext () {
    const { playlist, songId } = getCurrentPlaylistAndSong()
    const song = await getSong(playlist, store.playMode, songId, 1)
    return store.applyChange({ song, playing: true })
  },
  async playSong (songId) {
    const { playlist } = getCurrentPlaylistAndSong()
    const song = await getSong(playlist, store.playMode, songId, 0)
    return store.applyChange({ song, playing: true })
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
      songId = store.songId
    }
    let playlist = store.playlistGroup.find(playlist => playlist.id === playlistId)
    if (!playlist) playlist = store.playlistGroup[0]
    if (playlist.normalSongsIndex.indexOf(v => v === songId) === -1) {
      songId = store.playMode === PLAY_MODE.SHUFFLE ? playlist.shuffleSongsIndex[0] : playlist.normalSongsIndex[0]
    }
    const song = await getSong(playlist, store.playMode, songId, 0)
    return store.applyChange({
      selectedPlaylistId: playlistId,
      song
    })
  },
  async likeSong () {
    const { song, playlistGroup } = store
    if (!song) throw new Error('无选中歌曲')
    const playlistId = playlistGroup.find(v => v.type === '喜欢')?.id
    if (!playlistId) throw new Error('无法收藏')
    const res = await api.likeSong(playlistId, song.id)
    if (res.code === 200) {
      const playlistGroup = await updateLikeSongsPlaylist()
      return store.applyChange({ playlistGroup, message: '收藏成功' })
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
  async loadPlaylists () {
    const playlists = await loadAllPlaylists()
    return store.applyChange({
      playlistGroup: [...store.playlistGroup.filter(v => v.type === '榜单'), ...playlists]
    })
  },
  // 获取榜单
  async loadTopList () {
    const list = await Promise.all(TOPLIST.map(async id => {
      const res = await api.getPlaylistDetail(id)
      if (res.code === 200) {
        return normalizePlaylist(res.playlist, '榜单')
      } else {
        throw new Error('获取排行榜失败')
      }
    }))
    store.applyChange({ playlistGroup: [...list, ...store.playlistGroup.filter(v => v.type === '榜单')] })
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
    await store.loadTopList()
    if (store.userId) {
      const res = await api.loginRefresh()
      if (res.code === 200) {
        await store.loadPlaylists()
        await store.changePlaylist()
      } else if (res.code === 301) { // cookie 失效
        await store.logout()
      }
    } else {
      await store.changePlaylist(store.playlistGroup[0].id)
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
    if (change.song) change.songId = change.song.id
    persistStore(change)
    Object.assign(store, change)
    return change
  }
})

function normalizePlaylist (playlist, type) {
  const { id, name, coverImgUrl, tracks } = playlist
  if (playlist.specialType === 5) {
    type = '喜欢'
  } else if (playlist.userId === store.userId) {
    type = '创建'
  }
  const { songsIndex: normalSongsIndex, songsMap } = tracksToSongs(tracks)
  const shuffleSongsIndex = shuffleArray(normalSongsIndex)
  return {
    id: Number(id),
    name,
    type,
    songsCount: normalSongsIndex.length,
    coverImgUrl: coverImgUrl + IMAGE_CLIP,
    songsMap,
    normalSongsIndex,
    shuffleSongsIndex
  }
}

function tracksToSongs (tracks) {
  const songs = tracks.map(track => {
    const { id, name, al: { picUrl }, ar, dt } = track
    return { id, name, picUrl: picUrl + IMAGE_CLIP, artists: compactArtists(ar), duration: dt }
  })
  const songsMap = songs.reduce((songsMap, song) => {
    songsMap[song.id] = song
    return songsMap
  }, {})
  const songsIndex = songs.map(song => song.id)
  return { songsIndex, songsMap }
}

function compactArtists (artists) {
  return artists.map(artist => artist.name).join('/')
}

function getSong (playlist, playMode, currentSongId, dir) {
  const { songsMap, shuffleSongsIndex, normalSongsIndex } = playlist
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? shuffleSongsIndex : normalSongsIndex
  const len = songsIndex.length
  const currentSongIndex = songsIndex.findIndex(index => index === currentSongId)
  const nextSongIndex = currentSongIndex === -1 ? 0 : (len + currentSongIndex + dir) % len
  const song = songsMap[songsIndex[nextSongIndex]]
  return updateSongUrl(song).then(song => {
    if (!song.url) {
      if (dir === 0 || playlist.normalSongsIndex.length < 2) {
        throw new Error('无法播放选中歌曲')
      }
      return getSong(playlist, playMode, song.id, dir)
    }
    return song
  })
}

function updateSongUrl (song) {
  return api.getSongUrls([song.id]).then(res => {
    if (res.code === 200) {
      const { url } = res.data[0]
      song.url = url
      return song
    }
  })
}

function shuffleArray (array) {
  const _array = array.slice()
  for (let i = _array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_array[i], _array[j]] = [_array[j], _array[i]]
  }
  return _array
}

async function loadAllPlaylists () {
  const result = await Promise.all([loadRecommandSongsAsPlaylist(), loadRecommendResourcePlaylist(), loadUserPlaylist()])
  const [recommendSongsAsPlaylist, recommendResourcePlaylist, userPlaylists] = result
  return [recommendSongsAsPlaylist, ...recommendResourcePlaylist, ...userPlaylists]
}

async function loadRecommandSongsAsPlaylist () {
  const playlist = { id: randomId(), name: '每日歌曲推荐' }
  const songs = await loadRecommandSongs()
  playlist.tracks = songs
  playlist.coverImgUrl = songs[0].al.picUrl
  return normalizePlaylist(playlist, '推荐')
}

async function loadRecommendResourcePlaylist () {
  try {
    const res = await api.getRecommendResource()
    if (res.code !== 200) {
      log('loadRecommendResourcePlaylist.error', res.message)
      throw new Error(res.message)
    }
    return Promise.all(res.recommend.slice(0, 3).map(playlist => loadPlaylistById(playlist.id, '推荐')))
  } catch {
    throw new Error('获取推荐歌单失败')
  }
}

async function loadUserPlaylist () {
  try {
    const res = await api.getUserPlaylist(store.userId)
    log('loadUserPlaylist.error', res.message)
    if (res.code !== 200) {
      throw new Error(res.message)
    }
    return Promise.all(res.playlist.map(playlist => loadPlaylistById(playlist.id, '收藏')))
  } catch {
    throw new Error('获取我的歌单失败')
  }
}

async function loadRecommandSongs () {
  try {
    const res = await api.getRecommendSongs()
    if (res.code !== 200) {
      log('loadRecommandSongs.error', res.message)
      throw new Error(res.message)
    }
    return res.recommend.map(song => {
      const { id, name, album: al, artists: ar, duration } = song
      return { id, name, al, ar, dt: duration }
    })
  } catch {
    throw new Error('获取推荐音乐失败')
  }
}

async function loadPlaylistById (id, type) {
  const res = await api.getPlaylistDetail(id)
  if (res.code === 200) {
    return normalizePlaylist(res.playlist, type)
  } else {
    log('loadPlaylistById.error', id, res.message)
    throw new Error('获取歌单失败')
  }
}

function getCurrentPlaylistAndSong () {
  const { song, playlistGroup, selectedPlaylistId } = store
  let songId = song ? song.id : TOPLIST[0]
  let playlist = playlistGroup.find(playlist => playlist.id === selectedPlaylistId)
  if (!playlist) {
    playlist = playlistGroup[0]
    songId = TOPLIST[0]
  }
  return { playlist, songId }
}

function updateLikeSongsPlaylist () {
  const { playlistGroup } = store
  const likeSongPlaylistIndex = playlistGroup.findIndex(v => v.type === '喜欢')
  const playlistId = playlistGroup[likeSongPlaylistIndex].id
  return api.getPlaylistDetail(playlistId).then(res => {
    if (res.code === 200) {
      const playlist = normalizePlaylist(res.playlist, '我的')
      playlistGroup[likeSongPlaylistIndex] = playlist
      return playlistGroup
    } else {
      throw new Error('刷新喜欢的音乐歌单失败')
    }
  })
}

function randomId () {
  return Number(Math.random().toString().substr(3, 8))
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

subscribeKey(store, 'song', song => {
  if (!song) {
    if (audio) audio.pause()
    return
  }
  if (audio) {
    audio.src = song.url
  } else {
    audio = new Audio(song.url)
  }
  if (store.playing) {
    audio.play()
  } else {
    audio.pause()
  }
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
})

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
