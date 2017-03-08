import * as request from 'superagent'
import {createWriteStream} from 'fs'
import * as targz from 'tar.gz'

// request
//   .get('naver.com')
//   .pipe(createWriteStream(__dirname + '/naver.html'))

request
  .get('http://sanfrancisco.kapeli.com/feeds/Mocha.tgz')
  .pipe(targz().createWriteStream(__dirname))
console.log('end')