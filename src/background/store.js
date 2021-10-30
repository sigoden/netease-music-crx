import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

import { STORE_PROPS, TOP_NEW_ID, PLAY_MODE, log } from '../utils'
// 剪裁图片
const IMAGE_CLIP = '?param=150y150'
// store 中不需要存储的键
const PERSIST_KEYS = ['userId', 'volume', 'playMode', 'selectedPlaylistId']

// 播放器
let audio

const store = proxy({
  cookies: '',
  ...STORE_PROPS,
  syncPersistData () {
    return new Promise((resolve) => {
      chrome.storage.sync.get(persistData => {
        if (persistData) {
          persistData = PERSIST_KEYS.reduce((acc, k) => {
            const v = persistData[k]
            if (typeof v !== 'undefined') acc[k] = v
            return acc
          }, {})
          log('persistData', persistData)
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
      return store.togglePlaying()
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
    return store.applyChange({ song })
  },
  async playNext () {
    const { playlist, songId } = getCurrentPlaylistAndSong()
    const song = await getSong(playlist, store.playMode, songId)
    return store.applyChange({ song })
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
    let playlist = store.playlistGroup.find(playlist => playlist.id === playlistId)
    if (!playlist) {
      playlist = store.playlistGroup[0]
    }
    const songId = store.playMode === PLAY_MODE.SHUFFLE ? playlist.shuffleSongsIndex[0] : playlist.normalSongsIndex[0]
    const song = await getSong(playlist, store.playMode, songId, 0)
    return store.applyChange({
      selectedPlaylistId: playlistId,
      song
    })
  },
  async likeSong () {
    const { song } = store
    if (!song) throw new Error('无选中歌曲')
    const playlistId = store.playlistGroup[2]?.id
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
      return store.applyChange({ userId })
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
      playlistGroup: [...store.playlistGroup, ...playlists]
    })
  },
  // 获取新歌榜
  async fetchTopNew () {
    const res = await api.getPlaylistDetail(TOP_NEW_ID)
    if (res.code === 200) {
      const playlist = normalizePlaylist(res.playlist)
      return store.applyChange({
        playlistGroup: [playlist, ...store.playlistGroup.slice(1)]
      })
    } else {
      throw new Error('获取新歌榜失败')
    }
  },
  logout () {
    audio.pause()
    store.reset()
    store.bootstrap()
  },
  popupInit () {
    return store
  },
  async bootstrap () {
    await store.syncPersistData()
    await store.fetchTopNew()
    if (store.userId) {
      const res = await api.loginRefresh()
      if (res.code === 200) {
        await store.loadPlaylists()
        await store.changePlaylist(store.playlistGroup[0].id)
      } else if (res.code === 301) { // cookie 失效
        store.clear()
      }
    } else {
      await store.changePlaylist(store.playlistGroup[0].id)
    }
  },
  reset () {
    store.applyChange({
      playing: false,
      cookies: '',
      userId: null,
      playlistGroup: []
    })
  },
  applyChange (change) {
    persistStore(change)
    Object.assign(store, change)
    return change
  }
})

function normalizePlaylist (playlist) {
  const { id, creator: { nickname: creator }, name, coverImgUrl, tracks } = playlist
  const { songsIndex: normalSongsIndex, songsMap } = tracksToSongs(tracks)
  const shuffleSongsIndex = shuffleArray(normalSongsIndex)
  return {
    id: Number(id),
    creator,
    name,
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

function getSong (playlist, playMode, currentSongId, dir = 1) {
  const { songsMap, shuffleSongsIndex, normalSongsIndex } = playlist
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? shuffleSongsIndex : normalSongsIndex
  const len = songsIndex.length
  const currentSongIndex = songsIndex.findIndex(index => index === currentSongId)
  const nextSongIndex = currentSongIndex === -1 ? 0 : (len + currentSongIndex + dir) % len
  const song = songsMap[songsIndex[nextSongIndex]]
  return updateSongWithUrl(song).then(song => {
    // some song have no valid url, need to be skipped
    if (!song.url) {
      return getSong(playlist, playMode, song.id, dir)
    }
    return song
  })
}

function updateSongWithUrl (song) {
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

function loadAllPlaylists () {
  const { userId } = store
  return Promise.all([loadRecommandSongsPlaylist(userId), loadUserPlaylist(userId)]).then(result => {
    const [recommendSongsPlaylist, userPlaylists] = result
    return [recommendSongsPlaylist, ...userPlaylists]
  })
}

function loadRecommandSongsPlaylist (userId) {
  const playlist = { id: randomId(), creator: { nickname: '网易云音乐' }, name: '每日推荐歌曲' }
  return loadRecommandSongs(userId).then(songs => {
    playlist.tracks = songs
    playlist.coverImgUrl = songs[0].al.picUrl
    return normalizePlaylist(playlist)
  })
}

function loadRecommandSongs (userId) {
  return api.getRecommendSongs(userId).then(res => {
    if (res.code === 200) {
      return res.recommend.map(song => {
        const { id, name, album: al, artists: ar, duration } = song
        return { id, name, al, ar, dt: duration }
      })
    } else {
      throw new Error('获取推荐音乐失败')
    }
  })
}

function loadUserPlaylist (userId) {
  return api.getUserPlaylist(userId).then(res => {
    if (res.code === 200) {
      return Promise.all(res.playlist.map(playlist => {
        return api.getPlaylistDetail(playlist.id)
      })).then(result => {
        return result.filter(res => res.code === 200).map(res => normalizePlaylist(res.playlist))
      })
    } else {
      throw new Error('获取我的歌单失败')
    }
  })
}

function getCurrentPlaylistAndSong () {
  const { song, playlistGroup, selectedPlaylistId } = store
  let songId = song ? song.id : TOP_NEW_ID
  let playlist = playlistGroup.find(playlist => playlist.id === selectedPlaylistId)
  if (!playlist) {
    playlist = playlistGroup[0]
    songId = TOP_NEW_ID
  }
  return { playlist, songId }
}

function updateLikeSongsPlaylist () {
  const { playlistGroup } = store
  const likeSongPlaylistIndex = 2
  const playlistId = playlistGroup[likeSongPlaylistIndex].id
  return api.getPlaylistDetail(playlistId).then(res => {
    if (res.code === 200) {
      const playlist = normalizePlaylist(res.playlist)
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
  if (audio) {
    audio.src = song.url
  } else {
    audio = new Audio(song.url)
  }
  if (store.playing) {
    audio.autoplay = true
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
    log('audio errror', e)
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
    action: 'audioState',
    audioState: newAudioState
  })
}

export default store
