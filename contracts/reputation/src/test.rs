#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_submit_review() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let reviewer = Address::generate(&env);
    let reviewee = Address::generate(&env);

    client.submit_review(
        &reviewer,
        &reviewee,
        &1u64,
        &4u32,
        &String::from_str(&env, "Great work!"),
        &10_i128,
    );

    let rep = client.get_reputation(&reviewee);
    assert_eq!(rep.review_count, 1);
    assert_eq!(rep.total_score, 40); // 4 * 10 weight
    assert_eq!(rep.total_weight, 10);
}

#[test]
fn test_average_rating() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let reviewer1 = Address::generate(&env);
    let reviewer2 = Address::generate(&env);
    let reviewee = Address::generate(&env);

    // Review 1: 5 stars, weight 10
    client.submit_review(
        &reviewer1,
        &reviewee,
        &1u64,
        &5u32,
        &String::from_str(&env, "Excellent"),
        &10_i128,
    );

    // Review 2: 3 stars, weight 10
    client.submit_review(
        &reviewer2,
        &reviewee,
        &2u64,
        &3u32,
        &String::from_str(&env, "Average"),
        &10_i128,
    );

    let avg = client.get_average_rating(&reviewee);
    // (5*10 + 3*10) * 100 / (10 + 10) = 8000 / 20 = 400 (4.00 stars)
    assert_eq!(avg, 400);
    assert_eq!(client.get_review_count(&reviewee), 2);
}

#[test]
#[should_panic]
fn test_invalid_rating() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let reviewer = Address::generate(&env);
    let reviewee = Address::generate(&env);

    client.submit_review(
        &reviewer,
        &reviewee,
        &1u64,
        &6u32, // Invalid: max is 5
        &String::from_str(&env, "Too high"),
        &1_i128,
    );
}

#[test]
#[should_panic]
fn test_self_review() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    client.submit_review(
        &user,
        &user, // Self review
        &1u64,
        &5u32,
        &String::from_str(&env, "I'm great"),
        &1_i128,
    );
}
