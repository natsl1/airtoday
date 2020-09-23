const express = require('express')
const http = require('http')
const static = require('serve-static')
const path = require('path')

const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const expressSession = require('express-session')
const expressErrorHandler = require('express-error-handler')

const mongoose = require('mongoose')
var database
var UserSchema
var UserModel

function connectDB() {
    const databaseUrl = 'mongodb://localhost:27017/local'

    mongoose.Promise = global.Promise
    mongoose.connect(databaseUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    database = mongoose.connection

    database.on('open', () => {
        console.log('데이터베이스에 연결됨 : ' + databaseUrl)

        UserSchema = mongoose.Schema({
            id: {type:String, required:true, unique:true},
            name: {type:String, required:true},
            password: {type:String, index:'hashed'},
            age: {type:Number, 'default': -1},
            created_at: {type:Date, index:{unique:false}, 'default':Date.now()},
            updated_at: {type:Date, index:{unique:false}, 'default':Date.now()}
        })
        console.log('UserSchema 정의함.')
        
        UserModel = mongoose.model('users', UserSchema)
        console.log('UserModel 정의함.')
    })

    database.on('disconnected', () => {
        console.log('데이터베이스 연결 끊어짐')
    })

    database.on('error', console.error.bind(console, 'mongoose 연결 에러'))
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

router.route('/process/adduser').post((req, res) => {
    console.log('/process/adduser 라우팅 함수 호출됨')

    const paramId = req.body.id || req.query.id
    const paramPassword = req.body.password || req.query.password
    const paramName = req.body.name || req.query.name
    
    console.log('요청 파라미터 : ' + paramId + ', ' + paramPassword + ', ' + paramName)

    if (database) {
        addUser(database, paramId, paramPassword, paramName,
            (err, result) => {
                if (err) {
                    console.log('에러 발생')
                    res.writeHead(200, {"Content-Type":"text/html;charset=utf8"})
                    res.write('<h1>에러 발생</h1>')
                    res.end()
                }

                if (result) { 
                    console.dir(result)

                    res.writeHead(200, {"Content-Type":"text/html;charset=utf8"})
                    res.write('<h1>사용자 추가 성공</h2>')
                    res.write('<div><p>사용자 : ' + paramName + '</p></div>')
                    res.end();
                } else {
                    console.log('에러 발생')
                    res.writeHead(200, {"Content-Typer":"text/html;charset=utf8"})
                    res.write('<h1>사용자 추가 안됨</h1>')
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

    UserModel.find({"id":id, "password":password}, (err, docs) => {
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

const addUser = (db, id, password, name, callback) => {
    console.log('addUser 호췰됨 : ' + id + ',' + password + ',' +
    name)

    const user = new UserModel({"id":id, "password":password, "name":name})

    user.save((err) => {
        if (err) {
            callback(err, null)
            return
        }

        console.log('사용자 데이터 추가함.')
        callback(null, user)
    })

    const users = db.collection('users')

    users.insertMany([{"id":id, "password":password, "name":name}],
    (err, result) => {
        if (err) {
            callback(err, null)
            return
        }

        if (result.insertedCount > 0) {
            console.log('사용자 추가됨 :' + result.insertedCount)
            callback(null, result)
        } else {
            console.log('추가된 레코드가 없음')
            callback(null, null)
        }
    }
    )
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