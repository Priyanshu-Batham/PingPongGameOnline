import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = process.cwd();
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client.html');
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});

// ----------------------GAME LOGIC------------------>
const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 720
let isGameRunning = false;

function resetGame() {
    setTimeout(() => {
        ball = new Ball(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
            20,
            5 * (Math.random() >= 0.5 ? 1 : -1),
            5 * (Math.random() >= 0.5 ? 1 : -1),
            0.01
        )
        isGameRunning = true;
    }, 1000);
}

class Ball {
    constructor(x, y, radius, velocityX, velocityY, acceleration) {
        this.x = x
        this.y = y
        this.radius = radius
        this.velocityX = velocityX
        this.velocityY = velocityY
        this.acceleration = acceleration
    }

    update() {
        if (this.x + this.radius + p1.width >= CANVAS_WIDTH) {
            let ballUpperPart = this.y - this.radius
            let ballLowerPart = this.y + this.radius
            if ((ballUpperPart > p2.y && ballUpperPart < p2.y + p2.height) || (ballLowerPart > p2.y && ballLowerPart < p2.y + p2.height)) {
                this.velocityX *= -1
                this.x = CANVAS_WIDTH - this.radius - p1.width - 1
            }
            else {
                isGameRunning = false;
                resetGame()
            }
        }
        if (this.x - this.radius - p1.width <= 0) {
            let ballUpperPart = this.y - this.radius
            let ballLowerPart = this.y + this.radius
            if ((ballUpperPart > p1.y && ballUpperPart < p1.y + p1.height) || (ballLowerPart > p1.y && ballLowerPart < p1.y + p1.height)) {
                this.velocityX *= -1
                this.x = this.radius + p1.width + 1
            }
            else {
                isGameRunning = false;
                resetGame()
            }
        }

        if (this.y + this.radius >= CANVAS_HEIGHT) {
            this.velocityY *= -1
            this.y = CANVAS_HEIGHT - this.radius - 1
        }
        if (this.y - this.radius <= 0) {
            this.velocityY *= -1
            this.y = this.radius + 1
        }
        this.x += this.velocityX
        this.y += this.velocityY

        this.velocityX < 0? this.velocityX -= this.acceleration : this.velocityX += this.acceleration
        this.velocityY < 0? this.velocityY -= this.acceleration : this.velocityY += this.acceleration
    }
}
let ball;

class Player {
    constructor(x, y, height, width, velocity) {
        this.x = x
        this.y = y
        this.height = height
        this.width = width
        this.velocity = velocity
    }

    update() {
        if (this.y + this.velocity >= 0 && this.y + this.height + this.velocity <= CANVAS_HEIGHT) this.y += this.velocity
    }
}

let p1 = null
let p2 = null

//Server Loop------->>>
setInterval(() => {
    if (isGameRunning) {
        ball.update()
        p1.update()
        p2.update()

        io.emit("serverLoop", p1.x, p1.y, p2.x, p2.y, ball.x, ball.y);
    }
}, 1000 / 60);

// ----------------------SOCKET CODE------------------>
//connection handling
io.on('connection', (socket) => {
    console.log(`${socket.id} connected`);
    let player;
    if (p1 == null) {
        player = "p1"
        p1 = new Player(0, 50, 180, 20, 10)
    }
    else if (p2 == null) {
        player = "p2"
        p2 = new Player(CANVAS_WIDTH - 20, 70, 180, 50, 10)
    }
    else {
        player = "spectate"
    }

    if (p1 != null && p2 != null) {
        ball = new Ball(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
            20,
            5 * (Math.random() >= 0.5 ? 1 : -1),
            5 * (Math.random() >= 0.5 ? 1 : -1),
            0.01
        )
        isGameRunning = true;
    }

    //disconnection handling
    socket.on('disconnect', ()=>{
        console.log(`${socket.id} disconnected`)
        if(player === "p1"){
            p1 = null;
            isGameRunning = false;
        }
        else if(player === "p2"){
            p2 = null;
            isGameRunning = false;
        }
    })

    //handling client moves
    socket.on("clientKeyPressed", (key)=>{
        if(player == "p1" && p1 != null){
            if ((key === 'w' && p1.velocity > 0) || (key === 's' && p1.velocity < 0)) p1.velocity *= -1
        }
        else if(player == "p2" && p2 != null){
            if ((key === 'w' && p2.velocity > 0) || (key === 's' && p2.velocity < 0)) p2.velocity *= -1
        }
    })
})