<?php
use Workerman\Worker;
use Workerman\Connection\TcpConnection;
require_once __DIR__ . '/vendor/autoload.php';

// Note: Unlike the previous example, use the websocket protocol here
$ws_worker = new Worker("websocket://0.0.0.0:8282");
// Start 4 processes to provide external services
$ws_worker->count = 6;

$ws_worker->onConnect = function($connection) use ($ws_worker) {
    // Pridajte pripojenie do zoznamu
    $ws_worker->connections[$connection->id] = $connection;
    $currentConnections = count($ws_worker->connections);

    $uuid = uniqid();
    $data = [
        "uuid" => $uuid,
        "currentConnections" => $currentConnections
    ];

    $connection->send(json_encode($data));


    // $connection->send(json_encode(["dwad" => $ws_worker->connections]));

    if ($currentConnections == 2) {
        $data = ["game_can_start" => true];
        foreach ($ws_worker->connections as $conn) {
            $conn->send(json_encode($data));
        }
    }
};



$ws_worker->onMessage = function(TcpConnection $connection, $data) use ($ws_worker)
{
    // Prechádzanie všetkými pripojenými klientmi
    foreach ($ws_worker->connections as $conn) {
        // Porovnanie aktuálneho klienta ($connection) s každým pripojeným klientom
        if ($conn !== $connection) {
            // Ak sa pripojený klient nerovná aktuálnemu klientovi, pošlite mu správu
            $conn->send($data);
        }
    }
};


// Run the worker
Worker::runAll();