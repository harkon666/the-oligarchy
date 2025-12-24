use crate::models::game::{GameMessage, Player};
use crate::state::{AppState, Clients, Players};
use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
};
use futures::{FutureExt, StreamExt};
use tokio::sync::mpsc;
use uuid::Uuid;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(ws: WebSocket, state: AppState) {
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
        state.clients.lock().unwrap().insert(id.clone(), client_sender);
        state.players
            .lock()
            .unwrap()
            .insert(id.clone(), new_player.clone());
    }

    println!("{} connected", id);

    let welcome_msg = GameMessage::Welcome { id: id.clone() };
    if let Ok(json) = serde_json::to_string(&welcome_msg) {
        if let Some(sender) = state.clients.lock().unwrap().get(&id) {
            let _ = sender.send(Ok(Message::Text(json)));
        }
    }

    let current_players_msg = GameMessage::CurrentPlayers {
        players: state.players.lock().unwrap().clone(),
    };
    if let Ok(json) = serde_json::to_string(&current_players_msg) {
        if let Some(sender) = state.clients.lock().unwrap().get(&id) {
            let _ = sender.send(Ok(Message::Text(json)));
        }
    }

    let new_player_msg = GameMessage::NewPlayer {
        id: id.clone(),
        player: new_player.clone(),
    };
    broadcast_message(&new_player_msg, &id, &state.clients, &state.players, Some(&new_player.scene));

    while let Some(result) = client_ws_rcv.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("error receiving ws message for id: {}): {}", id, e);
                break;
            }
        };

        if let Ok(text) = msg.to_text() {
            match serde_json::from_str::<GameMessage>(text) {
                Ok(parsed) => {
                    match parsed {
                        GameMessage::Move { x, y, anim, scene } => {
                            if let Some(player) = state.players.lock().unwrap().get_mut(&id) {
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
                                scene: scene.clone(),
                            };
                            broadcast_message(&move_msg, &id, &state.clients, &state.players, Some(&scene));
                        }
                        GameMessage::Chat { message, .. } => {
                            let scene = {
                                let p = state.players.lock().unwrap();
                                p.get(&id).map(|p| p.scene.clone())
                            };

                            if let Some(scene) = scene {
                                let chat_msg = GameMessage::Chat {
                                    id: id.clone(),
                                    message,
                                };
                                broadcast_message(&chat_msg, &id, &state.clients, &state.players, Some(&scene));
                            }
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

    let scene = {
        state.players.lock().unwrap().get(&id).map(|p| p.scene.clone())
    };

    {
        state.clients.lock().unwrap().remove(&id);
        state.players.lock().unwrap().remove(&id);
    }
    println!("{} disconnected", id);

    let disconnect_msg = GameMessage::UserDisconnected { id: id.clone() };
    broadcast_message(&disconnect_msg, &id, &state.clients, &state.players, scene.as_deref());
}

fn broadcast_message(
    msg: &GameMessage,
    skip_id: &str,
    clients: &Clients,
    players: &Players,
    target_scene: Option<&str>,
) {
    if let Ok(json) = serde_json::to_string(msg) {
        let clients_guard = clients.lock().unwrap();
        let players_guard = players.lock().unwrap();

        for (id, sender) in clients_guard.iter() {
            if id != skip_id {
                let should_send = if let Some(scene) = target_scene {
                    if let Some(player) = players_guard.get(id) {
                        player.scene == scene
                    } else {
                        false
                    }
                } else {
                    true
                };

                if should_send {
                    let _ = sender.send(Ok(Message::Text(json.clone())));
                }
            }
        }
    }
}
