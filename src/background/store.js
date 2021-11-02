import { proxy } from 'valtio'
import { subscribeKey } from 'valtio/utils'
import api from './api'

import {
  PLAY_MODE,
  IMAGE_CLIP,
  PLAYLIST_REC_SONGS,
  PLAYLIST_TOP,
  PLAYLIST_TYPE,
  EMPTY_AUDIO_STATE,
  COMMON_PROPS,
  log,
  chunkArr,
  shuffleArr
} from '../utils'

// 推荐歌单数量
const LEN_PLAYLIST_REC = 5

// 播放器
let audio
// 播放状态
let audioState = { ...EMPTY_AUDIO_STATE }
// 上次加载推荐歌单时间
let lastLoadAt = 0
// 点播
let isForcePlay = false
// 持久化缓存信息
let persistData = null
// 缓存歌单
const playlistDetailStore = {}
// 缓存歌单内歌曲
const songsStore = {}

const store = proxy({ ...COMMON_PROPS })

export async function bootstrap () {
  await refreshLogin()
  await persistLoad()
  await reload()
}

export function updateAudioTime (currentTime) {
  if (audio) {
    audio.currentTime = currentTime
  }
  audio.play()
}

export function togglePlaying () {
  let { playing } = store
  if (playing) {
    audio.pause()
  } else {
    audio.play()
  }
  playing = !playing
  store.playing = playing
  return { playing }
}

export function updateVolume (volume) {
  audio.volume = volume
  store.volume = volume
  persistSave()
  return { volume }
}

export async function playPrev () {
  store.dir = -1
  return playNextSong()
}

export async function playNext () {
  store.dir = 1
  return playNextSong()
}

export async function playSong (songId) {
  isForcePlay = true
  const newSong = await loadSongDetail(store.selectedPlaylist, songId, false)
  return updateSelectedSong(newSong)
}

export async function updatePlayMode () {
  const modeKeys = Object.keys(PLAY_MODE)
  const modeKeyIndex = modeKeys.findIndex(key => PLAY_MODE[key] === store.playMode)
  const nextModeKeyIndex = (modeKeyIndex + 1 + modeKeys.length) % modeKeys.length
  const playMode = PLAY_MODE[modeKeys[nextModeKeyIndex]]
  store.playMode = playMode
  persistSave()
  return { playMode }
}

export async function changePlaylist (playlistId) {
  let songId
  if (!playlistId) {
    if (persistData) {
      playlistId = persistData.playlistId
      songId = persistData.songId
      persistData = null
    }
  }
  let playlist = store.playlists.find(playlist => playlist.id === playlistId)
  if (!playlist) playlist = store.playlists[0]
  const selectedPlaylist = await loadPlaylistDetails(playlist)
  if (!selectedPlaylist.normalIndexes.find(v => v === songId)) {
    const songsIndex = store.playMode === PLAY_MODE.SHUFFLE ? selectedPlaylist.shuffleIndexes : selectedPlaylist.normalIndexes
    songId = songsIndex[0]
  }
  const selectedSong = await loadSongDetail(selectedPlaylist, songId, true)
  const change = { selectedPlaylist, selectedSong }
  Object.assign(store, change)
  persistSave()
  return change
}

export async function loadSongsMap () {
  const { selectedPlaylist } = store
  if (!selectedPlaylist?.id) return {}
  let songsMap = songsStore[selectedPlaylist.id]
  if (songsMap) {
    return songsMap
  }
  const tracks = await loadTracks(selectedPlaylist.normalIndexes)
  songsMap = tracksToSongsMap(tracks)
  songsStore[selectedPlaylist.id] = songsMap
  return songsMap
}

export async function likeSong (playlistId) {
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
    return { message: '收藏成功' }
  } else {
    throw new Error('收藏歌曲失败')
  }
}

export async function unlikeSong () {
  const { selectedSong, selectedPlaylist } = store
  if (!selectedSong) throw new Error('无选中歌曲')
  const nextSongId = getNextSongId(selectedPlaylist, selectedSong.id)
  if (nextSongId === selectedSong.id) throw new Error('取消收藏歌曲失败')
  const res = await api.likeSong(selectedPlaylist.id, selectedSong.id, false)
  if (res.code === 200) {
    const { selectedSong, selectedPlaylist } = await refreshPlaylistDetail(nextSongId)
    const change = { selectedPlaylist, selectedSong }
    Object.assign(store, change)
    persistSave()
    return { ...change, message: '取消收藏成功' }
  } else {
    throw new Error('取消收藏歌曲失败')
  }
}

export async function login (phone, password) {
  const res = await api.cellphoneLogin(phone, password)
  if (res.code === 200) {
    const { userId } = res.profile
    store.userId = userId
    return { userId, message: '登录成功' }
  } else {
    throw new Error(res.message)
  }
}

export async function captchaSent (phone) {
  const res = await api.captchaSent(phone)
  if (res.code === 200) {
    return { message: '短信发送成功' }
  } else {
    throw new Error(res.message)
  }
}

export async function logout () {
  await api.logout()
  await reset()
}

export async function reload () {
  lastLoadAt = Date.now()
  const oldPlaylistIds = store.playlists.map(v => v.id)
  if (store.userId) {
    store.playlists = await loadPlaylists()
    await changePlaylist()
  } else {
    store.playlists = PLAYLIST_TOP
    await changePlaylist()
  }
  const newPlaylists = store.playlists
  for (const playlistId of oldPlaylistIds) {
    if (newPlaylists.findIndex(v => v.id === playlistId) === -1) {
      delete songsStore[playlistId]
      delete playlistDetailStore[playlistId]
    }
  }
  log('reload', store)
  return getPopupData()
}

export function popupInit () {
  return getPopupData()
}

export function sendToPopup (obj) {
  chrome.runtime.sendMessage(obj)
}

function persistSave () {
  const { volume, playMode, selectedPlaylist, selectedSong } = store
  const data = { volume, playMode, playlistId: selectedPlaylist?.id || null, songId: selectedSong?.id || null }
  return new Promise(resolve => {
    chrome.storage.sync.set(data, resolve)
  })
}

function persistLoad () {
  return new Promise((resolve) => {
    chrome.storage.sync.get(data => {
      if (data) {
        const { volume = COMMON_PROPS.volume, playMode = COMMON_PROPS.playMode, playlistId, songId } = data
        log('persist.load', data)
        if (playlistId) {
          persistData = { playlistId }
          if (songId) persistData.songId = songId
        }
        Object.assign(store, { volume, playMode })
      }
      resolve()
    })
  })
}

function getPopupData () {
  const { userId, playing, volume, playMode, playlists, selectedPlaylist, selectedSong } = store
  return { userId, playing, volume, playMode, playlists, selectedPlaylist, selectedSong, audioState }
}

async function refreshLogin () {
  await api.loginRefresh()
  const res = await api.getUser()
  if (res.code === 200) {
    const { userId } = res.profile
    store.userId = userId
  } else {
    await reset()
  }
}

async function reset () {
  Object.assign(store, { ...COMMON_PROPS })
  await persistSave()
  await reload()
  log('reset', store)
}

async function loadPlaylists () {
  const result = await Promise.all([loadRecommendResourcePlaylist(), loadUserPlaylist()])
  const [recommendResourcePlaylist, userPlaylists] = result
  return [...PLAYLIST_TOP, PLAYLIST_REC_SONGS, ...recommendResourcePlaylist, ...userPlaylists]
}

async function refreshPlaylistDetail (songId) {
  const playlist = store.playlists.find(v => v.id === store.selectedPlaylist.id)
  const selectedPlaylist = await loadPlaylistDetails(playlist)
  const selectedSong = await loadSongDetail(selectedPlaylist, songId, true)
  return { selectedPlaylist, selectedSong }
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

async function loadPlaylistDetails (playlist) {
  try {
    let cachedPlaylistDetail = playlistDetailStore[playlist.id]
    if (cachedPlaylistDetail) return cachedPlaylistDetail
    let tracks
    let normalIndexes = []
    let invalidIndexes = []
    if (playlist.id === PLAYLIST_REC_SONGS.id) {
      const res = await api.getRecommendSongs()
      if (res.code === 200) {
        tracks = res.recommend.map(song => {
          const { id, name, album: al, artists: ar, duration } = song
          return { id, name, al, ar, dt: duration }
        })
        normalIndexes = tracks.map(v => v.id)
        const songsMap = tracksToSongsMap(tracks)
        invalidIndexes = normalIndexes.filter(id => !songsMap[id].valid)
        songsStore[playlist.id] = songsMap
      } else {
        log('getRecommendSongs.error', res.message)
        throw new Error(res.message)
      }
    } else {
      const res = await api.getPlaylistDetail(playlist.id)
      if (res.code === 200) {
        normalIndexes = res.playlist.trackIds.map(v => v.id)
      } else {
        log('getPlaylistDetail.error', playlist.id, res.message)
        throw new Error(res.message)
      }
    }
    const { id, name, type } = playlist
    const shuffleIndexes = shuffleArr(normalIndexes)
    cachedPlaylistDetail = {
      id,
      name,
      type,
      normalIndexes,
      invalidIndexes,
      shuffleIndexes
    }
    playlistDetailStore[playlist.id] = cachedPlaylistDetail
    return cachedPlaylistDetail
  } catch {
    throw new Error('获取歌单失败')
  }
}

async function loadSongDetail (playlistDetail, songId, retry) {
  const { normalIndexes, invalidIndexes } = playlistDetail
  let songsMap = songsStore[playlistDetail.id]
  if (!songsMap || !songsMap[songId]) {
    const tracks = await loadTracks([songId])
    songsMap = tracksToSongsMap(tracks)
  }
  const song = songsMap[songId]
  try {
    if (!song.valid) {
      throw new Error('无法获取播放链接')
    } else {
      const res = await api.getSongUrls([songId])
      if (res.code !== 200) {
        throw new Error(res.message)
      }
      const url = res.data.map(v => v.url)[0]
      if (!url) {
        throw new Error('无法获取播放链接')
      }
      song.url = url
    }
  } catch {
    song.valid = false
    invalidIndexes.push(songId)
    if (!retry || normalIndexes.length - invalidIndexes.length < 1) {
      throw new Error('无法播放歌曲')
    }
    const newSongId = getNextSongId(playlistDetail, songId)
    return loadSongDetail(playlistDetail, newSongId, retry)
  }
  return song
}

async function loadTracks (ids) {
  const chunkIds = chunkArr(ids, 250)
  const chunkTracks = await Promise.all(chunkIds.map(async ids => {
    const res = await api.getSongDetail(ids)
    if (res.code === 200) {
      return res.songs
    } else {
      log('getSongDetail.error', res.message)
      throw new Error(res.message)
    }
  }))
  return chunkTracks.flatMap(v => v)
}

async function playNextSong () {
  const { selectedSong, selectedPlaylist } = store
  let songId = selectedSong.id
  if (store.playMode !== PLAY_MODE.ONE) {
    songId = getNextSongId(selectedPlaylist, selectedSong.id)
  }
  const newSong = await loadSongDetail(selectedPlaylist, songId, true)
  return updateSelectedSong(newSong)
}

function getNextSongId (playlistDetail, songId) {
  const { playMode, dir } = store
  isForcePlay = false
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? playlistDetail.shuffleIndexes : playlistDetail.normalIndexes
  const len = songsIndex.length
  const currentIndex = songsIndex.findIndex(v => v === songId)
  let nextIndex = currentIndex
  if (dir === 1) {
    if (currentIndex === len - 1) {
      nextIndex = 0
    } else {
      nextIndex = currentIndex + 1
    }
  } else {
    if (currentIndex === 0) {
      nextIndex = len - 1
    } else {
      nextIndex = currentIndex - 1
    }
  }
  return songsIndex[nextIndex]
}

function createAudio (url) {
  const audio = new Audio(url)
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
  audio.onended = async () => {
    updateAudioState({ ...EMPTY_AUDIO_STATE })
    const change = await playNextSong()
    sendToPopup(change)
  }
  audio.onerror = async () => {
    log('audio.error', url, audio.error.message)
    if (isForcePlay) {
      sendToPopup({ message: '歌曲无法该播放', isErr: true })
    } else {
      const change = await playNextSong()
      sendToPopup(change)
    }
  }
  audio.ontimeupdate = () => {
    updateAudioState({
      currentTime: audio.currentTime
    })
  }
  return audio
}

function updateAudioState (state) {
  audioState = { ...audioState, ...state }
  sendToPopup({ audioState })
}

async function updateSelectedSong (selectedSong) {
  const change = { selectedSong, playing: true }
  Object.assign(store, change)
  persistSave()
  return change
}

function tracksToSongsMap (tracks) {
  const songs = tracks.map(track => {
    const { id, name, al: { picUrl }, ar, dt, noCopyrightRcmd } = track
    return {
      id,
      name,
      valid: !noCopyrightRcmd,
      picUrl: picUrl + IMAGE_CLIP,
      artists: ar.map(v => v.name).join('/'),
      duration: dt
    }
  })
  const songsMap = songs.reduce((songsMap, song) => {
    songsMap[song.id] = song
    return songsMap
  }, {})
  return songsMap
}

subscribeKey(store, 'selectedSong', song => {
  if (!song) {
    audio?.pause()
    return
  }
  if (audio) {
    audio.src = song.url
  } else {
    audio = createAudio(song.url)
  }
  if (store.playing) {
    audio.autoplay = true
  } else {
    audio.autoplay = false
  }
  if (Date.now() - lastLoadAt > 86400000) {
    log('daily.bootstrap')
    bootstrap()
  }
})

api.code301 = reset

export default store
