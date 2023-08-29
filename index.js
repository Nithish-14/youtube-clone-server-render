const express = require('express');
const path = require('path');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

//Initializing express server
const app = express();

//Creating a path of the database file
const dbPath = path.join(__dirname, "youtubeClone.db");

//Using middleware functions
app.use(express.json());
app.use(cors({ origin: "https://youtube-clone-nithish.vercel.app" }));

let db = null;

//Initializing Database and Server
const initializeDbAndServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(8080, () => {
            console.log("Server Running at https://youtube-clone-ten-iota.vercel.app/");
        });
    } catch(error) {
        console.log(`DB error: ${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();

//Middleware Function for verifying JWT Token
const authenticator = (request, response, next) => {
    const header = request.headers["authorization"];
    let jwtToken;
    if (header !== undefined) {
        jwtToken = header.split(" ")[1];
    }

    if (jwtToken === undefined) {
        response.status(401);
        response.send({errorMsg: "Invalid JWT Token"});
    } else {
        jwt.verify(jwtToken, "IronMan", async (error, payload) => {
            if (error) {
              response.status(401);
              response.send({errorMsg: "Invalid JWT Token"});
            } else {
              request.name = payload.name;
              next();
            }
        });
    }
};

//Test API
app.get("/", (request, response) => {
    response.send("Successful")
})

//Create User API
app.post("/register/", async (request, response) => {
    const { name, password } = request.body;

    const userDb = `
        SELECT *
        FROM user
        WHERE name = '${name}';
    `;

    const passwordLength = password.length;

    const user = await db.get(userDb);

    if (user !== undefined) {
        response.status(400);
        response.send({errorMsg: "Username already exists"});
      } else {
        if (passwordLength < 6) {
            response.status(400);
            response.send({errorMsg: "Password is too short"});
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);

            const dateTime = new Date();

            const year = dateTime.getFullYear();
            const month = dateTime.getMonth();
            const day = dateTime.getDay();
            const hour = dateTime.getHours();
            const minute = dateTime.getMinutes();
            const second = dateTime.getSeconds();

            const date = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    
            const addUserQuery = `
                    INSERT INTO user(name, password, created_at)
                    VALUES('${name}', '${hashedPassword}', '${date}');
            `;
        
            await db.run(addUserQuery);
        
            response.send({message: "User created successfully"});
        }
    }
});

//Login User API
app.post("/login/", async (request, response) => {
    const {name, password} = request.body;

    const userDb = `
         SELECT *
         FROM user
         WHERE name = '${name}';
    `;

    const dbUser = await db.get(userDb);
    
    if (dbUser === undefined) {
        response.status(400);
        response.send({errorMsg: "Invalid user"});
    } else {
        const isMatched = await bcrypt.compare(password, dbUser.password);

        if (isMatched === true) {
            const payload = { name: name };
      
            const jwtToken = jwt.sign(payload, "IronMan");
      
            response.send({ jwtToken });
        } else {
            response.status(400);
            response.send({errorMsg: "Invalid password"});
        }
    }
});

//Add Watchlater API
app.post("/user/addwatchlater", authenticator, async (request, response) => {
    const {name} = request;
    const videoDetail = request.body;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userId = await db.get(getUserIdQuery);

    const stringifiedVideoDetail = JSON.stringify(videoDetail)

    const addWatchlaterQuery = `
        INSERT INTO watchlater(videoitem, user_id)
        VALUES(?, ?);
    `;

    await db.run(addWatchlaterQuery, [stringifiedVideoDetail, userId.id], function (err) {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Inserted video detail for user ${userId}`);
        }
    });

    response.send({message: "Succcessfully added to watchlater"})
})

//Add Likedvideo API
app.post("/user/addlikedvideo", authenticator, async (request, response) => {
    const {name} = request;
    const videoDetail = request.body;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userId = await db.get(getUserIdQuery);

    const stringifiedVideoDetail = JSON.stringify(videoDetail)

    const addLikedVideoQuery = `
        INSERT INTO likedvideos(videoitem, user_id)
        VALUES(?, ?);
    `;

    await db.run(addLikedVideoQuery, [stringifiedVideoDetail, userId.id], function (err) {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Inserted video detail for user ${userId}`);
        }
    });

    response.send({message: "Succcessfully added to likedvideos"})
})

//Add History API
app.post("/user/addhistory", authenticator, async (request, response) => {
    const {name} = request;
    const videoDetail = request.body;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userId = await db.get(getUserIdQuery);

    const stringifiedVideoDetail = JSON.stringify(videoDetail)

    const addHistoryQuery = `
        INSERT INTO history(videoitem, user_id)
        VALUES(?, ?);
    `;

    await db.run(addHistoryQuery, [stringifiedVideoDetail, userId.id], function (err) {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`Inserted video detail for user ${userId}`);
        }
    });

    response.send({message: "Succcessfully added to history"})
})

const parseVideoItem = (videoitem) => JSON.parse(videoitem.videoitem);

//Get Watchlater API
app.get("/user/watchlater", authenticator, async (request, response) => {
    const {name} = request;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userIdObject = await db.get(getUserIdQuery);
    const userId = userIdObject.id;

    const getWatchlaterQuery = `
        SELECT *
        FROM watchlater
        WHERE user_id = ${userId};
    `

    const watchLaterArray = await db.all(getWatchlaterQuery); 
    const parsedWatchLaterArray = watchLaterArray.map(videoitem => parseVideoItem(videoitem));
    response.send({watchLaterVideos: parsedWatchLaterArray})
})

//Get History API
app.get("/user/history", authenticator, async (request, response) => {
    const {name} = request;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userIdObject = await db.get(getUserIdQuery);
    const userId = userIdObject.id;

    const getHistoryQuery = `
        SELECT *
        FROM history
        WHERE user_id = ${userId};
    `

    const historyArray = await db.all(getHistoryQuery); 
    const parsedHistoryArray = historyArray.map(videoitem => parseVideoItem(videoitem));
    response.send({historyVideos: parsedHistoryArray})
})

//Get Likedvideos API
app.get("/user/liked", authenticator, async (request, response) => {
    const {name} = request;

    const getUserIdQuery = `
        SELECT id
        FROM user
        WHERE name='${name}';
    `

    const userIdObject = await db.get(getUserIdQuery);
    const userId = userIdObject.id;

    const getLikedQuery = `
        SELECT *
        FROM likedvideos
        WHERE user_id = ${userId};
    `

    const likedArray = await db.all(getLikedQuery); 
    const parsedLikedArray = likedArray.map(videoitem => parseVideoItem(videoitem));
    response.send({likedVideos: parsedLikedArray})
})