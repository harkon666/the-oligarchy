mod config;
mod error;
mod handlers;
mod indexer;
mod models;
mod repositories;
mod state;
mod utils;

use crate::config::Config;
use axum::{Router, routing::get};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    // Load config
    let config = Config::from_env();
    tracing_subscriber::fmt::init();

    // Database Connection
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_schema_url)
        .await
        .expect("Failed to connect to database");

    // Run Migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    // Initialize State
    let clients: state::Clients = Arc::new(Mutex::new(HashMap::new()));
    let players: state::Players = Arc::new(Mutex::new(HashMap::new()));

    let app_state = state::AppState {
        clients,
        players,
        db: pool.clone(),
    };

    // Spawn Indexer
    let indexer_db = pool.clone();
    let rpc_url = config.rpc_url.clone();

    // Collect all addresses from config
    let contract_addresses = vec![
        config.MOCK_MANTLE_ADDRESS.clone(),
        config.OLIG_TOKEN_ADDRESS.clone(),
        config.GAMESTORE_ADDRESS.clone(),
        config.VEOLIG_ADDRESS.clone(),
        config.OLIG_VOTER_ADDRESS.clone(),
        config.REGION_FARM_ADDRESS.clone(),
        config.WAR_THEATER_ADDRESS.clone(),
    ];

    tokio::spawn(async move {
        indexer::listener::run_indexer(indexer_db, rpc_url, contract_addresses).await;
    });

    // Setup Router
    let app = Router::new()
        .route("/ws", get(handlers::ws::ws_handler))
        .with_state(app_state)
        .layer(TraceLayer::new_for_http());

    // Run Server
    let addr = SocketAddr::from(([127, 0, 0, 1], config.port));
    println!("Server started at ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
