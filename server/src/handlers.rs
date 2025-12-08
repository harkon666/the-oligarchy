use crate::models::{GameMessage, Player};
use crate::state::{Clients, Players};
use futures::{FutureExt, StreamExt};
use tokio::sync::mpsc;
use uuid::Uuid;
use warp::ws::{Message, WebSocket};

pub async fn client_connection(ws: WebSocket, clients: Clients, players: Players) {
    let (client_ws_sender, mut client_ws_rcv) = ws.split();
    let (client_sender, client_rcv) = mpsc::unbounded_channel();

    let client_rcv = tokio_stream::wrappers::UnboundedReceiverStream::new(client_rcv);
    tokio::task::spawn(client_rcv.forward(client_ws_sender).map(|result| {
        if let Err(e) = result {
            eprintln!("error sending websocket msg: {}", e);
        }
    }));

    let id = Uuid::new_v4().to_string();
    let new_player = Player {
        id: id.clone(),
        x: 640.0,
        y: 360.0,
        anim: "idle-down".to_string(),
        scene: "CapitalScene".to_string(),
    };

    {
        clients.lock().unwrap().insert(id.clone(), client_sender);
        players
            .lock()
            .unwrap()
            .insert(id.clone(), new_player.clone());
    }

    println!("{} connected", id);

    let welcome_msg = GameMessage::Welcome { id: id.clone() };
    if let Ok(json) = serde_json::to_string(&welcome_msg) {
        if let Some(sender) = clients.lock().unwrap().get(&id) {
            let _ = sender.send(Ok(Message::text(json)));
        }
    }

    let current_players_msg = GameMessage::CurrentPlayers {
        players: players.lock().unwrap().clone(),
    };
    if let Ok(json) = serde_json::to_string(&current_players_msg) {
        if let Some(sender) = clients.lock().unwrap().get(&id) {
            let _ = sender.send(Ok(Message::text(json)));
        }
    }

    let new_player_msg = GameMessage::NewPlayer {
        id: id.clone(),
        player: new_player.clone(),
    };
    // broadcast_message(&new_player_msg, &id, &clients); // REMOVED as per fix

    while let Some(result) = client_ws_rcv.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("error receiving ws message for id: {}): {}", id, e);
                break;
            }
        };

        if let Ok(text) = msg.to_str() {
            match serde_json::from_str::<GameMessage>(text) {
                Ok(parsed) => {
                    match parsed {
                        GameMessage::Move { x, y, anim, scene } => {
                            if let Some(player) = players.lock().unwrap().get_mut(&id) {
                                player.x = x;
                                player.y = y;
                                player.anim = anim.clone();
                                player.scene = scene.clone();
                            }

                            let move_msg = GameMessage::PlayerMoved {
                                id: id.clone(),
                                x,
                                y,
                                anim,
                                scene,
                            };
                            broadcast_message(&move_msg, &id, &clients);
                        }
                        GameMessage::Chat { message, .. } => {
                            let chat_msg = GameMessage::Chat {
                                id: id.clone(),
                                message,
                            };
                            broadcast_message(&chat_msg, &id, &clients);
                        }
                        _ => {}
                    }
                }
                Err(e) => {
                    eprintln!("Failed to parse message: {} - Error: {}", text, e);
                }
            }
        }
    }

    {
        clients.lock().unwrap().remove(&id);
        players.lock().unwrap().remove(&id);
    }
    println!("{} disconnected", id);

    let disconnect_msg = GameMessage::UserDisconnected { id: id.clone() };
    broadcast_message(&disconnect_msg, &id, &clients);
}

fn broadcast_message(msg: &GameMessage, skip_id: &str, clients: &Clients) {
    if let Ok(json) = serde_json::to_string(msg) {
        let clients_guard = clients.lock().unwrap();
        for (id, sender) in clients_guard.iter() {
            if id != skip_id {
                let _ = sender.send(Ok(Message::text(json.clone())));
            }
        }
    }
}
