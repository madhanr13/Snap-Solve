class TestData:
    """Mock test data structures for SnapSolve testing framework"""
    VALID_USERS = [
        {"username": "admin@snapsolve.com", "password": "AdminPassword123!", "role": "Administrator"},
        {"username": "technician@snapsolve.com", "password": "TechPassword123!", "role": "Technician"},
        {"username": "user@snapsolve.com", "password": "UserPassword123!", "role": "StandardUser"}
    ]
    
    INVALID_USERS = [
        {"username": "wrong@snapsolve.com", "password": "BadPassword", "expected_err": "Invalid username or password"},
        {"username": "locked@snapsolve.com", "password": "Password123!", "expected_err": "Account locked"}
    ]

    SAMPLE_REPAIR_PROBLEMS = [
        "Broken kitchen sink pipe leaking water",
        "Wobbly chair leg crack near the joint",
        "Stripped screw holding cabinet door hinge"
    ]
