import * as _ from 'lodash'

const data = {}
_.assign(data, {a: 0})

console.log(`data: ${JSON.stringify(data, null, '  ')}`)