import React, { Component } from 'react';
import { observer } from 'mobx-react'
import classNames from 'classnames'

class Login extends Component {
  constructor (props) {
    super(props)
    this.state = {
      collapsed: true
    }
  }
  render() {
    let {store} = this.props
    let {collapsed} = this.state
    return (
      <div>
        <div className={classNames('text-center border', {'d-none': !collapsed})}>
          <div>
            <button className="btn btn-link" onClick={() => {
              this.setState({
                collapsed: false
              })
            }}>登录</button>
            获取每日推荐和我的歌单
          </div>
        </div>
        <div className={classNames({'d-none': collapsed})}>
          <form className="form-inline flex-nowrap mx-0 my-2">
            <div className="form-group mb-0">
              <label className="sr-only">手机号</label>
              <input type="text" className="form-control" placeholder="手机号" />
            </div>
            <div className="form-group mb-0">
              <label className="sr-only">密码</label>
              <input type="password" className="form-control" placeholder="密码" />
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
