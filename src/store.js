import { extendObservable, action } from 'mobx'
import * as API from 'netease-music-api'

class Store {
  constructor() {
    extendObservable(this, {
      loading: false,
      isAuthed: false,
      palying: false,
      newSongs: [],

      auth: action((phone, password) => {
        this.loading = true
        API.cellphoneLogin(phone, password).then(() => {
          this.loading = false
          this.isAuthed = true
        })
      }),
      fetchNewSongs: action(() => {
        this.loading = true
        Promise.resolve().then(() => {
          this.newSongs = mockFetchNewSongs()
        })
        // API.getPersonalizedNewsongs().then((res) => {
        //   this.loading = false
        //   if (res.code === 200) {
        //     this.newSongs = res.result
        //   }
        // })
      })
    })
  }
}

function mockFetchNewSongs () {
  return [{ "id": 526468453, "type": 4, "name": "送别2017", "copywriter": null, "picUrl": null, "canDislike": false, "song": { "name": "送别2017", "id": 526468453, "position": 1, "alias": [], "status": 0, "fee": 0, "copyrightId": 627012, "disc": "", "no": 0, "artists": [{ "name": "窦唯", "id": 2515, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }], "album": { "name": "送别2017", "id": 37087156, "type": "EP/Single", "size": 1, "picId": 109951163095233412, "blurPicUrl": "http://p1.music.126.net/vyTLBL80gQPAqLMZhnr5-g==/109951163095233412.jpg", "companyId": 0, "pic": 109951163095233412, "picUrl": "http://p1.music.126.net/vyTLBL80gQPAqLMZhnr5-g==/109951163095233412.jpg", "publishTime": 1514736000007, "description": "", "tags": "", "company": "华宇世博", "briefDesc": "", "artist": { "name": "", "id": 0, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }, "songs": [], "alias": [], "status": 0, "copyrightId": 627012, "commentThreadId": "R_AL_3_37087156", "artists": [{ "name": "窦唯", "id": 2515, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }], "picId_str": "109951163095233412" }, "starred": false, "popularity": 0.0, "score": 0, "starredNum": 0, "duration": 475769, "playedNum": 0, "dayPlays": 0, "hearTime": 0, "ringtone": null, "crbt": null, "audition": null, "copyFrom": "", "commentThreadId": "R_SO_4_526468453", "rtUrl": null, "ftype": 0, "rtUrls": [], "copyright": 0, "mvid": 0, "bMusic": { "name": "", "id": 1402697236, "size": 7613588, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 128000, "playTime": 475769, "volumeDelta": 4.0 }, "mp3Url": null, "rtype": 0, "rurl": null, "hMusic": { "name": "", "id": 1402697234, "size": 19033905, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 320000, "playTime": 475769, "volumeDelta": 4.0 }, "mMusic": { "name": "", "id": 1402697235, "size": 11420360, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 192000, "playTime": 475769, "volumeDelta": 4.0 }, "lMusic": { "name": "", "id": 1402697236, "size": 7613588, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 128000, "playTime": 475769, "volumeDelta": 4.0 }, "privilege": { "id": 526468453, "fee": 0, "payed": 0, "st": 0, "pl": 320000, "dl": 320000, "sp": 7, "cp": 1, "subp": 1, "cs": false, "maxbr": 999000, "fl": 320000, "toast": false, "flag": 0, "preSell": false } }, "alg": "featured" }, { "id": 526472192, "type": 4, "name": "POWER (Live)", "copywriter": null, "picUrl": null, "canDislike": false, "song": { "name": "POWER (Live)", "id": 526472192, "position": 35, "alias": [], "status": 0, "fee": 8, "copyrightId": 539010, "disc": "2", "no": 18, "artists": [{ "name": "EXO", "id": 759509, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }], "album": { "name": "2017 SBS가요대전 Live", "id": 37085068, "type": "合集", "size": 35, "picId": 109951163094346630, "blurPicUrl": "http://p1.music.126.net/Bia0xK7V1KAyybo05W_rFQ==/109951163094346630.jpg", "companyId": 0, "pic": 109951163094346630, "picUrl": "http://p1.music.126.net/Bia0xK7V1KAyybo05W_rFQ==/109951163094346630.jpg", "publishTime": 1514390400007, "description": "", "tags": "", "company": "韩流电视首尔", "briefDesc": "", "artist": { "name": "", "id": 0, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }, "songs": [], "alias": [], "status": 1, "copyrightId": 539010, "commentThreadId": "R_AL_3_37085068", "artists": [{ "name": "V.A.", "id": 21138, "picId": 0, "img1v1Id": 0, "briefDesc": "", "picUrl": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "img1v1Url": "http://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg", "albumSize": 0, "alias": [], "trans": "", "musicSize": 0 }], "picId_str": "109951163094346630", "transNames": ["2017 SBS歌谣大战 Live合辑"] }, "starred": false, "popularity": 100.0, "score": 100, "starredNum": 0, "duration": 177840, "playedNum": 0, "dayPlays": 0, "hearTime": 0, "ringtone": null, "crbt": null, "audition": null, "copyFrom": "", "commentThreadId": "R_SO_4_526472192", "rtUrl": null, "ftype": 0, "rtUrls": [], "copyright": 2, "mvid": 5780108, "bMusic": { "name": "", "id": 1402051370, "size": 2846346, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 128000, "playTime": 177840, "volumeDelta": -2.0 }, "mp3Url": null, "rtype": 0, "rurl": null, "hMusic": { "name": "", "id": 1402051368, "size": 7115799, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 320000, "playTime": 177840, "volumeDelta": -2.0 }, "mMusic": { "name": "", "id": 1402051369, "size": 4269497, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 192000, "playTime": 177840, "volumeDelta": -2.0 }, "lMusic": { "name": "", "id": 1402051370, "size": 2846346, "extension": "mp3", "sr": 44100, "dfsId": 0, "bitrate": 128000, "playTime": 177840, "volumeDelta": -2.0 }, "privilege": { "id": 526472192, "fee": 8, "payed": 0, "st": 0, "pl": 128000, "dl": 0, "sp": 7, "cp": 1, "subp": 1, "cs": false, "maxbr": 320000, "fl": 128000, "toast": false, "flag": 0, "preSell": false } }, "alg": "featured" }]
}

const self = new Store()

export default self
