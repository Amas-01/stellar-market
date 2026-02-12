#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Env, String};

#[test]
fn test_create_job() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let user_client = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let token = Address::generate(&env);

    let milestones = vec![
        &env,
        (String::from_str(&env, "Design mockups"), 500_i128),
        (String::from_str(&env, "Frontend implementation"), 1000_i128),
        (String::from_str(&env, "Backend integration"), 1500_i128),
    ];

    let job_id = client.create_job(&user_client, &freelancer, &token, &milestones);
    assert_eq!(job_id, 1);

    let job = client.get_job(&job_id);
    assert_eq!(job.client, user_client);
    assert_eq!(job.freelancer, freelancer);
    assert_eq!(job.total_amount, 3000);
    assert_eq!(job.status, JobStatus::Created);
    assert_eq!(job.milestones.len(), 3);
}

#[test]
fn test_job_count_increments() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EscrowContract);
    let client = EscrowContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let freelancer = Address::generate(&env);
    let token = Address::generate(&env);

    let milestones = vec![
        &env,
        (String::from_str(&env, "Task 1"), 100_i128),
    ];

    let id1 = client.create_job(&user, &freelancer, &token, &milestones);
    let id2 = client.create_job(&user, &freelancer, &token, &milestones);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_job_count(), 2);
}
