import { extendObservable, action } from 'mobx'
import * as API from 'netease-music-api'

// 网易新歌榜的歌单 ID
const TOP_NEW_ID = '3779629' 

// 剪裁图片
const IMAGE_CLIP = '?param=150y150'

// 播放模式
const PLAY_MODE = {
  LOOP: 'loop', // 循环
  SHUFFLE: 'shuffle', // 随机
  ONE: 'one' // 单曲循环
}

// localStorage 键名
const STORAGE_KEY = 'data'

const DEFAULT_STORAGE_DATA = {
  isAuthed: false, // 是否登录
  selectedPlaylistId: TOP_NEW_ID, // 上次播放的歌单
  selectedSongId: null,  // 上次播放的歌曲
  playMode: PLAY_MODE.LOOP //  播放模式
}

class Store {
  constructor() {
    let _this = this
    let storageData = getStorageData()
    extendObservable(_this, {
      loading: false,
      isAuthed: storageData.isAuthed,
      playing: false,
      playMode: storageData.playMode,
      selectedPlaylistId: storageData.selectedPlaylistId,
      selectedSongId: storageData.selectedSongId,
      song: null,
      playlistGroup: [
        {
          id: TOP_NEW_ID,
          creator: '网易云音乐',
          name: '云音乐新歌榜',
          coverImgUrl: 'http://p1.music.126.net/N2HO5xfYEqyQ8q6oxCw8IQ==/18713687906568048.jpg?param=150y150',
          songs: []
        }
      ],
      // 播放/暂停
      togglePlaying: action(() => {
        _this.playing = !_this.playing
      }),
      playPrev: action(() => {

      }),
      playNext: action(() => {

      }),
      auth: action((phone, password) => {
        _this.loading = true
        API.cellphoneLogin(phone, password).then(() => {
          _this.loading = false
          _this.isAuthed = true
        })
      }),
      // 获取新歌榜
      fetchTopNew: action(() => {
        // mockGetPlaylistDetail().then(res => {
        API.getPlaylistDetail(TOP_NEW_ID).then(res => {
          console.log(res)
          if (res.code === 200) {
            let playlist = tidyPlaylist(res.playlist)
            _this.playlistGroup[0] = playlist
            // 没有登录时，自动选择一首新歌播放
            if (!_this.isAuthed) {
              _this.selectedPlaylistId = playlist.id
              // let songIndex = Math.floor(Math.random() * playlist.songs.length)
              let songIndex = 0
              let song = playlist.songs[songIndex]
              updateSongWithUrl(song).then(song => {
                _this.song = song
              })
            }
          }
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
  return {id, creator, name, coverImgUrl: coverImgUrl + IMAGE_CLIP, songs: tracksToSongs(tracks)}
}

function tracksToSongs (tracks) {
  return tracks.map(track => {
    let {id, al: {name, picUrl}, ar} = track
    return {id, name, picUrl: picUrl + IMAGE_CLIP, artists: compactArtists(ar)}
  })
}

function compactArtists (artists) {
  return artists.map(artist => artist.name).join('/')
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

const self = new Store()

export default self
