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

const app = express();
const server = http.Server(app);
const io = socket(server);
const session = express_session({secret: 'fidman_io_session',saveUninitialized: true,resave: true});

mongoose.connect('mongodb://localhost:27017/chat', {useNewUrlParser: true})
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Successful connection !");
    server.listen(8080);
});

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
