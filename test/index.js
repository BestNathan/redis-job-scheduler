const RedisScheduler = require('../lib')

const rs = new RedisScheduler({
  host: '',
  password: '',
})

rs.on('redisError', e => {
  console.log(e)
})

rs.on('redisConnect', () => {
  console.log('connect')
  rs.scheduleJob('10 * * * * *', () => {
    console.log(`time is : ${new Date()}`)
  })
})
