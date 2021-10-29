import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

// 网易新歌榜的歌单 ID
const TOP_NEW_ID = 3779629

// 剪裁图片
const IMAGE_CLIP = '?param=150y150'

// store 中不需要存储的键
const OMIT_PERSIST_KEYS = ['playlistGroup', 'audioState', 'errorMessage', 'playing']

// 播放模式
const PLAY_MODE = {
  LOOP: 'LOOP', // 循环
  SHUFFLE: 'SHUFFLE', // 随机
  ONE: 'ONE' // 单曲循环
}

// 播放器
let audio

const store = proxy({
  playing: false,
  userId: null,
  volume: 1,
  cookies: null,
  audioState: {
    duration: 0,
    currentTime: 0,
    loadPercentage: 0,
  },
  playMode: PLAY_MODE.LOOP,
  playlistGroup: [
    {
      id: TOP_NEW_ID,
      creator: '网易云音乐',
      name: '云音乐新歌榜',
      coverImgUrl: 'http://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg?param=150y150',
      shuffleSongsIndex: [],
      songsHash: []
    }
  ],
  selectedPlaylistId: TOP_NEW_ID,
  song: null,
  syncPersistData() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(persistData => {
        if (persistData) {
          if (persistData.cookies) {
            api.setCookie(persistData.cookies)
          }
          Object.assign(store, persistData)
        }
        resolve(store)
      })
    })
  },
  updateAudioTime(currentTime) {
    if (audio) {
      audio.currentTime = currentTime
    }
    store.applyChange({ audioState: { ...state.audioState, currentTime }})
    if (!store.playing) {
      return store.togglePlaying()
    }
  },
  togglePlaying() {
    const { playing } = store
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    return store.applyChange({ playing: !playing })
  },
  updateVolume(volume) {
    audio.volume = volume
    return store.applyChange({ volume })
  },
  async playPrev() {
    let {playlist, songId} = getPlaylistBySongId()
    const song = await getSong(playlist, store.playMode, songId, -1)
    return store.applyChange({ song })
  },
  async playNext() {
    let {playlist, songId} = getPlaylistBySongId()
    const song = await getSong(playlist, store.playMode, songId)
    return store.applyChange({ song })
  },
  async updatePlayMode() {
    let modeKeys = Object.keys(PLAY_MODE)
    let modeKeyIndex = modeKeys.findIndex(key => PLAY_MODE[key] === store.playMode)
    let nextModeKeyIndex = (modeKeyIndex + 1 + modeKeys.length) % modeKeys.length
    let playMode = PLAY_MODE[modeKeys[nextModeKeyIndex]]
    return store.applyChange({ playMode })
  },
  async changePlaylist(playlistId) {
    const song = await loadSongWhenPlaylistChanged()
    return store.applyChange({
      selectedPlaylistId: playlistId,
      song,
    })
  },
  async likeSong() {
    const { song } = store
    if (!song) return Promise.reject("无选中歌曲")
    const res = await api.likeSong(song.id, true)
    if (res.code === 200) {
      const playlistGroup = await updateLikeSongsPlaylist()
      return store.applyChange({ playlistGroup, message: '收藏成功' })
    } else {
      throw new Error('收藏到我喜欢的音乐失败')
    }
  },
  async login(phone, password) {
    const res = await api.cellphoneLogin(phone, password)
    if (res.code === 200) {
      let {userId} = res.profile
      return store.applyChange({ userId })
    } else {
      throw new Error(res.msg)
    }
  },
  async loadRecommandAndUserPlaylists() {
    const playlists = await loadAllPlaylists()
    return store.applyChange({
      playlistGroup: [...store.playlistGroup, ...playlists]
    })
  },
  // 获取新歌榜
  async fetchTopNew() {
    const res = await api.getPlaylistDetail(TOP_NEW_ID)
    if (res.code === 200) {
      let playlist = tidyPlaylist(res.playlist)
      return store.applyChange({
        playlistGroup: [playlist, ...store.playlistGroup.slice(1)]
      })
    } else {
      throw new Error('获取新歌榜失败')
    }
  },
  popupInit() {
    return store
  },
  logout () {
    audio.pause()
    api.clearCookie()
    store.applyChange({
      playing: false,
      cookies: '',
      userId: null,
      playlistGroup: [],
    })
    store.bootstrap()
  },

  applyChange (change) {
    persist(change)
    Object.assign(store, change)
    return change
  },

  async bootstrap () {
    await store.syncPersistData()
    await store.fetchTopNew()
    if (!store.cookies) {
      await store.changePlaylist(store.playlistGroup[0].id)
    }
    if (store.userId) {
      const res = await api.loginRefresh()
      if (res.code === 200) {
        await loadAllPlaylists()
      } else if (res.code === 301) { // cookie 失效
        store.applyChange({
          userId: null,
          cookies: null,
          selectedPlaylistId: TOP_NEW_ID
        })
      }
    }
  },
  setCookie (cookies) {
    chrome.storage.sync.set({cookies})
    api.setCookie(cookies)
    return store.applyChange({cookies})
  }
})

export default store

function tidyPlaylist (playlist) {
  let {id, creator: {nickname: creator}, name, coverImgUrl, tracks} = playlist
  let {songsIndex: normalSongsIndex, songsHash} = tracksToSongs(tracks)
  let shuffleSongsIndex = shuffleArray(normalSongsIndex)
  return {id: Number(id), creator, name, songsCount: normalSongsIndex.length, coverImgUrl: coverImgUrl + IMAGE_CLIP, songsHash, normalSongsIndex, shuffleSongsIndex}
}

function tracksToSongs (tracks) {
  let songs = tracks.map(track => {
    let {id, name, al: {picUrl}, ar} = track
    return {id, name, picUrl: picUrl + IMAGE_CLIP, artists: compactArtists(ar)}
  })
  let songsHash = songs.reduce((songsHash, song) => {
    songsHash[song.id] = song
    return songsHash
  }, {})
  let songsIndex = songs.map(song => song.id)
  return {songsIndex, songsHash}
}

function compactArtists (artists) {
  return artists.map(artist => artist.name).join('/')
}

function getSong (playlist, playMode, currentSongId, dir = 1) {
  let {songsHash, shuffleSongsIndex, normalSongsIndex} = playlist
  let songsIndex = playMode === PLAY_MODE.SHUFFLE ? shuffleSongsIndex : normalSongsIndex
  let len = songsIndex.length
  let currentSongIndex = songsIndex.findIndex(index => index === currentSongId)
  let nextSongIndex = currentSongIndex === -1 ? 0 : (len + currentSongIndex + dir) % len
  let song = songsHash[songsIndex[nextSongIndex]]
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
      let {url} = res.data[0]
      song.url = url
      return song
    }
  })
}

function shuffleArray (array) {
  let _array = array.slice()
  for (let i = _array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_array[i], _array[j]] = [_array[j], _array[i]];
  }
  return _array
}

function loadRecommandSongsPlaylist (userId) {
  let playlist = {id: generateId(), creator: {nickname: '网易云音乐'}, name: '每日推荐歌曲'}
  return loadRecommandSongs(userId).then(songs => {
    playlist.tracks = songs
    playlist.coverImgUrl = songs[0].al.picUrl
    return tidyPlaylist(playlist)
  })
}

function generateId () {
  return Number(Math.random().toString().substr(3, 8))
}

function loadAllPlaylists () {
  let { userId } = store
  return Promise.all([loadRecommandSongsPlaylist(userId), loadUserPlaylist(userId)]).then(result => {
    let [recommendSongsPlaylist, userPlaylists] = result
    return [recommendSongsPlaylist, ...userPlaylists]
  })
}

function loadRecommandSongs (userId) {
  return api.getRecommendSongs(userId).then(res => {
    if (res.code === 200) {
      return res.recommend.map(song => {
        let {id, album: al, artists: ar} = song
        return  {id, al, ar}
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
        return result.filter(res => res.code === 200).map(res => tidyPlaylist(res.playlist))
      })
    } else {
      throw new Error('获取我的歌单失败')
    }
  })
}

function loadSongWhenPlaylistChanged ( _songId) {
  let {playlist, songId} = getPlaylistBySongId(_songId)
  return getSong(playlist, store.playMode, songId)
}

function getPlaylistBySongId (songId) {
  const {song, playlistGroup, selectedPlaylistId} = store
  songId = songId || (song ? song.id : TOP_NEW_ID)
  let playlist = playlistGroup.find(playlist => playlist.id === selectedPlaylistId)
  if (!playlist)  {
    playlist = playlistGroup[0]
    songId = TOP_NEW_ID
  }
  return {playlist, songId}
}

function updateLikeSongsPlaylist () {
  const {playlistGroup} = store
  let likeSongPlaylistIndex = 2
  let playlistId = playlistGroup[likeSongPlaylistIndex].id
  return api.getPlaylistDetail(playlistId).then(res => {
    if (res.code === 200) {
      let playlist = tidyPlaylist(res.playlist)
      playlistGroup[likeSongPlaylistIndex] = playlist
      return playlistGroup
    } else {
      throw new Error('刷新喜欢的音乐歌单失败')
    }
  })
}

function persist (change) {
  let toPersistDataKeys = Object.keys(change)
    .filter(key => OMIT_PERSIST_KEYS.indexOf(key) === -1)
  if (toPersistDataKeys.length === 0) return
  let toPersistData = toPersistDataKeys.reduce((acc, key) => {
    acc[key] = change[key]
    return acc
  }, {})
  chrome.storage.sync.set(toPersistData)
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
      let loadPercentage = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100
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
    console.log(e)
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
    audioState: newAudioState,
  })
}
