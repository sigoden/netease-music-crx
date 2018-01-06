import {
  observable,
  action,
  observe,
  extendObservable,
  toJS,
} from 'mobx'

import * as API from './api'

import {
  TOP_NEW_ID,
  IMAGE_CLIP,
  PLAY_MODE,
  OMIT_PERSIST_KEYS,
} from '../constants'


// 播放器
let audio

class Store {
  @observable playing = false
  @observable userId = null
  @observable volume = 1
  @observable audioState = {
    duration: 0,
    currentTime: 0,
    buffered: 0,
  }
  @observable playMode = PLAY_MODE.LOOP
  @observable errorMessage = ''

  @observable playlistGroup = [
    {
      id: TOP_NEW_ID,
      creator: '网易云音乐',
      name: '云音乐新歌榜',
      coverImgUrl: 'http://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg?param=150y150',
      shuffleSongsIndex: [],
      songsHash: []
    }
  ]
  @observable selectedPlaylistId = TOP_NEW_ID
  @observable song = null

  @action syncPersistData = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(persistData => {
        if (persistData) {
          if (persistData.cookies) {
            API.setCookie(persistData.cookies)
          }
          extendObservable(self, persistData)
        }
        resolve(self)
      })
    })
  } 

  @action updateAudioCurrentTime = (currentTime) => {
    if (audio) {
      audio.currentTime = currentTime
    }
    return self.applyChange({
      audioState: Object.assign(toJS(self.audioState), {currentTime})
    }).then(() => {
      if (!self.playing) {
        return self.togglePlaying()
      }
    })
  }

  @action togglePlaying = () => {
    if (self.playing) {
      audio.pause()
    } else {
      audio.play()
    }
    return self.applyChange({
      playing: !self.playing
    })
  }
  @action updateVolume = (volume) => {
    audio.volume = self.volume
    return self.applyChange({
      volume
    })
  }
  @action playPrev = () => {
    let playlist = self.playlistGroup.find(playlist => playlist.id === self.selectedPlaylistId)
    return getSong(playlist, self.playMode, self.song.id, -1).then(song => {
      return self.applyChange({
        song
      })
    })
  }
  @action playNext = () => {
    let playlist = self.playlistGroup.find(playlist => playlist.id === self.selectedPlaylistId)
    return getSong(playlist, self.playMode, self.song.id).then(song => {
      return self.applyChange({
        song
      })
    })
  }
  @action updatePlayMode = () => {
    let modeKeys = Object.keys(PLAY_MODE)
    let currentPlayMode = self.playMode
    let modeKeyIndex = modeKeys.findIndex(key => PLAY_MODE[key] === currentPlayMode)
    let nextModeKeyIndex = (modeKeyIndex + 1 + modeKeys.length) % modeKeys.length
    let playMode = PLAY_MODE[modeKeys[nextModeKeyIndex]]
    return self.applyChange({
      playMode 
    })
  }
  @action changePlaylist = (playlistId) => {
    return getSongOnChangePlaylist(self).then(song => {
      return self.applyChange({
        selectedPlaylistId: playlistId,
        song
      })
    })
  }
  @action login = (phone, password) => {
    return API.cellphoneLogin(phone, password).then((res) => {
      if (res.code === 200) {
        let {userId} = res.profile
        return self.applyChange({
          userId
        })
      } else {
        return self.applyChange({
          errorMessage: res.msg
        })
      }
    })
  }
  @action loadRecommandAndUserPlaylists = () => {
    return loadRecommandAndUserPlaylists(self).then(playlists => {
      return self.applyChange({
        playlistGroup: [...self.playlistGroup, ...playlists]
      })
    })
  }
  // 获取新歌榜
  @action fetchTopNew = () => {
    return API.getPlaylistDetail(TOP_NEW_ID).then(res => {
      if (res.code === 200) {
        let playlist = tidyPlaylist(res.playlist)
        return self.applyChange({
          playlistGroup: [playlist, ...self.playlistGroup.slice(1)]
        })
      } else {
        throw new Error('获取新歌榜失败')
      }
    })
  }
  // popup 获取初始化数据
  @action popupInit () {
    return Promise.resolve(toJS(self))
  }
  @action logout () {
    audio.pause()
    document.cookie = ''
    return self.applyChange({
      playing: false,
      cookies: '',
      userId: null,
      playlistGroup: self.playlistGroup.slice(0, 1),
    }).then(() => {
      return self.bootstrap()
    })
  }
  /**
   * - 更新 self
   * - 持久化
   * - 通知 delegatedStore 变更 (返回值)
   */
  applyChange (change) {
    extendObservable(self, change)
    persist(change)
    return Promise.resolve(change)
  }

  bootstrap () {
    return self.syncPersistData().then(() => {
      return self.fetchTopNew().then(() => {
        if (!self.cookies) {
          return self.changePlaylist(self.playlistGroup[0].id)
        }
      })
    }).then(() => {
      if (self.userId) {
        return API.loginRefresh().then(res => {
          if (res.code === 200) {
            return self.loadRecommandAndUserPlaylists(self)
          } else if (res.code === 301) {
            return self.applyChange({
              userId: null,
              cookies: null,
              selectedPlaylistId: TOP_NEW_ID
            })
          }
        })
      }
    })
  }

  setCookie (cookies) {
    chrome.storage.sync.set({cookies})
    API.setCookie(cookies)
    return self.applyChange({
      cookies
    })
  }
}

function tidyPlaylist (playlist) {
  let {id, creator: {nickname: creator}, name, coverImgUrl, tracks} = playlist
  let songsHash = tracksToSongsHash(tracks)
  let normalSongsIndex = Object.keys(songsHash).map(index => Number(index))
  let shuffleSongsIndex = shuffleArray(normalSongsIndex)
  return {id: Number(id), creator, name, songsCount: normalSongsIndex.length, coverImgUrl: coverImgUrl + IMAGE_CLIP, songsHash, normalSongsIndex, shuffleSongsIndex}
}

function tracksToSongsHash (tracks) {
  return tracks.map(track => {
    let {id, al: {name, picUrl}, ar} = track
    return {id, name, picUrl: picUrl + IMAGE_CLIP, artists: compactArtists(ar)}
  }).reduce((songsHash, song) => {
    songsHash[song.id] = song
    return songsHash
  }, {})
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
  return updateSongWithUrl(song)
}

function updateSongWithUrl (song) {
  return API.getSongUrls([song.id]).then(res => {
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

function createRecommendSongsPlaylist (userId) {
  let playlist = {id: generateId(), creator: '网易云音乐', name: '每日推荐歌曲'}
  return getRecommendSongs(userId).then(songs => {
    playlist.tracks = songs
    playlist.coverImgUrl = songs[0].al.picUrl
    return tidyPlaylist(playlist)
  })
}

function generateId () {
  return Number(Math.random().toString().substr(3, 8))
}

function loadRecommandAndUserPlaylists (self) {
  let userId = self.userId
  return Promise.all([createRecommendSongsPlaylist(userId), getUserPlaylist(userId)]).then(result => {
    let [recommendSongsPlaylist, userPlaylists] = result
    return [recommendSongsPlaylist, ...userPlaylists]
  })
}

function getRecommendSongs (userId) {
  return API.getRecommendSongs(userId).then(res => {
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

function getUserPlaylist (userId) {
  return API.getUserPlaylist(userId).then(res => {
    if (res.code === 200) {
      return Promise.all(res.playlist.map(playlist => {
        return API.getPlaylistDetail(playlist.id)
      })).then(result => {
        return result.filter(res => res.code === 200).map(res => tidyPlaylist(res.playlist))
      })
    } else {
      throw new Error('获取我的歌单失败')
    }
  })
}

function getSongOnChangePlaylist (self, songId) {
  let playlist = self.playlistGroup.find(playlist => playlist.id === self.selectedPlaylistId)
  if (!playlist)  {
    playlist = self.playlistGroup[0]
    songId = TOP_NEW_ID
  }
  return getSong(playlist, self.playMode, songId)
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


let self = new Store()

observe(self, 'song', (change) => {
  if (audio) {
    audio.src = self.song.url
  } else {
    audio = new Audio(self.song.url)
  }
  if (self.playing) {
    audio.autoplay = true
  }
  audio.onprogress = (e) => {
    if (audio.buffered.length) {  // Player has started
      let buffered = audio.buffered.end(audio.buffered.length - 1)
      if (buffered >= 100) {
        buffered = 100
      }
      dispatchAudioState({
        buffered
      })
    }
  }
  audio.oncanplay = () => {
    audio.onprogress()
    dispatchAudioState({
      duration: audio.duration
    })
  }
  audio.onabort = () => {
    dispatchAudioState({
      currentTime: 0
    })
  }
  audio.onend = () => {
    dispatchAudioState({
      currentTime: 0
    })
    self.playNext()
  }
  audio.onerror = (e) => {
    console.log(e)
  }
  audio.ontimeupdate = () => {
    dispatchAudioState({
      currentTime: audio.currentTime
    })
  }
})

function dispatchAudioState (state) {
  let audioState = extendObservable(self.audioState, state)
  self.applyChange({
    audioState,
  }).then(() => {
    chrome.runtime.sendMessage({
      action: 'audioState',
      audioState: toJS(audioState)
    })
  })
}


export default self
