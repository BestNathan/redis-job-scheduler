const ioredis = require('ioredis')
const Task = require('./task')
const uitl = require('util')

class TaskManager {
  /**
   *
   * @param {ioredis.Redis} redis
   */
  constructor(redisOptions) {
    this.redis = new ioredis(redisOptions)
    this.tasks = new Map()
  }
  _removeFromRedis(id) {
    this.redis.del(id).then(() => {
      this.tasks.delete(id)
    })
  }
  async _addToRedis(task) {
    if (task.interval.hasNext()) {
      await this.redis.set(task.id, '')
      let expireat = task.interval.next().getTime() / 1000
      this.redis.expireat(task.id, expireat)
    } else {
      this._removeFromRedis(task.id)
    }
  }
  addTask(expression, fn) {
    let task = new Task({ expression, fn })
    this.tasks.set(task.id, task)

    this._addToRedis(task).catch(error => {
      this.redis.emit('error', error)
    })

    return () => {
      this.cancelTask(task.id)
    }
  }
  async execTask(id) {
    if (!this.tasks.has(id)) {
      return
    }

    let task = this.tasks.get(id)
    if (task instanceof Task) {
      let res = await task.fn()

      if (uitl.isBoolean(res) && !res) {
        this._removeFromRedis(id)
      } else {
        this._addToRedis(task)
      }
    }
  }
  cancelTask(id) {
    if (!id || !this.tasks.has(id)) {
      return
    }

    this._removeFromRedis(id)
  }
  _onExit() {
    let keys = []
    this.tasks.forEach((v, key) => {
      keys.push(key)
    })
    this.redis.del(keys)
  }
}

module.exports = TaskManager
