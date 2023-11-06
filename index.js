const express = require('express')
const fetch = require('node-fetch')
const redis = require('redis')

const port = process.env.PORT || 5000
const redis_port = process.env.PORT || 6379

const client = redis.createClient(redis_port)

const app = express()

function getResponse(username, repos) {
    return `<h2>${username} has ${repos} Github repos</h2>`
}

async function getRepos(req, res, next) {
    try {
        console.log('fetching data...');

        const { username } = req.params
        let url = `https://api.github.com/users/${username}`
        const response = await fetch(url)
        const data = await response.json()
        const repos = data.public_repos
        
        console.log(repos);
        // Set data to redis
        client.setex(username, 3600, JSON.stringify(repos))

        res.send(getResponse(username, repos))
    } catch (error) {
        console.error(error);
        res.status(500)
    }
}

// Cache middlewere
function cache(req, res, next) {
    const { username } = req.params

    client.get(username, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(getResponse(username, data))
        } else {
            next()
        }
    })
}

app.get('/user/:username', cache, getRepos)

app.listen(port, () => {
    console.log(`Running on port: ${port}`);
})