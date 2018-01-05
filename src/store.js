import { extendObservable, action } from 'mobx'

import {
  TOP_NEW_ID,
  IMAGE_CLIP,
  STORAGE_KEY,
  PLAY_MODE
} from './constants'

const API = wrapedAPI()
const DEFAULT_STORAGE_DATA = {
  isAuthed: false, // 是否登录
  selectedPlaylistId: TOP_NEW_ID, // 上次播放的歌单
  selectedSongId: null,  // 上次播放的歌曲
  volume: 0.5, // 音量
  playMode: PLAY_MODE.LOOP, //  播放模式
  user: null
}

class Store {
  constructor() {
    let _this = this
    let storageData = getStorageData()
    extendObservable(_this, {
      loading: false,
      isAuthed: storageData.isAuthed,
      playing: false,
      volume: storageData.volume,
      playMode: storageData.playMode,
      selectedPlaylistId: storageData.selectedPlaylistId,
      selectedSongId: storageData.selectedSongId,
      user: storageData.user,
      song: null,
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
      togglePlaying: action(() => {
        _this.playing = !_this.playing
      }),
      updateVolume: action((volume) => {
        _this.volume = volume
      }),
      playPrev: action(() => {
        let playlist = _this.playlistGroup.find(playlist => playlist.id === _this.selectedPlaylistId)
        getSong(playlist, _this.playMode, _this.song.id, -1).then(song => {
          _this.selectedSongId = song.id
          _this.song = song
        })
      }),
      playNext: action(() => {
        let playlist = _this.playlistGroup.find(playlist => playlist.id === _this.selectedPlaylistId)
        getSong(playlist, _this.playMode, _this.song.id).then(song => {
          _this.selectedSongId = song.id
          _this.song = song
        })
      }),
      updatePlayMode: action(() => {
        let modeKeys = Object.keys(PLAY_MODE)
        let currentPlayMode = _this.playMode
        let modeKeyIndex = modeKeys.findIndex(key => PLAY_MODE[key] === currentPlayMode)
        let nextModeKeyIndex = (modeKeyIndex + 1 + modeKeys.length) % modeKeys.length
        _this.playMode = PLAY_MODE[modeKeys[nextModeKeyIndex]]
      }),
      changePlaylist: action((playlistId) => {
        if (playlistId === _this.selectedPlaylistId) {
          return
        }
        _this.selectedPlaylistId = playlistId
        return getSongOnChangePlaylist(_this)
      }),
      login: action((phone, password) => {
        _this.loading = true
        return API.cellphoneLogin(phone, password).then((res) => {
          _this.isAuthed = true
          let user = res.profile
          _this.user = user
          if (res.code === 200) {
            return loadPlaylists(_this, user)
          } else {
            throw new Error('登录失败')
          }
        }).catch(e => {
          console.log(e)
        })
      }),
      // 获取新歌榜
      fetchTopNew: action(() => {
        // mockGetPlaylistDetail().then(res => {
        return API.getPlaylistDetail(TOP_NEW_ID).then(res => {
          if (res.code === 200) {
            let playlist = tidyPlaylist(res.playlist)
            _this.playlistGroup[0] = playlist
            // 没有登录时，自动选择一首新歌播放
            if (!_this.isAuthed) {
              return _this.changePlaylist(playlist.id)
            }
          }
        }).catch(e => {
          console.log(e)
        })
      })
    })
  }
}

function getStorageData () {
  let storageRaw = localStorage.getItem(STORAGE_KEY) 
  let storageObj = storageRaw ? JSON.parse(storageRaw) : {}
  return Object.assign({}, DEFAULT_STORAGE_DATA, storageObj)
}

function tidyPlaylist (playlist) {
  let {id, creator: {nickname: creator}, name, coverImgUrl, tracks} = playlist
  let songsHash = tracksToSongsHash(tracks)
  let normalSongsIndex = Object.keys(songsHash).map(index => Number(index))
  let shuffleSongsIndex = shuffleArray(normalSongsIndex)
  return {id, creator, name, songsCount: normalSongsIndex.length, coverImgUrl: coverImgUrl + IMAGE_CLIP, songsHash, normalSongsIndex, shuffleSongsIndex}
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

function createRecommendSongsPlaylist (user) {
  let playlist = {id: generateId(), creator: '网易云音乐', name: '每日推荐歌曲'}
  return getRecommendSongs(user.userId).then(songs => {
    playlist.tracks = songs
    playlist.coverImgUrl = songs[0].al.picUrl
    return tidyPlaylist(playlist)
  })
}

function generateId () {
  return Math.random().toString().substr(3, 8)
}

function loadPlaylists (self, user) {
  return Promise.all([createRecommendSongsPlaylist(user), getUserPlaylist(user)]).then(result => {
    let [recommendSongsPlaylist, userPlaylists] = result
    self.playlistGroup.push(recommendSongsPlaylist)
    userPlaylists.forEach(playlist => {
      self.playlistGroup.push(playlist)
    })
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

function getUserPlaylist (user) {
  return API.getUserPlaylist(user.userId).then(res => {
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
  return getSong(playlist, self.playMode, songId).then(song => {
    self.selectedSongId = song.id
    self.song = song
  })
}

// popup 存在跨域，所以将请求抛给 background 中转
function wrapedAPI () {
  function proxy (func) {
    return function () {
      let args = Array.from(arguments) 
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'weapi',
          func,
          args
        }, (err, res) => {
          if (err) {
            return reject(err)
          } 
          return resolve(res)
        })
      })
    }
  }
  return {
    cellphoneLogin: proxy('cellphoneLogin'),
    getPlaylistDetail: proxy('getPlaylistDetail'),
    getUserPlaylist: proxy('getUserPlaylist'),
    getSongUrls: proxy('getSongUrls'),
    getRecommendSongs: proxy('getRecommendSongs'),
  }
}

export default new Store()
