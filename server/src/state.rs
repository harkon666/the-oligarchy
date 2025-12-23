use crate::models::game::Player;
use axum::extract::ws::Message;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

pub type Clients = Arc<Mutex<HashMap<String, mpsc::UnboundedSender<Result<Message, axum::Error>>>>>;
pub type Players = Arc<Mutex<HashMap<String, Player>>>;

#[derive(Clone)]
pub struct AppState {
    pub clients: Clients,
    pub players: Players,
    pub db: sqlx::PgPool,
}
