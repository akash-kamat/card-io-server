const express = require('express')
const {
    MongoClient
} = require("mongodb");
const cors = require('cors')
const bodyParser = require('body-parser');
const port = process.env.PORT || 3002


const app = express()
const connectionString = "mongodb+srv://akashkamat:akashkamat10@mytestdb.ducrb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const client = new MongoClient(connectionString);
client.connect();
const database = client.db("card-io");
const collection = database.collection("users");

const http = require('http').createServer(app)
const io = require('socket.io')(http, {
    cors: {
        origin: "*"
    }
})

app.use(bodyParser.json())
app.use(cors())

function checkRank(clicks){
    if(clicks<=100){
        return "1freshGreen"
    }
    else if (clicks > 100 && clicks<=600) {
        return "2steel"
    }
    else if(clicks > 600 && clicks<=1500){
        return "3buckyBronze"
    }
    else if(clicks > 1500 && clicks<=2500){
        return "4redStone"
    }
    else if(clicks > 2500 && clicks<=3900){
        return "5silver"
    }
    else if(clicks > 3900 && clicks<=5000){
        return "6gold"
    }
    else if(clicks > 5000 && clicks<=6300){
        return "7platinum"
    }
    else if(clicks > 6300 && clicks<=8000){
        return "8diamond"
    }
}

io.on('connection', (socket) => {
    console.log("client connected")
    socket.on("click", async (display_name) => {
        const result = await collection.findOne({
            "display_name": display_name
        })
        var click_count = result.clicks
        const query = {
            "display_name": display_name
        }
        console.log(checkRank(click_count+1))
        const update = await collection.updateOne(query, {
            $set: {
                "clicks": click_count + 1,
                "badge": checkRank(click_count+1)
                
            }
        })
        const usrs = collection.find({}).sort({"clicks":-1});
        userlist = []
        await usrs.forEach(doc => userlist.push({
            "display_name": doc.display_name,
            "name": doc.name,
            "img_url": doc.img_url,
            "bio": doc.bio,
            "id": doc.id,
            "theme": doc.theme,
            "clicks": doc.clicks,
            "rank": doc.rank,
            "badge": doc.badge,
            "joinedOn": doc.joinedOn
        }));
        io.emit("userList", userlist)
    });
})

app.get('/', (req, res) => {
    res.json("working")
    // collection.deleteMany({})
})

app.get('/usernames', (req, res) => {
    async function run() {
        try {
            const result = collection.find({}).sort({"clicks":-1});
            usernames = []
            await result.forEach(doc => usernames.push(doc.display_name));
            res.json(usernames)

        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir);
})

app.get('/users', (req, res) => {
    async function run() {
        try {
            const result = collection.find({}).sort({"clicks":-1});
            userlist = []
            await result.forEach(doc => userlist.push({
                "display_name": doc.display_name,
                "name": doc.name,
                "img_url": doc.img_url,
                "bio": doc.bio,
                "id": doc.id,
                "theme": doc.theme,
                "clicks": doc.clicks,
                "rank": doc.rank,
                "badge": doc.badge,
                "joinedOn": doc.joinedOn
            }));
            res.json(userlist)

        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir);
})

app.post('/register', (req, res) => {
    async function run() {
        try {

            const {
                name,
                password,
                img_url,
                display_name,
                bio
            } = req.body
            const _user = {
                "name": name,
                "display_name": display_name,
                "password": password,
                "img_url": img_url,
                "bio": bio,
                "id": await collection.countDocuments({}) + 1,
                "theme": "A",
                "clicks": 0,
                "rank": 0,
                "badge": "1freshGreen",
                "joinedOn": new Date
            }
            usr = await collection.insertOne(_user)

            console.log("Registered:\n", usr)
            res.json("sucessfully registered")
            await io.emit('new_user', _user)

            // console.log(req.body)

        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir);
})

app.post('/login', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne(req.body);
            if (result == null) {
                res.json(false)
                console.log("wrong creds")
            } else {
                res.json(result)
                console.log(`${result.name} logged in`)
            }
        } catch (error) {
            console.log(error)
        }

    }
    run().catch(console.dir)
})

app.get('/updatebio/:username/:password/:newbio', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.params.username,
                "password": req.params.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.params.username
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        bio: req.params.newbio
                    }
                })
                res.json(`old bio:${result.bio}  new bio: ${req.params.newbio}`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.get('/changetheme/:username/:password/:theme', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.params.username,
                "password": req.params.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.params.username
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        theme: req.params.theme
                    }
                })
                res.json(`Theme updated to: ${req.params.theme}`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.post('/delete', (req, res) => {
    async function run() {
        try {
            const result = await collection.deleteOne(req.body)
            console.log(result)
            res.json(`${req.body.display_name} Deleted`)
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.post('/changepassword', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.body.display_name,
                "password": req.body.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.body.display_name
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        password: req.body.newpassword
                    }
                })
                res.json(`Password Updated`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.post('/changeusername', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.body.display_name,
                "password": req.body.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.body.display_name
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        display_name: req.body.new_display_name
                    }
                })
                res.json(`Username Updated to ${req.body.new_display_name}`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.post('/changedp', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.body.display_name,
                "password": req.body.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.body.display_name
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        img_url: req.body.img_url
                    }
                })
                res.json(`Profile picture Updated`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

app.post('/setBadge', (req, res) => {
    async function run() {
        try {
            const result = await collection.findOne({
                "display_name": req.body.display_name,
                "password": req.body.password
            })
            if (result == null) {
                res.json("invalid credentials")
            } else {
                const query = {
                    "display_name": req.body.display_name
                }
                const update = await collection.updateOne(query, {
                    $set: {
                        badge: req.body.badge
                    }
                })
                res.json(`Badge Updated`)
            }
        } catch (error) {
            console.log(error)
        }
    }
    run().catch(console.dir)
})

http.listen(port, () => {
    console.log(`Example app listening at http://localhost:3002`)
})