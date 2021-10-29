import React, { useState } from 'react'
import { useSnapshot } from 'valtio'
import store from './store'
import classNames from 'classnames'
import './Login.css'

export default function Login () {
  const snap = useSnapshot(store)
  const [state, setState] = useState({
    phone: '',
    password: '',
    collapsed: true
  })
  const formFieldUpdate = (field, value) => {
    setState({ ...state, [field]: value })
  }
  const submit = (e) => {
    e.preventDefault()
    const { phone, password } = state
    return snap.login(phone, password).then(() => {
      return snap.loadPlaylists()
    }).catch(e => {})
  }
  return (
    <div>
      <div className={classNames('text-center border', { 'd-none': !state.collapsed })}>
        <div className="m-3">
          <button className="btn btn-link" onClick={() => {
            this.setState({
              collapsed: false
            })
          }}>登录</button>
          获取每日推荐和我的歌单
        </div>
      </div>
      <div className={classNames('login-form', { 'd-none': state.collapsed })}>
        <form className="form-inline flex-nowrap mx-2 my-3" onSubmit={e => submit(e)}>
          <div className="form-group mb-0">
            <label className="sr-only">手机号</label>
            <input type="text" className="form-control" placeholder="手机号" onChange={e => formFieldUpdate('phone', e.target.value)} />
          </div>
          <div className="form-group mb-0">
            <label className="sr-only">密码</label>
            <input type="password" className="form-control" placeholder="密码" onChange={e => formFieldUpdate('password', e.target.value)} />
          </div>
          <div className="ml-auto">
            <button type="submit" className="btn btn-primary">登录</button>
          </div>
        </form>
      </div>
    </div>
  )
}
