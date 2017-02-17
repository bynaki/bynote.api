# bynote api


## Usage

```bash
$ npm start
$ npm run start.watch
$ npm test
$ npm run test.watch
$ npm run build
$ npm run clear
```


## URL

GraphQL:
- url: http://localhost:3000/graphql
- method: post
- query(json): {query: {re: echo(message: "Hello")}}
- recieve(json): {"data": {"re": "recieved Hello"}}

GraphiQL:
- url: http://localhost:3000/graphql
- method: get


## config.ts
- 보안이 필요한 설정 파일
- config.base.ts 를 config.ts로 복사해 사용.


## Reference

- [GraphQL](http://graphql.org)
- [Apollo GraphQL Client](http://dev.apollodata.com)
- [Knex](http://knexjs.org)
- Schema
  - http://graphql.org/learn/schema/
  - http://dev.apollodata.com/tools/graphql-tools/generate-schema.html
- [Getting Started With GraphQL.js](http://graphql.org/graphql-js/)
- [Running an Express GraphQL Server](http://graphql.org/graphql-js/running-an-express-graphql-server/)
- [JWT](https://jwt.io)
- [node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)


## License

Copyright (c) bynaki. All rights reserved.

Licensed under the MIT License.