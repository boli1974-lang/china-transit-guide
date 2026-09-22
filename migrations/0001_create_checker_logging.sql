CREATE TABLE checker_searches (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    anonymous_session_id TEXT NOT NULL,
    search_sequence INTEGER NOT NULL,

    passport_country TEXT NOT NULL,
    passport_validity_days_at_arrival INTEGER,
    passport_validity_bucket TEXT,

    previous_country_or_region TEXT NOT NULL,
    previous_country_or_region_is_unlisted INTEGER NOT NULL DEFAULT 0,

    next_country_or_region TEXT NOT NULL,
    next_country_or_region_is_unlisted INTEGER NOT NULL DEFAULT 0,

    entry_port TEXT NOT NULL,
    exit_port TEXT NOT NULL,

    arrival_date TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    stay_days INTEGER,

    stays_within_permitted_areas TEXT NOT NULL,
    can_enter_onward_destination TEXT NOT NULL,
    special_review_circumstances TEXT NOT NULL,

    overall_status TEXT NOT NULL,

    checker_version TEXT NOT NULL,
    rules_version TEXT NOT NULL,

    entry_page TEXT,
    referrer TEXT,

    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    visitor_country TEXT,
    device_type TEXT,

    CHECK (overall_status IN ('pass', 'fail', 'review')),
    CHECK (stays_within_permitted_areas IN ('yes', 'no', 'unsure')),
    CHECK (can_enter_onward_destination IN ('yes', 'no', 'unsure')),
    CHECK (special_review_circumstances IN ('yes', 'no', 'unsure'))
);

CREATE TABLE checker_rule_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checker_search_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    rule_status TEXT NOT NULL,

    FOREIGN KEY (checker_search_id)
        REFERENCES checker_searches(id)
        ON DELETE CASCADE,

    UNIQUE (checker_search_id, rule_id),

    CHECK (rule_status IN ('pass', 'fail', 'review'))
);

CREATE INDEX idx_checker_searches_created_at
    ON checker_searches(created_at);

CREATE INDEX idx_checker_searches_passport_country
    ON checker_searches(passport_country);

CREATE INDEX idx_checker_searches_entry_port
    ON checker_searches(entry_port);

CREATE INDEX idx_checker_searches_route
    ON checker_searches(
        previous_country_or_region,
        next_country_or_region
    );

CREATE INDEX idx_checker_searches_status
    ON checker_searches(overall_status);

CREATE INDEX idx_checker_rule_results_rule
    ON checker_rule_results(rule_id, rule_status);
