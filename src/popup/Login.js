import React, { Component } from 'react'
import { observer } from 'mobx-react'
import classNames from 'classnames'

class Login extends Component {
  constructor (props) {
    super(props)
    this.state = {
      phone: '',
      password: '',
      collapsed: true
    }
  }
  formFieldUpdate (field, value) {
    this.setState({
      [field]: value
    })
  }
  submit (e) {
    e.preventDefault()
    let {login, loadRecommandAndUserPlaylists} = this.props.store
    let {phone, password} = this.state
    return login(phone, password).then(() => {
      return loadRecommandAndUserPlaylists()
    }).catch(e => {})
  }
  render () {
    let {collapsed} = this.state
    return (
      <div>
        <div className={classNames('text-center border', {'d-none': !collapsed})}>
          <div className="m-3">
            <button className="btn btn-link" onClick={() => {
              this.setState({
                collapsed: false
              })
            }}>登录</button>
            获取每日推荐和我的歌单
          </div>
        </div>
        <div className={classNames({'d-none': collapsed})}>
          <form className="form-inline flex-nowrap mx-2 my-3" onSubmit={e => this.submit(e)}>
            <div className="form-group mb-0">
              <label className="sr-only">手机号</label>
              <input type="text" className="form-control" placeholder="手机号" onChange={e => this.formFieldUpdate('phone', e.target.value)} />
            </div>
            <div className="form-group mb-0">
              <label className="sr-only">密码</label>
              <input type="password" className="form-control" placeholder="密码"  onChange={e => this.formFieldUpdate('password', e.target.value)} />
            </div>
            <div className="ml-auto">
              <button type="submit" className="btn btn-primary">登录</button>
            </div>
          </form>
        </div>
      </div>
    )
  }
}

export default observer(Login)
