import Message from "../models/Message";
import User from "../models/User";
import File from "../models/File";
import {gfs} from "../index";

export function getChatList() {
    return new Promise((resolve, reject) => {
        Message.find({}).populate('user').populate('file').sort({date: -1}).exec((err, messages) => {
            if (err) reject(err);
            resolve(messages);
        });
    });
}

export function findUserByName(name) {
    return new Promise((resolve, reject) => {
        User.findOne({name}, (err, user) => {
            if (err) reject(err);
            resolve(user);
        });
    });
}

export function createUser(name) {
    return new Promise((resolve, reject) => {
        User.create({name}, (err, user)=> {
            if (err) reject(err);
            resolve(user);
        });
    });
}

export function editUserName(name, user_id) {
    return new Promise((resolve, reject) => {
        User.findOneAndUpdate({_id: user_id}, {name}, {runValidators: true, new: true}, (err, user) => {
            if (err) reject(err);
            resolve(user)
        });
    });
}

export function createMessage(message, user_id, file_id = null) {
    return new Promise((resolve, reject) => {
        let data = {
            message,
            user: user_id,
        };
        if (file_id) data.file = file_id;
        Message.create(data, (err, message)=> {
            if (err) reject(err);
            message.populate(['file','user']).execPopulate(() => resolve(message))
        });
    });
}
