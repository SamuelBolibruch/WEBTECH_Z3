const connectButton = document.getElementById('connect-button');
const startModal = document.getElementById('myModal');
const playerNameInput = document.getElementById('player-name');
const addPlayerField = document.getElementById('player-name-div');
const scoreInformationDiv = document.getElementById('score-information');
const playerScoreField = document.getElementById('your-score');
const opponentScoreField = document.getElementById('opponent-score');
const canvas = document.getElementById('game');
const context = canvas.getContext('2d');
const gameStatusDiv = document.getElementById('game-status');
const gameStatusText = document.getElementById('game-status-text');
const goToStartButton = document.getElementById('go-to-start-button');
const timeField = document.getElementById('remaining-time');

canvas.width = 1200;
canvas.height = 1000;
const squareSize = 20;
const rows = canvas.height / squareSize;
const cols = canvas.width / squareSize;
var squares = [];

for (let i = 0; i < rows; i++) {
    squares[i] = []; // Vytvorenie vnoreného poľa pre každý riadok

    for (let j = 0; j < cols; j++) {
        // Vytvorenie objektu reprezentujúceho štvorček s danými parametrami
        squares[i][j] = {
            x: j * squareSize, // x-ová pozícia (stĺpec)
            y: i * squareSize, // y-ová pozícia (riadok)
            size: squareSize,  // Veľkosť štvorčeka
            color: null, // Farba štvorčeka
            player: null, // Hráč, ktorému patrí štvorček (začiatočne je null)
            type: null
        };
    }
}

var intervalId = '';
var timerIntervalId = '';
var gameTime = 120;

var playerName = '';
var playerID = '';
var playerColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
var playerPosition = { row: 0, col: 0 }; // Pozícia hráča na začiatku hry
var direction = { row: 0, col: 0 };
var oldDirection = { row: 0, col: 0 };
var playerPath = [];
var isInside;
var playerMovementColor = 'green';
var changeDirectionCount = 0;

var opponentName = '';
var opponentID = '';
var opponentColor = '';
var opponentMovementColor = 'red';
var opponentPosition = { row: 0, col: 0 }; // Pozícia hráča na začiatku hry

let ws;

connectButton.addEventListener('click', () => {
    ws = new WebSocket("wss://node20.webte.fei.stuba.sk/wss");
    playerName = playerNameInput.value;
    addPlayerField.innerHTML = 'You have to wait for second player...';

    ws.onmessage = function (e) {
        data = JSON.parse(e.data);
        // console.log(data);
        if (data.uuid) {
            console.log(data);

            playerID = data.uuid;
        } else if (data.game_can_start == true) {
            startModal.style.display = 'none';
            canvas.style.display = 'block';
            scoreInformationDiv.style.display = 'block';

            var filledSquares = assignInitialSquareArea(playerID);
            playerPosition.row = filledSquares[4].row;
            playerPosition.col = filledSquares[4].col;

            const message = {
                type: 'opponent-info',
                playerName: playerName,
                playerID: playerID,
                playerColor: playerColor,
                area: filledSquares
            };

            ws.send(JSON.stringify(message));
        } else if (data.type === 'opponent-info') {

            opponentName = data.playerName;
            opponentID = data.playerID;
            opponentColor = data.playerColor;
            setRandomDirection();

            data.area.forEach(square => {
                // Získame súradnice štvorca v poli squares
                const squareX = square.col;
                const squareY = square.row;

                // Nastavíme farbu a hráča pre daný štvorec v poli squares
                squares[squareY][squareX].color = opponentColor;
                squares[squareY][squareX].player = opponentID;
                squares[squareY][squareX].type = "opponent-area";
            });
            intervalId = setInterval(movePlayer, 200);
            timerIntervalId = setInterval(timerFunction, 1000);
            updateScoreInformation();
            redrawCanvas();
            drawPlayer(playerPosition.row, playerPosition.col, playerMovementColor);
            // console.log(data);
            // drawPlayer(data.position.row, data.position.col, opponentMovementColor);
        } else if (data.type === 'opponent-move') {
            var square = squares[data.position.row][data.position.col]
            square.color = opponentColor;
            square.player = opponentID;
            square.type = "opponent-path";
            opponentPosition.row = data.position.row;
            opponentPosition.col = data.position.col;
            drawPlayer(data.position.row, data.position.col, opponentMovementColor);
        } else if (data.type === 'opponent-path-closed') {
            data.path.forEach((position) => {
                squares[position.row][position.col].type = 'opponent-area';
                squares[position.row][position.col].player = opponentID;
            });
            updateScoreInformation();
        } else if (data.type === 'opponent-area') {
            squares[data.square.row][data.square.col].type = 'opponent-area';
            squares[data.square.row][data.square.col].player = opponentID;
            squares[data.square.row][data.square.col].color = opponentColor
            redrawCanvas();
            // drawPlayer(data.position.row, data.position.col, opponentMovementColor);

        } else if (data.type === 'win-message') {
            displayGameStatus('Vyhral si, súper sa zabil sám!');
            clearInterval(intervalId);
            clearInterval(timerIntervalId);
        } else if (data.type === 'lost-message') {
            if (data.cause === 'eaten-by-opponent') {
                displayGameStatus('Prehral si, súper zabral celú tvoju oblasť!');
            } else {
                displayGameStatus('Prehral si, bol si zneškodený súperom!');
            }
            clearInterval(intervalId);
            clearInterval(timerIntervalId);
        }

    }
});

function redrawCanvas() {
    // Vyčistíme plátno
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Iterujeme cez všetky štvorce a vykreslíme ich, ak majú definovanú farbu
    squares.forEach(row => {
        row.forEach(square => {
            if (square.color !== null) {
                drawSquare(context, square);
            }
        });
    });
}

function drawPlayer(row, col, color) {
    context.fillStyle = color; // Nastavenie farby vyplňovania na farbu štvorčeka
    context.fillRect(col * squareSize, row * squareSize, squareSize, squareSize); // Vykreslenie štvorčeka na základe jeho vlastností
}

function drawSquare(context, square) {
    if (square.type === 'my-path' || square.type === 'opponent-path') {
        context.globalAlpha = 0.5; // Nastavenie úrovne priehľadnosti na 50% (hodnota medzi 0 a 1)
    }
    context.fillStyle = square.color; // Nastavenie farby vyplňovania na farbu štvorčeka
    context.fillRect(square.x, square.y, square.size, square.size); // Vykreslenie štvorčeka na základe jeho vlastností
    context.globalAlpha = 1; // Resetovanie úrovne priehľadnosti na pôvodnú hodnotu
}

function assignInitialSquareArea(playerID) {
    // Nahodne vyberieme indexy pre štvorec 3x3 na plátne
    const startX = Math.floor(Math.random() * (cols - 2));
    const startY = Math.floor(Math.random() * (rows - 2));

    const playerSquares = []; // Pole štvorcov pre hráča

    // Iterujeme cez vybranú oblasť 3x3 a nastavíme farbu a hráča pre každý štvorec
    for (let i = startY; i < startY + 3; i++) {
        for (let j = startX; j < startX + 3; j++) {
            squares[i][j].color = playerColor;
            squares[i][j].player = playerID;
            squares[i][j].type = "my-area";

            // Pridáme indexy štvorca do poľa pre hráča
            playerSquares.push({ row: i, col: j });
        }
    }

    // Vrátime pole indexov štvorcov pre hráča
    return playerSquares;
}

document.addEventListener('keydown', function (event) {
    let newDirection = { row: direction.row, col: direction.col };

    switch (event.key) {
        case 'ArrowUp':
            newDirection.row = -1;
            newDirection.col = 0;
            break;
        case 'ArrowDown':
            newDirection.row = 1;
            newDirection.col = 0;
            break;
        case 'ArrowLeft':
            newDirection.row = 0;
            newDirection.col = -1;
            break;
        case 'ArrowRight':
            newDirection.row = 0;
            newDirection.col = 1;
            break;
    }

    // Kontrola, či sa nejedná o opačný smer
    if (!(direction.row === -newDirection.row && direction.col === -newDirection.col)) {
        direction = newDirection;
    }
});

function setRandomDirection() {
    const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const randomIndex = Math.floor(Math.random() * directions.length);
    const randomDirection = directions[randomIndex];

    switch (randomDirection) {
        case 'ArrowUp':
            direction.row = -1;
            direction.col = 0;
            break;
        case 'ArrowDown':
            direction.row = 1;
            direction.col = 0;
            break;
        case 'ArrowLeft':
            direction.row = 0;
            direction.col = -1;
            break;
        case 'ArrowRight':
            direction.row = 0;
            direction.col = 1;
            break;
    }
}

function movePlayer() {
    if (0 <= playerPosition.row + direction.row && playerPosition.row + direction.row <= rows - 1 && 0 <= playerPosition.col + direction.col && playerPosition.col + direction.col <= cols - 1) {
        playerPosition.row += direction.row;
        playerPosition.col += direction.col;
        var square = squares[playerPosition.row][playerPosition.col];
        if (square.type === 'my-path') {
            const message = {
                type: 'win-message',
            };

            ws.send(JSON.stringify(message));

            displayGameStatus('Prehral si, prešiel si po vlastnej ceste!');

            clearInterval(intervalId);
            clearInterval(timerIntervalId);
        } else if (square.type === 'opponent-path') {
            const message = {
                type: 'lost-message',
            };

            ws.send(JSON.stringify(message));

            displayGameStatus('Vyhral si, zneškodnil si súpera!');
            clearInterval(intervalId);
            clearInterval(timerIntervalId);
        }
        if (square.type !== 'my-area') {
            var newPosition = { row: playerPosition.row, col: playerPosition.col };

            const message = {
                type: 'opponent-move',
                position: playerPosition
            };

            ws.send(JSON.stringify(message));
            square.color = playerColor;
            square.player = playerID;
            square.type = 'my-path';

            playerPath.push(newPosition);
        } else if (square.type === 'my-area' && playerPath.length !== 0) {
            // Zistite hraničné body uzavretej oblasti
            const closedAreaBounds = findClosedAreaBounds(playerPath);
            if (closedAreaBounds) {
                floodFillClosedArea(closedAreaBounds, playerColor);
            }
            playerPath.forEach((position) => {
                squares[position.row][position.col].type = 'my-area';
                squares[position.row][position.col].player = playerID;
            });

            const message = {
                type: 'opponent-path-closed',
                path: playerPath
            };

            ws.send(JSON.stringify(message));

            updateScoreInformation();
            playerPath = [];
        }
        // console.log(playerPath);
    }
    redrawCanvas();
    drawPlayer(playerPosition.row, playerPosition.col, playerMovementColor);
    // drawPlayer(data.position.row, data.position.col, opponentMovementColor);
}

// Kontrola farby okolo oblasti
function checkBoundaryColor(bounds, color) {
    const { minRow, maxRow, minCol, maxCol } = bounds;
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            if ((row === minRow || row === maxRow || col === minCol || col === maxCol) && squares[row][col].color !== color) {
                return false; // Farba okolo oblasti nie je rovnaká ako požadovaná farba
            }
        }
    }
    return true; // Farba okolo oblasti je rovnaká ako požadovaná farba
}

function floodFillClosedArea(bounds, fillColor) {
    // Vytvorenie polí pre prvý a posledný riadok, prvý a posledný stĺpec
    const firstRow = [];
    const lastRow = [];
    const firstCol = [];
    const lastCol = [];

    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        firstRow.push(squares[bounds.minRow][col]);
        lastRow.push(squares[bounds.maxRow][col]);
    }

    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        firstCol.push(squares[row][bounds.minCol]);
        lastCol.push(squares[row][bounds.maxCol]);
    }

    // Funkcia na overenie, či pole obsahuje iba prvky typu 'my-path' alebo 'my-area'
    function checkAllValid(arr) {
        return arr.every(square => square.type === 'my-path' || square.type === 'my-area');
    }

    // Počet platných prvých a posledných riadkov a stĺpcov
    const validFirstRow = checkAllValid(firstRow);
    const validLastRow = checkAllValid(lastRow);
    const validFirstCol = checkAllValid(firstCol);
    const validLastCol = checkAllValid(lastCol);

    // Ak aspoň tri zo štyroch strán sú platné, pokračuj
    if ((validFirstRow ? 1 : 0) + (validLastRow ? 1 : 0) + (validFirstCol ? 1 : 0) + (validLastCol ? 1 : 0) >= 3) {
        // Vykonaj flood-fill operáciu
        for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
            for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                if (squares[row][col].type !== 'my-area') {
                    floodFillIterative(row, col, squares[row][col].color, fillColor);
                }
            }
        }
    } else {
        // console.log(firstRow);
        // console.log(lastRow);
        // console.log(firstCol);
        // console.log(lastCol);
        // console.log("Chyba: Niektoré strany oblasti nie sú platné.");
    }
}


function findClosedAreaBounds(path) {
    // Zjednodušený prístup k nájdeniu rozsahov uzavretej oblasti
    let minRow = rows, maxRow = 0, minCol = cols, maxCol = 0;
    path.forEach(pos => {
        if (pos.row < minRow) minRow = pos.row;
        if (pos.row > maxRow) maxRow = pos.row;
        if (pos.col < minCol) minCol = pos.col;
        if (pos.col > maxCol) maxCol = pos.col;
    });
    return { minRow, maxRow, minCol, maxCol };
}

function floodFillIterative(startRow, startCol, targetColor, fillColor) {
    // Zásobník na ukladanie pozícií na spracovanie
    let stack = [{ row: startRow, col: startCol }];

    while (stack.length > 0) {
        let { row, col } = stack.pop();

        // Skontrolujte, či aktuálna pozícia je vo vnútri plátna
        if (row >= 0 && row < rows && col >= 0 && col < cols) {
            if (squares[row][col].color === targetColor && squares[row][col].color !== fillColor) {
                squares[row][col].color = fillColor;
                squares[row][col].player = playerID;
                squares[row][col].type = "my-area";
                var squarePosition = { row: row, col: col };

                const message = {
                    type: 'opponent-area',
                    square: squarePosition
                };

                ws.send(JSON.stringify(message));

                // Pridajte susedné štvorce do zásobníka
                stack.push({ row: row - 1, col: col });
                stack.push({ row: row + 1, col: col });
                stack.push({ row: row, col: col - 1 });
                stack.push({ row: row, col: col + 1 });
            }
        }
    }
}

function findAndFillClosedArea(row, col, targetColor, fillColor) {
    // Over, či sme mimo rozsahu mriežky alebo už sme navštívili tento štvorec
    if (row < 0 || row >= rows || col < 0 || col >= cols || squares[row][col].color !== targetColor) {
        return;
    }

    // Nastavíme farbu štvorca na plátne
    squares[row][col].color = fillColor;


    // Rekurzívne zavoláme funkciu na štvorce v okolí
    findAndFillClosedArea(row - 1, col, targetColor, fillColor); // Hore
    findAndFillClosedArea(row + 1, col, targetColor, fillColor); // Dole
    findAndFillClosedArea(row, col - 1, targetColor, fillColor); // Vľavo
    findAndFillClosedArea(row, col + 1, targetColor, fillColor); // Vpravo
}

canvas.addEventListener('click', function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Získame súradnice štvorca v mriežke
    const col = Math.floor(x / squareSize);
    const row = Math.floor(y / squareSize);
    console.log(col + ', ' + row);
    console.log(squares[row][col].type);
    // Získame farbu kliknutého štvorca
    // const targetColor = squares[row][col].color;

    // // Ak je štvorec nevyfarbený, vykonáme floodfill algoritmus
    // if (targetColor === null) {
    //     findAndFillClosedArea(row, col, targetColor, playerColor);
    //     redrawCanvas(); // Prekreslíme plátno s novou farbou
    // }
});

function calculateAreaPercentages() {
    let totalSquares = squares.length * squares[0].length;
    let myAreaCount = 0;
    let opponentAreaCount = 0;

    // Prechádzanie cez všetky štvorce a počítanie počtu pre každý typ
    for (let i = 0; i < squares.length; i++) {
        for (let j = 0; j < squares[i].length; j++) {
            if (squares[i][j].type === 'my-area') {
                myAreaCount++;
            } else if (squares[i][j].type === 'opponent-area') {
                opponentAreaCount++;
            }
        }
    }

    // Vypočítanie percentuálnych podielov
    let myAreaPercentage = (myAreaCount / totalSquares) * 100;
    let opponentAreaPercentage = (opponentAreaCount / totalSquares) * 100;

    if (opponentAreaPercentage === 0.00) {
        displayGameStatus(`Vyhral si, zjedol si celé súperové územie!<br><br>Tvoje skóre je: ${myAreaPercentage.toFixed(2)}%`);
        clearInterval(intervalId);
        clearInterval(timerIntervalId);

        const message = {
            type: 'lost-message',
            cause: 'eaten-by-opponent'
        };

        ws.send(JSON.stringify(message));
    }

    return {
        'my-area': myAreaPercentage.toFixed(2) + '%',
        'opponent-area': opponentAreaPercentage.toFixed(2) + '%'
    };
}

function updateScoreInformation() {
    const areaPercentages = calculateAreaPercentages();

    const myAreaPercentage = areaPercentages['my-area'];
    const opponentAreaPercentage = areaPercentages['opponent-area'];

    playerScoreField.textContent = `${playerName}: ${myAreaPercentage}`;
    playerScoreField.style.color = playerMovementColor; // Nastavenie farby textu na modrú

    opponentScoreField.textContent = `${opponentName}: ${opponentAreaPercentage}`;
    opponentScoreField.style.color = opponentMovementColor;
}

function displayGameStatus(text) {
    gameStatusDiv.style.display = 'flex';
    gameStatusText.innerHTML = text;
}

goToStartButton.addEventListener('click', () => {
    location.reload();
});

function timerFunction() {
    gameTime--;
    timeField.textContent = `Zostáva: ${gameTime}s.`;
    if (gameTime === 0) {
        clearInterval(timerIntervalId);
        clearInterval(intervalId);

        var score = calculateAreaPercentages();
        myScore = parseFloat(score['my-area'].replace('%', ''));
        opponentScore = parseFloat(score['opponent-area'].replace('%', ''));

        if(myScore === opponentScore) {
            displayGameStatus('Uplynul čas, na základe skóre je remíza!')
        } else if (myScore >= opponentScore) {
            displayGameStatus(`Uplynul čas, vyhral si so získaním ${score['my-area']} plochy!`);
        } else if (myScore <= opponentScore) {
            displayGameStatus(`Uplynul čas, prehral si, oponent získal ${score['opponent-area']} plochy!`);
        }
    }
}

