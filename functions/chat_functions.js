import Message from "../models/Message";
import User from "../models/User";

export function getChatList() {
    return new Promise((resolve, reject) => {
        Message.find({}).populate('user').sort({date: -1}).exec((err, messages) => {
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

export function createMessage(message, user_id) {
    return new Promise((resolve, reject) => {
        Message.create({message,user: user_id}, (err, message)=> {
            if (err) reject(err);
            resolve(message);
        });
    });
}
