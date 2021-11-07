import { proxy } from 'valtio'

import { loadData, saveData, sendToPopup } from './chrome'
import api from './api'
import { getKuWoSong } from './kuwo'
import { getMiGuSong } from './migu'

import {
  PLAY_MODE,
  IMAGE_CLIP,
  PLAYLIST_REC_SONGS,
  PLAYLIST_NEW_SONGS,
  PLAYLIST_TOP,
  PLAYLIST_TYPE,
  EMPTY_AUDIO_STATE,
  COMMON_PROPS,
  LEN_PLAYLIST_REC,
  logger,
  chunkArr,
  shuffleArr,
  race,
  randChinaIp,
} from '../utils'

// 缓存歌单
const playlistDetailStore = {}
// 缓存歌单内歌曲
const songsMapStore = {}
/**
 * 播放器
 * @type HTMLAudioElement
 */
let audio
// 播放状态
let audioState = { ...EMPTY_AUDIO_STATE, volumeMute: null }
// 持久化缓存信息
let persistData = null
// 上次刷新时间
let refreshAt = 0

const store = proxy({ ...COMMON_PROPS, dir: 1, chinaIp: null })

export async function bootstrap () {
  await persistLoad()
  await refreshStore()
  await detectOversea()
}

export function updateAudioTime (currentTime) {
  if (audio) {
    audio.currentTime = currentTime
  }
  audio.play()
}

export function togglePlaying () {
  let { playing } = store
  if (!audio) {
    return { playing }
  }
  if (playing) {
    audio.pause()
    playing = false
  } else {
    audio.play()
    playing = true
  }
  store.playing = playing
  persistSave()
  return { playing }
}

export function toggleMute () {
  if (store.volume === 0) {
    updateVolume(store.volumeMute || COMMON_PROPS.volume)
    store.volumeMute = null
  } else {
    store.volumeMute = store.volume
    updateVolume(0)
  }
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
  store.playing = true
  const { selectedSong, playing } = await loadAndPlaySong(store.selectedPlaylist, songId, false)
  return { selectedSong, playing }
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
  return loadAndPlaySong(selectedPlaylist, songId)
}

export async function loadSongsMap () {
  const { selectedPlaylist } = store
  if (!selectedPlaylist?.id) return {}
  let songsMap = songsMapStore[selectedPlaylist.id]
  if (songsMap) {
    return songsMap
  }
  const tracks = await loadTracks(selectedPlaylist.normalIndexes)
  songsMap = tracksToSongsMap(tracks)
  songsMapStore[selectedPlaylist.id] = songsMap
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
  if (!playlistId) throw new Error('无法定位当前歌单')
  const res = await api.likeSong(playlistId, selectedSong.id, true)
  if (res.code === 200) {
    refreshPlaylistDetails(playlistId)
    return { message: '收藏成功' }
  } else {
    throw new Error(res.message)
  }
}

export async function unlikeSong () {
  const { selectedSong, selectedPlaylist } = store
  if (!selectedSong) throw new Error('无选中歌曲')
  const deleteSongId = selectedSong.id
  const selectedPlaylistId = selectedPlaylist.id
  const nextSongId = getNextSongId(selectedPlaylist, deleteSongId)
  if (nextSongId === selectedSong.id) throw new Error('无法取消收藏歌单中的唯一一首歌曲')
  const res = await api.likeSong(selectedPlaylistId, deleteSongId, false)
  if (res.code === 200) {
    const playlist = store.playlists.find(v => v.id === selectedPlaylistId)
    const selectedPlaylist = await loadPlaylistDetails(playlist)
    const { selectedSong } = await loadAndPlaySong(selectedPlaylist, nextSongId)
    sendToPopup({ topic: 'changeSongsMap', songId: deleteSongId, op: 'remove' })
    return { selectedSong, selectedPlaylist, message: '取消收藏成功' }
  } else {
    throw new Error(res.message)
  }
}

export async function login (phone, password) {
  const res = await api.cellphoneLogin(phone, password)
  if (res.code === 200) {
    const { userId, vipType } = res.profile
    Object.assign(store, { userId, vip: vipType > 0 })
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

export async function refreshPlaylists () {
  const oldPlaylistIds = store.playlists.map(v => v.id)
  if (store.userId) {
    store.playlists = await loadPlaylists()
    await changePlaylist()
  } else {
    store.playlists = [...PLAYLIST_TOP, PLAYLIST_NEW_SONGS]
    await changePlaylist()
  }
  const newPlaylists = store.playlists
  for (const playlistId of oldPlaylistIds) {
    if (newPlaylists.findIndex(v => v.id === playlistId) === -1) {
      delete songsMapStore[playlistId]
      delete playlistDetailStore[playlistId]
    }
  }
  return getPopupData()
}

export function popupInit () {
  return getPopupData()
}

function persistSave () {
  const { volume, playMode, selectedPlaylist, selectedSong, chinaIp } = store
  const data = {
    volume,
    playMode,
    chinaIp,
    playlistId: selectedPlaylist?.id || null,
    songId: selectedSong?.id || null,
  }
  return saveData(data)
}

async function persistLoad () {
  const data = await loadData()
  if (data) {
    const {
      volume = COMMON_PROPS.volume,
      playMode = COMMON_PROPS.playMode,
      chinaIp = null,
      playlistId,
      songId,
    } = data
    logger.debug('persist.load', data)
    if (playlistId) {
      persistData = { playlistId }
      if (songId) persistData.songId = songId
    }
    Object.assign(store, { volume, playMode, chinaIp })
  }
}

function getPopupData () {
  const { userId, playing, volume, playMode, playlists, selectedPlaylist, selectedSong } = store
  return { userId, playing, volume, playMode, playlists, selectedPlaylist, selectedSong, audioState }
}

async function refreshStore () {
  logger.debug('refreshStore')
  await refreshLogin()
  await refreshPlaylists()
  refreshAt = Date.now()
}

async function refreshLogin () {
  const res = await api.loginRefresh()
  if (res.code !== 200) {
    await reset()
    return
  }
  if (store.userId === null) {
    const res = await api.getUser()
    if (res.code === 200 && res?.profile) {
      const { userId, vipType } = res.profile
      Object.assign(store, { userId, vip: vipType > 0 })
    } else {
      await reset()
    }
  }
}

async function reset () {
  logger.debug('reset', store)
  Object.assign(store, { ...COMMON_PROPS })
  await persistSave()
  await refreshPlaylists()
}

async function loadPlaylists () {
  const result = await Promise.all([loadRecommendResourcePlaylist(), loadUserPlaylist()])
  const [recommendResourcePlaylist, userPlaylists] = result
  return [...PLAYLIST_TOP, PLAYLIST_NEW_SONGS, PLAYLIST_REC_SONGS, ...recommendResourcePlaylist, ...userPlaylists]
}

async function loadRecommendResourcePlaylist () {
  try {
    const res = await api.getRecommendResource()
    if (res.code !== 200) {
      logger.error('loadRecommendResourcePlaylist.error', res.message)
      throw new Error(res.message)
    }
    return res.recommend.slice(0, LEN_PLAYLIST_REC).map(
      ({ id, picUrl, name }) => ({ id, picUrl: picUrl + IMAGE_CLIP, name, type: PLAYLIST_TYPE.RECOMMEND }),
    )
  } catch (err) {
    logger.error('loadRecommendResourcePlaylist.err', err)
    throw new Error('获取推荐歌单失败')
  }
}

async function loadUserPlaylist () {
  try {
    const res = await api.getUserPlaylist(store.userId)
    if (res.code !== 200) {
      logger.error('loadUserPlaylist.error', res.message)
      throw new Error(res.message)
    }
    return res.playlist.map(({ id, coverImgUrl, name, userId, specialType }) => {
      let type = PLAYLIST_TYPE.FAVORIATE
      if (userId === store.userId) {
        type = PLAYLIST_TYPE.CRATE
      }
      return { id, picUrl: coverImgUrl + IMAGE_CLIP, name, type, primary: specialType === 5 }
    })
  } catch (err) {
    logger.error('loadUserPlaylist.err', err)
    throw new Error('获取我的歌单失败')
  }
}

async function loadPlaylistDetails (playlist) {
  try {
    let cachedPlaylistDetail = playlistDetailStore[playlist.id]
    if (cachedPlaylistDetail) return cachedPlaylistDetail
    let normalIndexes = []
    const dealSongs = songs => {
      const tracks = songs.map(song => {
        const { id, name, album: al, artists: ar, duration, fee } = song
        return { id, name, al, ar, dt: duration, st: 0, fee }
      })
      const songsMap = tracksToSongsMap(tracks)
      normalIndexes = tracks.map(v => v.id)
      songsMapStore[playlist.id] = songsMap
    }
    if (playlist.id === PLAYLIST_REC_SONGS.id) {
      const res = await api.getRecommendSongs()
      if (res.code === 200) {
        dealSongs(res.recommend)
      } else {
        logger.error('getRecommendSongs.error', res.message)
        throw new Error(res.message)
      }
    } else if (playlist.id === PLAYLIST_NEW_SONGS.id) {
      const res = await api.discoveryNeSongs()
      if (res.code === 200) {
        dealSongs(res.data)
      } else {
        logger.error('discoveryNeSongs.error', res.message)
        throw new Error(res.message)
      }
    } else {
      const res = await api.getPlaylistDetail(playlist.id)
      if (res.code === 200) {
        delete songsMapStore[playlist.id]
        normalIndexes = res.playlist.trackIds.map(v => v.id)
      } else {
        logger.error('getPlaylistDetail.error', playlist.id, res.message)
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
      invalidIndexes: [],
      shuffleIndexes,
    }
    playlistDetailStore[playlist.id] = cachedPlaylistDetail
    return cachedPlaylistDetail
  } catch (err) {
    logger.error('loadPlaylistDetails.err', err)
    throw new Error(`获取歌单(${playlist.name})失败`)
  }
}

async function refreshPlaylistDetails (playlistId) {
  const playlist = store.playlists.find(v => v.id === playlistId)
  delete playlistDetailStore[playlistId]
  await loadPlaylistDetails(playlist)
  logger.debug('refreshPlaylistDetails', playlist.name)
}

async function loadAndPlaySong (playlistDetail, songId, failable = true) {
  const { normalIndexes, invalidIndexes } = playlistDetail
  let songsMap = songsMapStore[playlistDetail.id]
  if (!songsMap || !songsMap[songId]) {
    const tracks = await loadTracks([songId])
    songsMap = tracksToSongsMap(tracks)
  }
  const song = songsMap[songId]
  let url
  try {
    if (!song || !song.valid) {
      throw new Error('歌曲无法播放')
    } else if (song.st < 0 || (song.vip && !store.vip)) {
      try {
        url = await race([
          getKuWoSong(song.name, song.artists),
          getMiGuSong(song.name, song.artists),
        ])
      } catch {
        throw new Error('尝试第三方获取歌曲失败')
      }
    } else {
      const res = await api.getSongUrls([songId])
      if (res.code !== 200) {
        throw new Error(res.message)
      }
      url = res.data.map(v => v.url)[0]
      if (!url) {
        throw new Error('获取资源失败')
      }
      if (store.chinaIp) {
        url = url.replace(/(m\d+?)(?!c)\.music\.126\.net/, '$1c.music.126.net')
      }
    }
    const playing = store.playing
    await updateAudioSrc(url, playing)
    const change = { selectedPlaylist: playlistDetail, selectedSong: song, playing }
    Object.assign(store, change)
    persistSave()
    return change
  } catch (err) {
    logger.error('loadSongDetail.error', song.id, song.name, err.message)
    if (song) {
      song.valid = false
      sendToPopup({ topic: 'changeSongsMap', songId, op: 'invalid' })
    }
    invalidIndexes.push(songId)
    if (!failable || normalIndexes.length - invalidIndexes.length < 1) {
      throw new Error('歌曲无法播放')
    }
    const newSongId = getNextSongId(playlistDetail, songId)
    return loadAndPlaySong(playlistDetail, newSongId, failable)
  }
}

async function loadTracks (ids) {
  const chunkIds = chunkArr(ids, 250)
  const chunkTracks = await Promise.all(chunkIds.map(async ids => {
    const res = await api.getSongDetail(ids)
    if (res.code === 200) {
      const { songs, privileges } = res
      return songs.map((song, index) => {
        song.st = privileges[index].st
        return song
      })
    } else {
      logger.error('getSongDetail.error', res.message)
      throw new Error(res.message)
    }
  }))
  return chunkTracks.flatMap(v => v)
}

async function playNextSong () {
  const { selectedPlaylist } = store
  let songId = store.selectedSong.id
  if (store.playMode !== PLAY_MODE.ONE) {
    songId = getNextSongId(selectedPlaylist, songId)
  }
  const { selectedSong, playing } = await loadAndPlaySong(selectedPlaylist, songId)
  return { selectedSong, playing }
}

function getNextSongId (playlistDetail, songId) {
  const { playMode, dir } = store
  const songsIndex = playMode === PLAY_MODE.SHUFFLE ? playlistDetail.shuffleIndexes : playlistDetail.normalIndexes
  const len = songsIndex.length
  const currentIndex = songsIndex.findIndex(v => v === songId)
  let nextIndex = currentIndex
  if (dir === 1) {
    if (currentIndex === -1) {
      nextIndex = 0
    } else if (currentIndex === len - 1) {
      nextIndex = 0
    } else {
      nextIndex = currentIndex + 1
    }
  } else {
    if (currentIndex === -1) {
      nextIndex = len - 1
    } else if (currentIndex === 0) {
      nextIndex = len - 1
    } else {
      nextIndex = currentIndex - 1
    }
  }
  return songsIndex[nextIndex]
}

async function detectOversea () {
  const selectedPlaylistId = store.selectedPlaylist.id
  if (PLAYLIST_TOP[0].id !== selectedPlaylistId) {
    return
  }
  const songsMap = await loadSongsMap()
  const ids = Object.keys(songsMap)
  const ids2 = ids.filter(id => songsMap[id].st === -100)
  if (ids2.length / ids.length < 0.25) {
    if (!store.chinaIp) return
    logger.info('Oversea removed')
    store.chinaIp = null
  } else {
    logger.info('Oversea detected')
    store.chinaIp = randChinaIp()
  }
  delete songsMapStore[selectedPlaylistId]
  await persistSave()
  await refreshStore()
}

function setupAudio () {
  globalThis.audio = audio
  audio.volume = store.volume
  audio.onprogress = () => {
    if (audio.buffered.length) {
      const loadPercentage = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100
      updateAudioState({
        loadPercentage,
      })
    }
  }
  audio.oncanplay = () => {
    updateAudioState({
      duration: audio.duration,
    })
  }
  audio.onabort = () => {
    updateAudioState({ ...EMPTY_AUDIO_STATE })
  }
  audio.onended = async () => {
    updateAudioState({ ...EMPTY_AUDIO_STATE })
    const change = await playNextSong()
    sendToPopup({ topic: 'sync', change })
  }
  audio.ontimeupdate = () => {
    updateAudioState({
      currentTime: audio.currentTime,
    })
  }
}
async function updateAudioSrc (src, playing) {
  if (audio) {
    audio.src = src
  } else {
    audio = new Audio(src)
    setupAudio()
  }
  if (playing) {
    audio.autoplay = true
  } else {
    audio.autoplay = false
  }
  return new Promise((resolve, reject) => {
    audio.onerror = () => {
      return reject(audio.error)
    }
    audio.onloadedmetadata = () => {
      console.log('onloadedmetadata')
      return resolve()
    }
  })
}

function updateAudioState (state) {
  audioState = { ...audioState, ...state }
  sendToPopup({ topic: 'audioState', audioState })
}

function tracksToSongsMap (tracks) {
  const songs = tracks.map(track => {
    const { id, name, al: { picUrl }, ar, dt, st = 0, fee } = track
    return {
      id,
      name,
      valid: true,
      st,
      vip: !(fee === 0 || fee === 8),
      picUrl: picUrl + IMAGE_CLIP,
      artists: ar.map(v => v.name).join(' & '),
      duration: dt,
    }
  })
  const songsMap = songs.reduce((songsMap, song) => {
    songsMap[song.id] = song
    return songsMap
  }, {})
  return songsMap
}
setInterval(async () => {
  await refreshLogin()
  if (Date.now() - refreshAt > 13 * 60 * 60 * 1000) {
    await refreshStore()
  }
}, 33 * 60 * 1000)

api.code301 = reset

globalThis.store = store
globalThis.songsMapStore = songsMapStore
globalThis.playlistDetailStore = playlistDetailStore
globalThis.refreshStore = refreshStore

export default store
