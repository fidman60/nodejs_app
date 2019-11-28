import {MongoClient, ObjectId} from "mongodb";

export function getTodoList() {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://localhost:27017', {useUnifiedTopology: true,}, (err, db) => {
            if(err) reject(err);
            const todoDB = db.db('todo_db');
            todoDB.collection('todo_list').find({}).toArray((err, res) => {
                if (err) reject(err);
                resolve(res);
            });
            db.close();
        });
    })
}

export function addTodo(todo) {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://localhost:27017', {useUnifiedTopology: true,}, (err, db) => {
            if (err) reject(err);
            const todoDB = db.db('todo_db');
            todoDB.collection("todo_list").insertOne({todo}, (err, res) => {
                if (err) reject(err);
                resolve(true);
            });
            db.close();
        });
    });
}

export function editTodo(todoId, newTodo) {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://localhost:27017', {useUnifiedTopology: true,}, (err, db) => {
            if (err) reject(err);
            const todoDB = db.db('todo_db');
            todoDB.collection("todo_list").updateOne( {_id: ObjectId(todoId)}, {$set: {todo: newTodo}}, (err, res) => {
                if (err) reject(err);
                resolve(true);
            });
            db.close();
        });
    });
}

export function deleteTodo(todoId) {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://localhost:27017', {useUnifiedTopology: true,}, (err, db) => {
            if (err) reject(err);
            const todoDB = db.db('todo_db');
            todoDB.collection("todo_list").deleteOne( {_id: ObjectId(todoId)}, (err, res) => {
                if (err) reject(err);
                resolve(true);
            });
            db.close();
        });
    })
}
