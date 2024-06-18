<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <link rel="stylesheet" href="css/index.css">
    
</head>
<body>
    <div class="container">
        <div id="myModal" class="modal">
            <div class="modal-content">
                <img src="kocka.png" alt="Obrázok kocky">
                <div class="player-name-div" id='player-name-div'>
                    <input type="text" id='player-name' placeholder='Your name...'>
                    <button class='button' id='connect-button'>CONNECT</button>
                </div>
            </div>
        </div>

        <div class="score-information" id='score-information'>
            <div class="score-information-content">
                <p class='score-text' id='your-score'></p>
                <p class='score-text' id='opponent-score'></p>
                <p class='score-text' id='remaining-time'>Zostáva 120s</p>
            </div>
        </div>

        <canvas id="game"></canvas>
        <div id="game-status">
            <p id="game-status-text"></p>
            <button class='button' id='go-to-start-button'>Ísť na začiatok</button>
         </div>
    </div>

    <script src='script.js'></script>
</body>
</html>