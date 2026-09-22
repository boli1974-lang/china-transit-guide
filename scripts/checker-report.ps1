param(
    [switch]$Local
)

$LocationFlag = if ($Local) { "--local" } else { "--remote" }

function Run-CheckerQuery {
    param(
        [string]$Title,
        [string]$Sql
    )

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Title
    Write-Host "============================================================"

    # Convert multiline SQL into one line so PowerShell passes it
    # cleanly to Wrangler's --command argument.
    $OneLineSql = ($Sql -replace '\r?\n', ' ') -replace '\s+', ' '
    $OneLineSql = $OneLineSql.Trim()

    if ($Local) {
        & npx wrangler d1 execute CHECKER_DB --local --command $OneLineSql
    }
    else {
        & npx wrangler d1 execute CHECKER_DB --remote --command $OneLineSql
    }
}

Run-CheckerQuery "1. CHECKER OVERVIEW - LAST 30 DAYS" @"
SELECT
    COUNT(*) AS total_checks,
    COUNT(DISTINCT anonymous_session_id) AS unique_sessions,
    ROUND(
        CAST(COUNT(*) AS REAL) /
        NULLIF(COUNT(DISTINCT anonymous_session_id), 0),
        2
    ) AS checks_per_session,
    SUM(CASE WHEN overall_status = 'pass' THEN 1 ELSE 0 END) AS passes,
    SUM(CASE WHEN overall_status = 'fail' THEN 1 ELSE 0 END) AS fails,
    SUM(CASE WHEN overall_status = 'review' THEN 1 ELSE 0 END) AS reviews
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days');
"@

Run-CheckerQuery "2. TOP PASSPORT COUNTRIES - LAST 30 DAYS" @"
SELECT
    passport_country,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions,
    ROUND(
        100.0 * COUNT(*) /
        SUM(COUNT(*)) OVER (),
        1
    ) AS pct_of_checks
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY passport_country
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "3. TOP IP COUNTRIES - LAST 30 DAYS" @"
SELECT
    COALESCE(ip_country, 'Unknown') AS ip_country,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY ip_country
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "4. COUNTRIES / REGIONS BEFORE CHINA - LAST 30 DAYS" @"
SELECT
    previous_country_or_region,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY previous_country_or_region
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "5. COUNTRIES / REGIONS AFTER CHINA - LAST 30 DAYS" @"
SELECT
    next_country_or_region,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY next_country_or_region
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "6. MOST COMMON TRANSIT ROUTES - LAST 30 DAYS" @"
SELECT
    previous_country_or_region AS before_china,
    next_country_or_region AS after_china,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY
    previous_country_or_region,
    next_country_or_region
ORDER BY checks DESC
LIMIT 25;
"@

Run-CheckerQuery "7. TOP CHINA ENTRY PORTS - LAST 30 DAYS" @"
SELECT
    entry_port,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY entry_port
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "8. TOP CHINA EXIT PORTS - LAST 30 DAYS" @"
SELECT
    exit_port,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY exit_port
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "9. FAIL / REVIEW REASONS - LAST 30 DAYS" @"
SELECT
    r.rule_id,
    r.rule_status,
    COUNT(*) AS occurrences,
    COUNT(DISTINCT r.checker_search_id) AS affected_checks
FROM checker_rule_results r
JOIN checker_searches s
    ON s.id = r.checker_search_id
WHERE
    s.created_at >= datetime('now', '-30 days')
    AND r.rule_status IN ('fail', 'review')
GROUP BY
    r.rule_id,
    r.rule_status
ORDER BY occurrences DESC;
"@

Run-CheckerQuery "10. REPEAT CHECKER USE - LAST 30 DAYS" @"
SELECT
    CASE
        WHEN max_sequence = 1 THEN '1 check'
        WHEN max_sequence = 2 THEN '2 checks'
        WHEN max_sequence = 3 THEN '3 checks'
        ELSE '4+ checks'
    END AS checks_in_session,
    COUNT(*) AS sessions
FROM (
    SELECT
        anonymous_session_id,
        MAX(search_sequence) AS max_sequence
    FROM checker_searches
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY anonymous_session_id
)
GROUP BY checks_in_session
ORDER BY
    CASE checks_in_session
        WHEN '1 check' THEN 1
        WHEN '2 checks' THEN 2
        WHEN '3 checks' THEN 3
        ELSE 4
    END;
"@

Run-CheckerQuery "11. FAIL -> PASS CHANGES - LAST 30 DAYS" @"
SELECT
    failed.anonymous_session_id,
    failed.search_sequence AS failed_attempt,
    passed.search_sequence AS passed_attempt,

    failed.previous_country_or_region AS failed_before_china,
    failed.next_country_or_region AS failed_after_china,

    passed.previous_country_or_region AS passed_before_china,
    passed.next_country_or_region AS passed_after_china,

    failed.entry_port AS failed_entry_port,
    passed.entry_port AS passed_entry_port

FROM checker_searches failed

JOIN checker_searches passed
    ON passed.anonymous_session_id = failed.anonymous_session_id
    AND passed.search_sequence = failed.search_sequence + 1

WHERE
    failed.created_at >= datetime('now', '-30 days')
    AND failed.overall_status = 'fail'
    AND passed.overall_status = 'pass'

ORDER BY passed.created_at DESC
LIMIT 50;
"@

Run-CheckerQuery "12. LANDING PAGES - LAST 30 DAYS" @"
SELECT
    COALESCE(entry_page, 'Unknown') AS entry_page,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY entry_page
ORDER BY checks DESC;
"@

Run-CheckerQuery "13. UTM SOURCES - LAST 30 DAYS" @"
SELECT
    COALESCE(utm_source, 'No UTM') AS utm_source,
    COALESCE(utm_medium, '') AS utm_medium,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY utm_source, utm_medium
ORDER BY checks DESC
LIMIT 20;
"@

Run-CheckerQuery "14. DEVICE TYPE - LAST 30 DAYS" @"
SELECT
    COALESCE(device_type, 'Unknown') AS device_type,
    COUNT(*) AS checks,
    COUNT(DISTINCT anonymous_session_id) AS sessions
FROM checker_searches
WHERE created_at >= datetime('now', '-30 days')
GROUP BY device_type
ORDER BY checks DESC;
"@
