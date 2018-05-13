const ioredis = require('ioredis')
const eventEmitter = require('events')
const cronParser = require('cron-parser')

const TaskManager = require('./taskManager')

const REDIS_NOTIFY_CONFIG_NAME = 'notify-keyspace-events'

const redisNotifyConfigCheck = config => {
  if (config.indexOf('E') == -1) {
    return false
  }

  if (~config.indexOf('A') || ~config.indexOf('x')) {
    return true
  }

  return false
}

const redisErrorHandler = function(err) {
  let errHandlerLen = this.listeners('redisError').length
  if (errHandlerLen <= 1) {
    throw err
  }
}

class RedisScheduler extends eventEmitter {
  constructor(redisOptions) {
    super()
    this.options = Object.assign({ db: 11 }, redisOptions)
    this._db = redisOptions.db || 0
    this._subChannel = `__keyevent@${this._db}__:expired`
    //init redis
    this.redis = new ioredis(this.options)
    this.taskManager = new TaskManager(this.options)

    this.redis.on('error', err => {
      this.emit('redisError', err)
    })

    this.redis.on('connect', () => {
      this.emit('redisConnect')
      this._redisCheck()
    })

    //init self
    this.on('redisError', redisErrorHandler.bind(this))

    let oRemoveAll = this.removeAllListeners
    this.removeAllListeners = event => {
      oRemoveAll.bind(this)(event)
      if (event == 'redisError') {
        this.on('redisError', redisErrorHandler.bind(this))
      }
    }

    this.once('redisReady', () => {
      this.redis.subscribe(this._subChannel)
      this.redis.on('message', this._redisOnMessage.bind(this))
    })
  }
  _redisCheck() {
    this.redis
      .config('get', REDIS_NOTIFY_CONFIG_NAME)
      .then(config => {
        try {
          if (config[0] == REDIS_NOTIFY_CONFIG_NAME) {
            if (config[1] == '' || !redisNotifyConfigCheck(config[1])) {
              this.emit(
                'redisError',
                new Error(`redis config "${REDIS_NOTIFY_CONFIG_NAME}" must contain 'E' and 'A/x'`)
              )
            } else {
              this.emit('redisReady')
            }
          } else {
            this.emit(
              'redisError',
              new Error(`check redis config "${REDIS_NOTIFY_CONFIG_NAME}", but get "${config[0]}"`)
            )
          }
        } catch (error) {
          this.emit('redisError', error)
        }
      })
      .catch(error => {
        this.emit('redisError', error)
      })
  }
  _redisOnMessage(channel, id) {
    if (channel != this._subChannel) {
      return
    }

    this.taskManager.execTask(id)
  }
  scheduleJob(expression, fn) {
    return this.taskManager.addTask(expression, fn)
  }
}

module.exports = RedisScheduler
