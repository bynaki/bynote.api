import * as request from 'supertest'
import {Server} from '../app'


export default request(new Server().application.listen(1818))