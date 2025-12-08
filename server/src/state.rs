use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use warp::ws::Message;
use crate::models::Player;

pub type Clients = Arc<Mutex<HashMap<String, mpsc::UnboundedSender<Result<Message, warp::Error>>>>>;
pub type Players = Arc<Mutex<HashMap<String, Player>>>;
