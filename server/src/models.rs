use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Player {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub anim: String,
    pub scene: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum GameMessage {
    #[serde(rename = "move")]
    Move { x: f32, y: f32, anim: String, scene: String },
    #[serde(rename = "currentPlayers")]
    CurrentPlayers { players: HashMap<String, Player> },
    #[serde(rename = "newPlayer")]
    NewPlayer { id: String, player: Player },
    #[serde(rename = "playerMoved")]
    PlayerMoved {
        id: String,
        x: f32,
        y: f32,
        anim: String,
        scene: String,
    },
    #[serde(rename = "userDisconnected")]
    UserDisconnected { id: String },
    #[serde(rename = "chat")]
    Chat { id: String, message: String },
    #[serde(rename = "welcome")]
    Welcome { id: String },
}
