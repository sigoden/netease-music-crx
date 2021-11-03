export const MIGU_DOMAIN = 'https://m.music.migu.cn'

export async function getMiGuSong (name, artists) {
  const keyword = encodeURIComponent(name + ' ' + artists)
  const res = await fetch(`${MIGU_DOMAIN}/migu/remoting/scr_search_tag?keyword=${keyword}&pgc=1&rows=5&type=2`)
  const result = await res.json()
  const filterSong = song => {
    return !!song.mp3 && song.artist.split(', ').some(v => artists.includes(v.trim()))
  }
  const song = (result?.musics || []).filter(filterSong)[0]
  if (!song) throw new Error()
  return song.mp3
}
