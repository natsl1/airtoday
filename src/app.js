const express = require('express')
const http = require('http')
const static = require('serve-static')
const path = require('path')

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const expressSession = require('express-session')
const expressErrorHandler = require('express-error-handler')

const MongoClient = require('mongodb').MongoClient
const database

function connectDB() {
    const databaseUrl = 'mongodb://localhost:27017'

    MongoClient.connect(databaseUrl, {
        useNewUrlParser:true,
        useUnifiedTopology:true
    },(err, client) => {
        if (err) {
            console.log('DB 에러 발생!!')
            return
        }

        console.log('DB 연결됨 :  ' + databaseUrl)
        database = client.db("local")
    })
}

const app = express()
const router = express.Router()

app.set('port', process.env.PORT || 3000)
app.use('/public', static(path.join(__dirname, 'public')))

app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())

app.use(cookieParser())
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized:true
}))

router.route('/process/login').post((req, res) => {
    console.log('/process/login 라우팅 함수 호출')

    const paramId = req.body.id || req.query.id
    const paramPassword = req.body.password || req.query.password
    console.log('요청 파라미터 : ' + paramId + ',' + paramPassword)

    if (database) {
        authUser(database, paramId, paramPassword, (err, docs) => {
            if (err) {
                console.log('에러 발생')
                res.writeHead(200, {"Content-Type":"text/html;charset=utf8"})
                res.write('<h1>에러 발생</h1>')
                res.end()
            }

            if (docs) {
                console.dir(docs)

                res.writeHead(200, {"Content-Type":"text/html;charset=utf8"})
                res.write('<h1>사용자 로그인 성공</h2>')
                res.write('<div><p>사용자 : ' + docs[0].name + '</p></div>')
                res.write('<br><br><a href="/public/login.html">다시 로그인하기</a>')
                res.end();
            } else {
                console.log('에러 발생')
                res.writeHead(200, {"Content-Typer":"text/html;charset=utf8"})
                res.write('<h1>사용자 데이터 조회 안됨</h1>')
                res.end()

            }
        })
    } else {
        console.log('에러 발생')
        res.writeHead(200, {"Content-Typer":"text/html;charset=utf8"})
        res.write('<h1>데이터베이스 연결 안됨</h1>')
        res.end()
    }

})

app.use('/', router)

const authUser = (db, id, password, callback) => {
    console.log('authUser 호출됨 : ' + id + ', ' + password)
    
    const users = db.collection('users')

    users.find({"id":id, "password":password}).toArray((err, docs) => {
        if (err) {
            callback(err, null)
            return
        }

        if (docs.length > 0) {
            console.log('일치하는 사용자')
            callback(null, docs)
        } else {
            console.log('일치하는 사용자 찾지 못함')
            callback(null, null)
        }
    })
}

const errorHandler = expressErrorHandler({
    static: {
        '404': './public/404.html'
    }
})

app.use(expressErrorHandler.httpError(404))
app.use(errorHandler)

const server = http.createServer(app).listen(app.get('port'), () => {
    console.log('익스프레스로 웹 동작중...' + app.get('port'))

    connectDB()
})