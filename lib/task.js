const { uname } = require('./util')
const cronParser = require('cron-parser')

class Task {
  constructor({ expression, fn }) {
    this.id = uname()
    this.expression = expression
    this.fn = fn

    this.interval = cronParser.parseExpression(expression)
  }
}

module.exports = Task
