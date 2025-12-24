use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct User {
    pub wallet_address: String,
    pub balance: BigDecimal,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct IndexerState {
    pub id: i32,
    pub last_processed_block: i64,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}
