import { _decorator, Component, Graphics, input, Input, KeyCode, Vec2, Vec3, Color, UITransform, Label, Node, Button, sys, game, view, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property
    gridWidth: number = 20;

    @property
    gridHeight: number = 20;

    @property
    cellSize: number = 30;

    @property
    moveInterval: number = 0.12;

    @property(Label)
    scoreLabel: Label = null;

    @property(Node)
    gameOverPanel: Node = null;

    @property(Label)
    finalScoreLabel: Label = null;

    @property(Label)
    bestScoreLabel: Label = null;

    @property(Button)
    restartBtn: Button = null;

    @property(Button)
    quitBtn: Button = null;

    private snakeBody: Vec2[] = [];
    private snakeDirection: Vec2 = new Vec2(1, 0);
    private nextDirection: Vec2 = new Vec2(1, 0);
    private foodPosition: Vec2 = new Vec2();
    private bonusFoodPos: Vec2 = new Vec2();
    private bonusFoodActive: boolean = false;
    private bonusFoodTimer: number = 0;
    private obstacles: Vec2[] = [];
    private isGameOver: boolean = false;
    private isGameStarted: boolean = false;
    private score: number = 0;
    private bestScore: number = 0;
    private level: number = 1;
    private moveTimer: number = 0;
    private graphics: Graphics;
    private touchStartPos: Vec2 = new Vec2();
    private touchCurrentPos: Vec2 = new Vec2();
    private isTouching: boolean = false;

    onLoad() {
        this.graphics = this.getComponent(Graphics);
        if (!this.graphics) {
            this.graphics = this.addComponent(Graphics);
        }

        const visibleSize = view.getVisibleSize();
        const maxW = visibleSize.width * 0.9;
        const maxH = visibleSize.height * 0.75;
        const cellByW = Math.floor(maxW / this.gridWidth);
        const cellByH = Math.floor(maxH / this.gridHeight);
        this.cellSize = Math.min(cellByW, cellByH, 36);

        const uiTransform = this.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(
                this.gridWidth * this.cellSize,
                this.gridHeight * this.cellSize
            );
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);

        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }

        if (this.restartBtn) {
            this.restartBtn.node.on(Button.EventType.CLICK, this.restartGame, this);
        }

        if (this.quitBtn) {
            this.quitBtn.node.on(Button.EventType.CLICK, this.quitGame, this);
        }

        this.loadBestScore();
        this.initGame();
    }

    initGame() {
        this.snakeBody = [];
        const startX = Math.floor(this.gridWidth / 2);
        const startY = Math.floor(this.gridHeight / 2);
        this.snakeBody.push(new Vec2(startX, startY));
        this.snakeBody.push(new Vec2(startX - 1, startY));
        this.snakeBody.push(new Vec2(startX - 2, startY));

        this.snakeDirection = new Vec2(1, 0);
        this.nextDirection = new Vec2(1, 0);
        this.score = 0;
        this.level = 1;
        this.isGameOver = false;
        this.isGameStarted = true;
        this.moveTimer = 0;
        this.moveInterval = 0.12;
        this.obstacles = [];
        this.bonusFoodActive = false;
        this.bonusFoodTimer = 0;

        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }

        this.spawnFood();
        this.updateScoreLabel();
    }

    spawnFood() {
        this.foodPosition = this.findEmptyCell();
        if (Math.random() < 0.35 && !this.bonusFoodActive) {
            const bonus = this.findEmptyCell();
            if (bonus) {
                this.bonusFoodPos = bonus;
                this.bonusFoodActive = true;
                this.bonusFoodTimer = 8;
            }
        }
    }

    findEmptyCell(): Vec2 {
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * this.gridWidth);
            const y = Math.floor(Math.random() * this.gridHeight);
            if (this.isCellOccupied(x, y)) continue;
            return new Vec2(x, y);
        }
        return new Vec2(0, 0);
    }

    isCellOccupied(x: number, y: number): boolean {
        for (const seg of this.snakeBody) {
            if (seg.x === x && seg.y === y) return true;
        }
        if (this.foodPosition.x === x && this.foodPosition.y === y) return true;
        if (this.bonusFoodActive && this.bonusFoodPos.x === x && this.bonusFoodPos.y === y) return true;
        for (const obs of this.obstacles) {
            if (obs.x === x && obs.y === y) return true;
        }
        return false;
    }

    spawnObstacle() {
        const pos = this.findEmptyCell();
        this.obstacles.push(pos);
    }

    onKeyDown(event: any) {
        if (this.isGameOver) return;

        switch (event.keyCode) {
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W:
                if (this.snakeDirection.y !== -1) {
                    this.nextDirection = new Vec2(0, 1);
                }
                break;
            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S:
                if (this.snakeDirection.y !== 1) {
                    this.nextDirection = new Vec2(0, -1);
                }
                break;
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A:
                if (this.snakeDirection.x !== 1) {
                    this.nextDirection = new Vec2(-1, 0);
                }
                break;
            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D:
                if (this.snakeDirection.x !== -1) {
                    this.nextDirection = new Vec2(1, 0);
                }
                break;
        }
    }

    onTouchStart(event: EventTouch) {
        if (this.isGameOver) return;
        const loc = event.getUILocation();
        this.touchStartPos.set(loc.x, loc.y);
        this.touchCurrentPos.set(loc.x, loc.y);
        this.isTouching = true;
    }

    onTouchMove(event: EventTouch) {
        if (this.isGameOver || !this.isTouching) return;
        const loc = event.getUILocation();
        this.touchCurrentPos.set(loc.x, loc.y);
    }

    onTouchEnd(event: EventTouch) {
        if (this.isGameOver) return;
        this.isTouching = false;
        const endPos = event.getUILocation();
        const dx = endPos.x - this.touchStartPos.x;
        const dy = endPos.y - this.touchStartPos.y;
        const minSwipe = 30;

        if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && this.snakeDirection.x !== -1) {
                this.nextDirection = new Vec2(1, 0);
            } else if (dx < 0 && this.snakeDirection.x !== 1) {
                this.nextDirection = new Vec2(-1, 0);
            }
        } else {
            if (dy > 0 && this.snakeDirection.y !== -1) {
                this.nextDirection = new Vec2(0, 1);
            } else if (dy < 0 && this.snakeDirection.y !== 1) {
                this.nextDirection = new Vec2(0, -1);
            }
        }
    }

    update(dt: number) {
        if (this.isGameOver || !this.isGameStarted) return;

        if (this.bonusFoodActive) {
            this.bonusFoodTimer -= dt;
            if (this.bonusFoodTimer <= 0) {
                this.bonusFoodActive = false;
            }
        }

        this.moveTimer += dt;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer -= this.moveInterval;
            this.moveSnake();
        }

        this.draw();
    }

    moveSnake() {
        this.snakeDirection = this.nextDirection.clone();

        const head = this.snakeBody[0];
        const newHead = new Vec2(
            head.x + this.snakeDirection.x,
            head.y + this.snakeDirection.y
        );

        if (newHead.x < 0) {
            newHead.x = this.gridWidth - 1;
        } else if (newHead.x >= this.gridWidth) {
            newHead.x = 0;
        }
        if (newHead.y < 0) {
            newHead.y = this.gridHeight - 1;
        } else if (newHead.y >= this.gridHeight) {
            newHead.y = 0;
        }

        for (let i = 0; i < this.snakeBody.length; i++) {
            const segment = this.snakeBody[i];
            if (segment.x === newHead.x && segment.y === newHead.y) {
                this.gameOver();
                return;
            }
        }

        for (const obs of this.obstacles) {
            if (obs.x === newHead.x && obs.y === newHead.y) {
                this.gameOver();
                return;
            }
        }

        this.snakeBody.unshift(newHead);

        let ate = false;
        if (newHead.x === this.foodPosition.x && newHead.y === this.foodPosition.y) {
            this.score++;
            ate = true;
            this.spawnFood();
        }

        if (this.bonusFoodActive &&
            newHead.x === this.bonusFoodPos.x &&
            newHead.y === this.bonusFoodPos.y) {
            this.score += 3;
            this.bonusFoodActive = false;
            ate = true;
        }

        if (ate) {
            this.updateScoreLabel();
            this.updateDifficulty();
        } else {
            this.snakeBody.pop();
        }
    }

    updateDifficulty() {
        const newLevel = Math.floor(this.score / 5) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            //this.moveInterval = Math.max(0.04, 0.12 - (this.level - 1) * 0.01);
            this.spawnObstacle();
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.draw();

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.saveBestScore();
        }

        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = '当前分数: ' + this.score;
        }

        if (this.bestScoreLabel) {
            this.bestScoreLabel.string = '最高纪录: ' + this.bestScore;
        }

        if (this.gameOverPanel) {
            this.gameOverPanel.active = true;
        }
    }

    restartGame() {
        this.initGame();
    }

    quitGame() {
        game.end();
    }

    loadBestScore() {
        const saved = sys.localStorage.getItem('snake_best_score');
        if (saved) {
            this.bestScore = parseInt(saved) || 0;
        }
    }

    saveBestScore() {
        sys.localStorage.setItem('snake_best_score', this.bestScore.toString());
    }

    updateScoreLabel() {
        if (this.scoreLabel) {
            this.scoreLabel.string = '得分: ' + this.score + '  Lv.' + this.level;
        }
    }

    draw() {
        if (!this.graphics) return;

        this.graphics.clear();

        const totalW = this.gridWidth * this.cellSize;
        const totalH = this.gridHeight * this.cellSize;
        const offsetX = -totalW / 2;
        const offsetY = -totalH / 2;

        this.graphics.fillColor = new Color(30, 30, 40, 255);
        this.graphics.rect(offsetX, offsetY, totalW, totalH);
        this.graphics.fill();

        this.graphics.strokeColor = new Color(50, 50, 60, 255);
        this.graphics.lineWidth = 0.5;
        for (let i = 0; i <= this.gridWidth; i++) {
            const x = offsetX + i * this.cellSize;
            this.graphics.moveTo(x, offsetY);
            this.graphics.lineTo(x, offsetY + totalH);
        }
        for (let i = 0; i <= this.gridHeight; i++) {
            const y = offsetY + i * this.cellSize;
            this.graphics.moveTo(offsetX, y);
            this.graphics.lineTo(offsetX + totalW, y);
        }
        this.graphics.stroke();

        this.graphics.fillColor = new Color(255, 60, 60, 255);
        const foodCenterX = offsetX + this.foodPosition.x * this.cellSize + this.cellSize / 2;
        const foodCenterY = offsetY + this.foodPosition.y * this.cellSize + this.cellSize / 2;
        this.graphics.circle(foodCenterX, foodCenterY, this.cellSize / 2 - 2);
        this.graphics.fill();

        if (this.bonusFoodActive) {
            const blink = Math.sin(this.bonusFoodTimer * 8) * 0.3 + 0.7;
            this.graphics.fillColor = new Color(255, 215, 0, 255 * blink);
            const bx = offsetX + this.bonusFoodPos.x * this.cellSize + this.cellSize / 2;
            const by = offsetY + this.bonusFoodPos.y * this.cellSize + this.cellSize / 2;
            this.graphics.circle(bx, by, this.cellSize / 2 - 2);
            this.graphics.fill();
        }

        for (const obs of this.obstacles) {
            this.graphics.fillColor = new Color(100, 100, 110, 255);
            const ox = offsetX + obs.x * this.cellSize + 1;
            const oy = offsetY + obs.y * this.cellSize + 1;
            this.graphics.rect(ox, oy, this.cellSize - 2, this.cellSize - 2);
            this.graphics.fill();
        }

        for (let i = 0; i < this.snakeBody.length; i++) {
            const segment = this.snakeBody[i];
            if (i === 0) {
                this.graphics.fillColor = new Color(80, 220, 80, 255);
            } else {
                const t = i / this.snakeBody.length;
                const r = 40 + t * 20;
                const g = 180 - t * 40;
                const b = 40 + t * 20;
                this.graphics.fillColor = new Color(r, g, b, 255);
            }

            const segX = offsetX + segment.x * this.cellSize;
            const segY = offsetY + segment.y * this.cellSize;
            this.graphics.rect(segX + 1, segY + 1, this.cellSize - 2, this.cellSize - 2);
            this.graphics.fill();
        }

        if (this.isTouching) {
            const ui = this.node.getComponent(UITransform);
            const localStart = ui.convertToNodeSpaceAR(new Vec3(this.touchStartPos.x, this.touchStartPos.y, 0));
            const localEnd = ui.convertToNodeSpaceAR(new Vec3(this.touchCurrentPos.x, this.touchCurrentPos.y, 0));
            const sx = localStart.x, sy = localStart.y;
            const ex = localEnd.x, ey = localEnd.y;
            const dx = ex - sx, dy = ey - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                const nx = dx / dist, ny = dy / dist;
                const segCount = 6;
                for (let i = 0; i < segCount; i++) {
                    const t = i / segCount;
                    const alpha = Math.floor(40 + t * 100);
                    this.graphics.fillColor = new Color(255, 255, 255, alpha);
                    const px = sx + dx * t;
                    const py = sy + dy * t;
                    this.graphics.circle(px, py, 4 - t * 2);
                    this.graphics.fill();
                }

                const arrowSize = 12;
                this.graphics.fillColor = new Color(255, 255, 255, 180);
                this.graphics.moveTo(ex, ey);
                this.graphics.lineTo(ex - nx * arrowSize + ny * arrowSize * 0.5, ey - ny * arrowSize - nx * arrowSize * 0.5);
                this.graphics.lineTo(ex - nx * arrowSize - ny * arrowSize * 0.5, ey - ny * arrowSize + nx * arrowSize * 0.5);
                this.graphics.close();
                this.graphics.fill();

                this.graphics.fillColor = new Color(255, 255, 255, 220);
                this.graphics.circle(ex, ey, 8);
                this.graphics.fill();
            }
        }

        if (this.isTouching) {
            const ui = this.node.getComponent(UITransform);
            const localStart = ui.convertToNodeSpaceAR(new Vec3(this.touchStartPos.x, this.touchStartPos.y, 0));
            const localEnd = ui.convertToNodeSpaceAR(new Vec3(this.touchCurrentPos.x, this.touchCurrentPos.y, 0));
            const sx = localStart.x, sy = localStart.y;
            const ex = localEnd.x, ey = localEnd.y;
            const dx = ex - sx, dy = ey - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                const nx = dx / dist, ny = dy / dist;
                const segCount = 8;
                for (let i = 0; i < segCount; i++) {
                    const t = i / segCount;
                    const alpha = Math.floor(30 + t * 120);
                    this.graphics.fillColor = new Color(255, 255, 255, alpha);
                    const px = sx + dx * t;
                    const py = sy + dy * t;
                    this.graphics.circle(px, py, 5 - t * 3);
                    this.graphics.fill();
                }

                const arrowSize = 14;
                this.graphics.fillColor = new Color(255, 255, 255, 180);
                this.graphics.moveTo(ex, ey);
                this.graphics.lineTo(ex - nx * arrowSize + ny * arrowSize * 0.5, ey - ny * arrowSize - nx * arrowSize * 0.5);
                this.graphics.lineTo(ex - nx * arrowSize - ny * arrowSize * 0.5, ey - ny * arrowSize + nx * arrowSize * 0.5);
                this.graphics.close();
                this.graphics.fill();

                this.graphics.fillColor = new Color(255, 255, 255, 220);
                this.graphics.circle(ex, ey, 9);
                this.graphics.fill();
            }
        }

        if (this.isGameOver) {
            this.graphics.fillColor = new Color(0, 0, 0, 170);
            this.graphics.rect(offsetX, offsetY, totalW, totalH);
            this.graphics.fill();
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }
}