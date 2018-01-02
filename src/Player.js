import React, { Component } from 'react';
import { observer } from 'mobx-react'

class Player extends Component {
  render() {
    let { playing } = this.props.store
    return (
      <div>
        <div>
          <button>
            <i className="fas fa-step-backward" />
          </button>
          { playing ?
              (
                <button>
                  <i className="fas pause-circle" />
                </button>
              ) : (
                <button>
                  <i className="fas fa-play" />
                </button>
              )
          }
          <button>
            <i className="fas fa-step-forward" />
          </button>
        </div>
      </div>
    )
  }
}

export default observer(Player)
