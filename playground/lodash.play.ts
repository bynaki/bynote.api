import * as _ from 'lodash'

const data = {}
_.assign(data, {a: 0})
console.log(`data: ${JSON.stringify(data, null, '  ')}`)

const aa = [1, 2]
const bb = [3, 4]
const cc = [4, 5]
_.assign(aa, bb, cc)
console.log(`aa: ${_.assign(aa, bb, cc)}`)