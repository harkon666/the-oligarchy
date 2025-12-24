use dotenvy::dotenv;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: String,
    pub MOCK_MANTLE_ADDRESS: String,
    pub OLIG_TOKEN_ADDRESS: String,
    pub GAMESTORE_ADDRESS: String,
    pub VEOLIG_ADDRESS: String,
    pub OLIG_VOTER_ADDRESS: String,
    pub REGION_FARM_ADDRESS: String,
    pub WAR_THEATER_ADDRESS: String,
    pub database_schema_url: String,
    pub rpc_url: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv().ok();
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let database_schema_url =
            env::var("DATABASE_SCHEMA_URL").expect("DATABASE_SCHEMA_URL must be set");
        let MOCK_MANTLE_ADDRESS = env::var("MOCK_MANTLE_ADDRESS")
            .unwrap_or_else(|_| "0x5FbDB2315678afecb367f032d93F642f64180aa3".to_string());
        let OLIG_TOKEN_ADDRESS = env::var("OLIG_TOKEN_ADDRESS")
            .unwrap_or_else(|_| "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512".to_string());
        let GAMESTORE_ADDRESS = env::var("GAMESTORE_ADDRESS")
            .unwrap_or_else(|_| "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0".to_string());
        let VEOLIG_ADDRESS = env::var("VEOLIG_ADDRESS")
            .unwrap_or_else(|_| "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9".to_string());
        let OLIG_VOTER_ADDRESS = env::var("OLIG_VOTER_ADDRESS")
            .unwrap_or_else(|_| "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0".to_string());
        let REGION_FARM_ADDRESS = env::var("REGION_FARM_ADDRESS")
            .unwrap_or_else(|_| "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707".to_string());
        let WAR_THEATER_ADDRESS = env::var("WAR_THEATER_ADDRESS")
            .unwrap_or_else(|_| "0x0165878A594ca255338adfa4d48449f69242Eb8F".to_string());
        let rpc_url = env::var("RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
        let port = env::var("PORT")
            .unwrap_or_else(|_| "8000".to_string())
            .parse()
            .expect("PORT must be a number");

        Self {
            database_url,
            database_schema_url,
            MOCK_MANTLE_ADDRESS,
            OLIG_TOKEN_ADDRESS,
            GAMESTORE_ADDRESS,
            VEOLIG_ADDRESS,
            OLIG_VOTER_ADDRESS,
            REGION_FARM_ADDRESS,
            WAR_THEATER_ADDRESS,
            rpc_url,
            port,
        }
    }
}
