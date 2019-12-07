import express from 'express';
import bodyParser from 'body-parser';
import socket from 'socket.io';
import http from 'http';
import express_session from 'express-session';
import sharedsession  from 'express-socket.io-session';
import {getTodoList, deleteTodo, editTodo, addTodo} from "./functions/db_functions";
import {createMessage, createUser, editUserName, findUserByName, getChatList} from "./functions/chat_functions";
import moment from 'moment';
import mongoose from 'mongoose';
import multer from 'multer';
import GridFsStorage from 'multer-gridfs-storage';
import GridFsStream from 'gridfs-stream';
import ss from 'socket.io-stream';

// file storage
export let gfs;
let storage;
let singleUpload;

// db connection
mongoose.connect('mongodb://localhost:27017/chat', {useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Successful connection !");
    GridFsStream.mongo = mongoose.mongo;
    gfs = GridFsStream(mongoose.connection.db);
    storage = GridFsStorage({
        db: mongoose.connection.db,
        file: (req, file) => {
            return {
                filename: file.originalname
            }
        }
    });
    singleUpload = multer({ storage: storage }).single('file');
    server.listen(8080);
});

const app = express();
const server = http.Server(app);
const io = socket(server);
const session = express_session({secret: 'fidman_io_session',saveUninitialized: true,resave: true});

app.use(session);
io.of('/chat').use(sharedsession(session));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));

// chat.ejs
app.get('/chat', (req, res) => {
    if (req.session.user) {
        getChatList()
            .then(chatList => {
                res.render('chat.ejs', {chatList, user: req.session.user, moment})
            })
            .catch(err => console.log(err));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) res.redirect('/chat');
    else res.render('login.ejs');
});

app.post('/chat/upload', (req, res) => {
    singleUpload(req,res,function(err){
        if (req.file) {
            createMessage("This is my cv", req.body.user_id, req.file.id);
            return res.json({
                success: true,
                file: req.file
            });
        }
        res.send({ success: false });
    });

});

app.get('/file/:filename', function(req, res){
    gfs.files.find({ filename: req.params.filename }).toArray((err, files) => {
        if(!files || files.length === 0){
            return res.status(404).json({
                message: "Could not find file"
            });
        }
        var readstream = gfs.createReadStream({
            filename: files[0].filename
        });
        res.set('Content-Type', files[0].contentType);
        return readstream.pipe(res);
    });
});

app.get('/files', function(req, res){
    gfs.files.find().toArray((err, files) => {
        if(!files || files.length === 0){
            return res.status(404).json({
                message: "Could not find files"
            });
        }
        return res.json(files);
    });
});

// index.ejs
app.get('/', (req, res) => {
    getTodoList()
        .then(todoList => res.render('index.ejs', {todoList, name: req.session.name}))
        .catch(err => console.log(err));
});

app.post('/add_todo', (req, res) => {
    addTodo(req.body.todoItem)
        .then(rep => res.redirect('/'))
        .catch(err => console.log(err));
});

app.post('/edit_todo', (req, res) => {
    editTodo(req.body.todo_id, req.body.new_todo)
        .then(response => res.redirect('/'))
        .catch(err => console.log(err));
});

app.get('/delete_todo/:todoId', (req, res) => {
    deleteTodo(req.params.todoId)
        .then(response => res.redirect('/'))
        .catch(err => console.log(err));
});

app.get('/csv', function(req, res){
    let session = req.session;
    res.set('Content-Type', 'application/octet-stream');
    getTodoList()
        .then(todoList => res.send(todoList.map(todoItem => todoItem.todo).join("\r\n")))
        .catch(err => console.log(err));
});

// load server socket
io.of('/chat').on('connection', function (socket) {
    //socket.emit('message', "You're connected");

    // chat socket
    socket.on('login', (name) => {
        findUserByName(name)
            .then(user => {
                if (user) {
                    socket.handshake.session.user = user;
                    socket.handshake.session.save();
                    socket.emit('connected', user);
                    socket.broadcast.emit('new_logged_user', user);
                } else {
                    createUser(name)
                        .then(user => {
                            socket.handshake.session.user = user;
                            socket.handshake.session.save();
                            socket.emit('connected', user);
                            socket.broadcast.emit('new_logged_user', user);
                        })
                        .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
    });

    socket.on("logout", function() {
        if (socket.handshake.session.user) {
            let user_name = socket.handshake.session.user.name;
            console.log(user_name);
            delete socket.handshake.session.user;
            socket.handshake.session.save();
            socket.emit('disconnected');
            socket.broadcast.emit('user_left_chat', user_name);
        }
    });

    // message with attached file
    ss(socket).on('send_message', function (message, {stream, fileName}) {
        if (socket.handshake.session.user) {
            let writeStream = gfs.createWriteStream(fileName);
            stream.pipe(writeStream);

            writeStream.on('finish', () => {
                createMessage(message, socket.handshake.session.user._id, writeStream.id)
                    .then(message => {
                        const msg = {
                            ...message._doc,
                            user: socket.handshake.session.user,
                        };
                        socket.broadcast.emit('new_message', msg);
                        socket.emit('new_message_user', msg)
                    })
                    .catch(err => console.log(err));
            });
        }
    });

    socket.on('send_message', function (message) {
        if (socket.handshake.session.user)
            createMessage(message, socket.handshake.session.user._id)
                .then(message => {
                    const msg = {
                        ...message._doc,
                        user: socket.handshake.session.user,
                    };
                    socket.broadcast.emit('new_message', msg);
                    socket.emit('new_message', msg)
                })
                .catch(err => console.log(err));
    });

    socket.on('edit_name', function (name) {
        const oldName = socket.handshake.session.user.name;
        editUserName(name, socket.handshake.session.user._id)
            .then((user) => {
                socket.handshake.session.user = user;
                socket.handshake.session.save();
                socket.emit('user_name_edited', {oldName, user});
                socket.broadcast.emit('user_name_edited_broadcast', {oldName, user});
            })
            .catch(err => console.log(err));
    });

    socket.on('wizz', function () {
        socket.broadcast.emit('wizz');
    });

});
