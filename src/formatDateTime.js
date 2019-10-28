const moment = require('moment')

const shortMonthDay = formatFn('MMM D')
const shortDate = formatFn('YYYY.DD.MM')
const date = formatFn('LL')
const time = formatFn('LT')
const full = formatFn('MMMM Do YYYY, h:mm:ss a')

function formatFn(formatString) {
  return blocktime => blocktimeToMoment(blocktime).format(formatString)
}

function blocktimeToMoment (blocktime) {
  return moment(Number(blocktime) * 1000)
}

module.exports = {
  shortMonthDay,
  shortDate,
  date,
  time,
  full
}
