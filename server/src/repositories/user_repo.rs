// use crate::error::AppError;
// use crate::models::user::User;
use anyhow::Result;
use sqlx::PgPool;

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_or_update_user(
        &self,
        wallet_address: String,
        balance: String,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO users (wallet_address, balance, updated_at)
            VALUES ($1, $2::numeric, NOW())
            ON CONFLICT (wallet_address) 
            DO UPDATE SET balance = users.balance + $2::numeric, updated_at = NOW()
            "#,
        )
        .bind(wallet_address)
        .bind(balance)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // pub async fn find_user(&self, wallet_address: &str) -> Result<Option<User>, AppError> {
    //     let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE wallet_address = $1")
    //         .bind(wallet_address)
    //         .fetch_optional(&self.pool)
    //         .await?;

    //     Ok(user)
    // }
}
