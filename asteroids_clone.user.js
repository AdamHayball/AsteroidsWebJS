// ==UserScript==
// @name         Asteroids Clone - Levels and Difficulty
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Asteroids clone with levels, score, particles, and difficulty settings.
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const gameContainer = document.createElement('div');
    gameContainer.style = 'position:fixed;top:50px;left:50px;z-index:99999;border:2px solid #ccc;border-radius:8px;background:black;resize:both;overflow:hidden;width:400px;height:400px;cursor:move;';
    document.body.appendChild(gameContainer);

    gameContainer.onmousedown = function (e) {
        let offsetX = e.clientX - gameContainer.offsetLeft;
        let offsetY = e.clientY - gameContainer.offsetTop;
        function move(e) {
            gameContainer.style.left = `${e.clientX - offsetX}px`;
            gameContainer.style.top = `${e.clientY - offsetY}px`;
        }
        document.addEventListener('mousemove', move);
        gameContainer.onmouseup = function () {
            document.removeEventListener('mousemove', move);
            gameContainer.onmouseup = null;
        };
    };

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    gameContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let score = 0, level = 1;
    let ship = { x: 200, y: 200, vx: 0, vy: 0, angle: 0, radius: 10, dead: false, restartTimer: null };
    let keys = {}, bullets = [], asteroids = [], particles = [], levelMsgTimer = 0;

    const sizeByLevel = [0, 15, 25, 40];

    function createAsteroid(x, y, level = 3) {
        const speed = 1 + level * 0.2 + Math.random();
        const angle = Math.random() * Math.PI * 2;
        return {
            x: x ?? Math.random() * canvas.width,
            y: y ?? Math.random() * canvas.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            level,
            radius: sizeByLevel[level]
        };
    }

    function spawnAsteroids() {
        asteroids = [];
        for (let i = 0; i < 4 + level; i++) {
            asteroids.push(createAsteroid());
        }
    }

    function createParticles(x, y, count = 10, color = 'white') {
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 2;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 10,
                color
            });
        }
    }

    document.addEventListener('keydown', e => keys[e.key] = true);
    document.addEventListener('keyup', e => keys[e.key] = false);

    function update() {
        if (ship.dead) {
            if (ship.restartTimer === null) {
                ship.restartTimer = 120;
            } else if (--ship.restartTimer <= 0) {
                level = 1;
                score = 0;
                ship = { x: 200, y: 200, vx: 0, vy: 0, angle: 0, radius: 10, dead: false, restartTimer: null };
                bullets = [];
                particles = [];
                spawnAsteroids();
            }
            return;
        }

        if (keys['ArrowLeft']) ship.angle -= 0.05;
        if (keys['ArrowRight']) ship.angle += 0.05;
        if (keys['ArrowUp']) {
            ship.vx += Math.cos(ship.angle) * 0.1;
            ship.vy += Math.sin(ship.angle) * 0.1;
        }
        if (keys[' ']) {
            if (bullets.length < 5) {
                bullets.push({
                    x: ship.x, y: ship.y,
                    vx: Math.cos(ship.angle) * 5,
                    vy: Math.sin(ship.angle) * 5,
                    life: 60
                });
            }
            keys[' '] = false;
        }

        ship.x = (ship.x + ship.vx + canvas.width) % canvas.width;
        ship.y = (ship.y + ship.vy + canvas.height) % canvas.height;
        ship.vx *= 0.99;
        ship.vy *= 0.99;

        bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        bullets = bullets.filter(b => b.life > 0);

        asteroids.forEach(a => {
            a.x = (a.x + a.vx + canvas.width) % canvas.width;
            a.y = (a.y + a.vy + canvas.height) % canvas.height;
        });

        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.life--;
        });
        particles = particles.filter(p => p.life > 0);

        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            for (let j = asteroids.length - 1; j >= 0; j--) {
                let a = asteroids[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                if (Math.sqrt(dx * dx + dy * dy) < a.radius) {
                    bullets.splice(i, 1);
                    asteroids.splice(j, 1);
                    score += 100 * a.level;
                    createParticles(a.x, a.y, 12, 'gray');
                    if (a.level > 1) {
                        asteroids.push(createAsteroid(a.x, a.y, a.level - 1));
                        asteroids.push(createAsteroid(a.x, a.y, a.level - 1));
                    }
                    break;
                }
            }
        }

        for (let a of asteroids) {
            let dx = ship.x - a.x;
            let dy = ship.y - a.y;
            if (Math.sqrt(dx * dx + dy * dy) < a.radius + ship.radius) {
                createParticles(ship.x, ship.y, 20, 'red');
                ship.dead = true;
                return;
            }
        }

        if (asteroids.length === 0) {
            level++;
            levelMsgTimer = 100;
            spawnAsteroids();
        }
    }

    function draw() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.fillText(`Score: ${score}`, 10, 20);
        ctx.fillText(`Level: ${level}`, 320, 20);

        if (levelMsgTimer > 0) {
            ctx.fillStyle = 'yellow';
            ctx.font = '20px monospace';
            ctx.fillText(`Level ${level}`, 150, 200);
            levelMsgTimer--;
        }

        if (!ship.dead) {
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(ship.angle);
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-10, -7);
            ctx.lineTo(-10, 7);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.fillStyle = 'red';
            ctx.font = '18px monospace';
            ctx.fillText('💥 Game Over', 120, 200);
        }

        ctx.fillStyle = 'white';
        bullets.forEach(b => {
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = 'gray';
        asteroids.forEach(a => {
            ctx.beginPath();
            ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
            ctx.stroke();
        });

        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        });
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    spawnAsteroids();
    loop();
})();
