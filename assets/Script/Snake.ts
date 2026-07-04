import { Vec2 } from 'cc';

enum Direction {
    UP,
    DOWN,
    LEFT,
    RIGHT
}

export class Snake {
    body: Vec2[] = [];
    direction: Vec2 = new Vec2(1, 0);
    private gridWidth: number;
    private gridHeight: number;

    constructor(gridWidth: number, gridHeight: number) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.reset();
    }

    reset() {
        const startX = Math.floor(this.gridWidth / 2);
        const startY = Math.floor(this.gridHeight / 2);
        this.body = [
            new Vec2(startX, startY),
            new Vec2(startX - 1, startY),
            new Vec2(startX - 2, startY),
        ];
        this.direction = new Vec2(1, 0);
    }

    getHead(): Vec2 {
        return this.body[0];
    }

    setDirection(newDir: Vec2) {
        if (newDir.x + this.direction.x !== 0 || newDir.y + this.direction.y !== 0) {
            this.direction = newDir;
        }
    }

    move(): Vec2 {
        const head = this.getHead();
        const newHead = new Vec2(head.x + this.direction.x, head.y + this.direction.y);
        this.body.unshift(newHead);
        return newHead;
    }

    shrink() {
        this.body.pop();
    }

    checkWallCollision(): boolean {
        const head = this.getHead();
        return head.x < 0 || head.x >= this.gridWidth ||
               head.y < 0 || head.y >= this.gridHeight;
    }

    checkSelfCollision(): boolean {
        const head = this.getHead();
        for (let i = 1; i < this.body.length; i++) {
            if (this.body[i].x === head.x && this.body[i].y === head.y) {
                return true;
            }
        }
        return false;
    }

    occupies(x: number, y: number): boolean {
        for (const seg of this.body) {
            if (seg.x === x && seg.y === y) {
                return true;
            }
        }
        return false;
    }
}