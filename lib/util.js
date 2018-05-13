const crypto = require('crypto')
const uuid = require('uuid')

module.exports = exports = {}

const md5 = str => {
  let cipher = crypto.createHash('md5')
  cipher.update(str, 'utf8')
  return cipher.digest('hex')
}

exports.uname = () => {
  return md5(uuid() + Date.now())
}
