@setup
Feature: Testing API running state

  Scenario: API running
    Given The API running check endpoint is called
    Then We see "joao" as the environment name
