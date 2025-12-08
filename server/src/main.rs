mod handlers;
mod models;
mod state;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use warp::Filter;

#[tokio::main]
async fn main() {
    let clients: state::Clients = Arc::new(Mutex::new(HashMap::new()));
    let players: state::Players = Arc::new(Mutex::new(HashMap::new()));

    let clients_filter = warp::any().map(move || clients.clone());
    let players_filter = warp::any().map(move || players.clone());

    let ws_route = warp::path("ws")
        .and(warp::ws())
        .and(clients_filter)
        .and(players_filter)
        .map(|ws: warp::ws::Ws, clients, players| {
            ws.on_upgrade(move |socket| handlers::client_connection(socket, clients, players))
        });

    println!("Server started at ws://127.0.0.1:8000/ws");
    warp::serve(ws_route).run(([127, 0, 0, 1], 8000)).await;
}
