const express = require('express')
const http = require('http')
const static = require('serve-static')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const mongoose = require('mongoose')

var database
var UserSchema
var UserModel

function connectDB() {
    let dbArray = []
    let dbStr
    let dbObj = {
        "positions":dbArray
    }
    const databaseUrl = 'mongodb+srv://dbadmin:applemint69@realmcluster.lygek.mongodb.net/demo?retryWrites=true&w=majority'

    mongoose.Promise = global.Promise
    mongoose.connect(databaseUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    database = mongoose.connection

    database.on('open', () => {
        console.log('데이터베이스에 연결됨 : ' + databaseUrl)

        UserSchema = mongoose.Schema({})
        console.log('UserSchema 정의함.')
        
        UserModel = mongoose.model('positions', UserSchema, 'positions')
        console.log('UserModel 정의함.')

        UserModel.find({}, (err,docs) => {
            console.log('측정된 data 값 : ' + docs.length)
            if (err) {
                console.log('error: ' + err)
                return
            } else {
                docs.forEach((item) => {
                    dbArray.push(item)
                })
                dbStr = JSON.stringify(dbObj, null, '\t')
                fs.writeFileSync('../public/test.json', dbStr, 'utf-8')
            }
        })
    })

    database.on('disconnected', () => {
        console.log('데이터베이스 연결 끊어짐')
    })

    database.on('error', console.error.bind(console, 'mongoose 연결 에러'))
}

const app = express()
const router = express.Router()

app.set('port', process.env.PORT || 3002)
app.use('/public', static(path.join(__dirname, '../public')))
app.use(cors())

app.use('/', router)

const server = http.createServer(app).listen(app.get('port'), () => {
    console.log('익스프레스로 웹 동작중...' + app.get('port'))

    connectDB()
})