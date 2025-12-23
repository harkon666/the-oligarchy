use crate::indexer::contract::{Deposit, Mint, Transfer, Withdraw};
use crate::repositories::user_repo::UserRepository;
use alloy::sol_types::SolEvent;

use alloy::{
    providers::{Provider, ProviderBuilder, RootProvider},
    rpc::types::Filter,
    transports::http::{Client, Http},
};
use anyhow::Result;
use sqlx::{PgPool, Row};
use std::{str::FromStr, time::Duration};
use tokio::time::sleep;
use url::Url;

pub async fn run_indexer(db: PgPool, rpc_url: String, contract_addresses: Vec<String>) {
    println!("Starting Indexer Service...");
    println!("RPC URL: {}", rpc_url);
    println!("Contract Addresses: {:?}", contract_addresses);

    let url = Url::parse(&rpc_url).expect("Invalid RPC URL");
    let provider = ProviderBuilder::new().on_http(url);

    let contract_addrs: Vec<alloy::primitives::Address> = contract_addresses
        .iter()
        .map(|addr| {
            alloy::primitives::Address::from_str(addr)
                .expect(&format!("Invalid Contract Address: {}", addr))
        })
        .collect();
    let user_repo = UserRepository::new(db.clone());

    loop {
        if let Err(e) = process_blocks(&provider, &db, &user_repo, &contract_addrs).await {
            eprintln!("Indexer Error: {:?}", e);
            sleep(Duration::from_secs(3)).await; // Retry delay
        }
        sleep(Duration::from_secs(2)).await; // Polling interval
    }
}

async fn process_blocks(
    provider: &RootProvider<Http<Client>>,
    db: &PgPool,
    user_repo: &UserRepository,
    contract_addrs: &[alloy::primitives::Address],
) -> Result<()> {
    // 1. Get current block number from chain
    let current_block = provider.get_block_number().await?;

    // 2. Get last processed block from DB
    let last_processed_block: i64 =
        sqlx::query("SELECT last_processed_block FROM indexer_state WHERE id = 1")
            .fetch_one(db)
            .await?
            .get("last_processed_block");

    let last_processed_block = last_processed_block as u64;

    // Handle Chain Reset (Dev Environment)
    if current_block < last_processed_block {
        println!(
            "⚠️  Chain Reset Detected! (Current: {}, Last: {})",
            current_block, last_processed_block
        );
        println!("Resetting indexer status...");
        sqlx::query(
            "UPDATE indexer_state SET last_processed_block = 0, updated_at = NOW() WHERE id = 1",
        )
        .execute(db)
        .await?;
        return Ok(());
    }

    if current_block <= last_processed_block {
        return Ok(());
    }

    println!(
        "Indexing blocks {} to {}",
        last_processed_block + 1,
        current_block
    );

    // 3. Query Logs for each contract
    for &contract_addr in contract_addrs {
        // Remove specific event filters to ensure we catch everything matching the address
        let filter = Filter::new()
            .address(contract_addr)
            .from_block(last_processed_block + 1)
            .to_block(current_block);

        let logs = provider.get_logs(&filter).await?;

        for log in logs {
            let topic = log.topics().first();

            match topic {
                // Some(&Transfer::SIGNATURE_HASH) => {
                //     if let Ok(event) = log.log_decode::<Transfer>() {
                //         // If from is 0x0...0, it's a mint
                //         if event.inner.from == alloy::primitives::Address::ZERO {
                //             println!(
                //                 "Found Mint (Transfer) on contract {:?}: to={:?}, amount={:?}",
                //                 contract_addr, event.inner.to, event.inner.value
                //             );
                //         }
                //     }
                // }
                Some(&Deposit::SIGNATURE_HASH) => {
                    if let Ok(event) = log.log_decode::<Deposit>() {
                        println!(
                            "Found Deposit on contract {:?}: user={:?}, pid={:?}, amount={:?}",
                            contract_addr, event.inner.user, event.inner.pid, event.inner.amount
                        );
                        user_repo
                            .create_or_update_user(
                                event.inner.user.to_string(),
                                event.inner.amount.to_string(),
                            )
                            .await?;
                    }
                }
                Some(&Withdraw::SIGNATURE_HASH) => {
                    if let Ok(event) = log.log_decode::<Withdraw>() {
                        let negative_amount = format!("-{}", event.inner.amount);
                        println!(
                            "Found Withdraw on contract {:?}: user={:?}, pid={:?}, amount={:?}, tax={:?}",
                            contract_addr,
                            event.inner.user,
                            event.inner.pid,
                            event.inner.amount,
                            event.inner.tax
                        );
                        user_repo
                            .create_or_update_user(
                                event.inner.user.to_string(),
                                negative_amount.to_string(),
                            )
                            .await?;
                    }
                }
                // Some(&Mint::SIGNATURE_HASH) => {
                //     if let Ok(event) = log.log_decode::<Mint>() {
                //         println!(
                //             "Found Legacy Mint on contract {:?}: wallet={:?}, amount={:?}",
                //             contract_addr, event.inner.wallet, event.inner.initialBalance
                //         );
                //         user_repo
                //             .create_or_update_user(
                //                 event.inner.wallet.to_string(),
                //                 event.inner.initialBalance.to_string(),
                //             )
                //             .await?;
                //     }
                // }
                _ => {
                    // println!("Unknown event on contract {:?}", contract_addr);
                }
            }
        }
    }

    // 5. Update Indexer State
    sqlx::query(
        "UPDATE indexer_state SET last_processed_block = $1, updated_at = NOW() WHERE id = 1",
    )
    .bind(current_block as i64)
    .execute(db)
    .await?;

    Ok(())
}
